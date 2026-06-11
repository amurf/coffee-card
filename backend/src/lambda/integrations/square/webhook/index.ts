import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import {
  getStoreBySquareLocation,
  getStoreByName,
  redeem,
  awardStampsForOrder,
} from "../../../../dynamo"
import { calculateStamps, NormalizedLineItem } from "../../../../core/loyalty"
import {
  verifySquareSignature,
  getSquareCustomerReferenceId,
  getSquareOrder,
  getSquareAccessToken,
} from "../../../../integrations/square"

const SQUARE_WEBHOOK_SIGNATURE_KEY =
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || ""

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const headers = event.headers
  const rawBody = event.body || ""

  // 1. Verify Webhook Signature if configured
  if (SQUARE_WEBHOOK_SIGNATURE_KEY) {
    const signature = headers["x-square-hmacsha256-signature"] || ""
    if (!signature) {
      console.error("Missing x-square-hmacsha256-signature header")
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      }
    }

    const host = headers.host || event.requestContext.domainName
    const protocol =
      headers["x-forwarded-proto"] || headers["X-Forwarded-Proto"] || "https"

    let queryString = ""
    if (event.queryStringParameters) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(event.queryStringParameters)) {
        if (value !== undefined) params.append(key, value)
      }
      const str = params.toString()
      if (str) queryString = `?${str}`
    }

    const notificationUrl = `${protocol}://${host}${event.path}${queryString}`
    if (
      !verifySquareSignature(
        signature,
        notificationUrl,
        rawBody,
        SQUARE_WEBHOOK_SIGNATURE_KEY,
      )
    ) {
      console.error("Square webhook signature verification failed")
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      }
    }
  }

  // 2. Parse Event Payload
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    }
  }

  if (payload.type !== "order.updated") {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "ignored" }),
    }
  }

  const orderData = payload.data?.object?.order
  if (!orderData || orderData.state !== "COMPLETED") {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "ignored" }),
    }
  }

  const customerId = orderData.customer_id
  if (!customerId) {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "skipped", reason: "no_customer" }),
    }
  }

  try {
    // 3. Resolve Store mapping
    const mapping = await getStoreBySquareLocation(orderData.location_id)
    if (!mapping) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "skipped",
          reason: "unmapped_location",
        }),
      }
    }

    const store = await getStoreByName(mapping.storeName)
    if (!store || !store.rewardRules) {
      console.warn(`Store profile or rules not found for: ${mapping.storeName}`)
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "skipped", reason: "store_not_found" }),
      }
    }

    // Retrieve active access token (with rotation check)
    const accessToken =
      (await getSquareAccessToken(store.storeName)) || mapping.accessToken

    // 4. Retrieve linked Card ID UUID from Square customer profile
    const cardId = await getSquareCustomerReferenceId(customerId, accessToken)
    if (!cardId) {
      console.warn(`No card ID (reference_id) found on customer: ${customerId}`)
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "skipped", reason: "no_card_id" }),
      }
    }

    // 5. Fetch full Order details from Square API
    const fullOrder = await getSquareOrder(orderData.id, accessToken)
    if (!fullOrder) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch full order details" }),
      }
    }

    // 6. Normalize line items and calculate stamp count
    const squareLineItems = fullOrder.line_items || []
    const normalizedItems: NormalizedLineItem[] = squareLineItems.map(
      (item: any) => ({
        sku: item.catalog_object_id,
        name: item.name,
        quantity: parseInt(item.quantity || "0", 10),
        priceCents: item.total_money?.amount || 0,
      }),
    )

    const stampsToAward = calculateStamps(store, normalizedItems)

    // 7. Award stamps
    if (stampsToAward > 0) {
      const result = await awardStampsForOrder(
        store.storeName,
        cardId,
        orderData.id, // Square order ID
        stampsToAward,
      )

      if (result.success && result.updatedCard) {
        console.log(
          `Awarded ${stampsToAward} stamps to card ${cardId}. Balance: ${result.updatedCard.stampCount}`,
        )
      } else if (result.alreadyProcessed) {
        console.log(
          `Duplicate webhook skipped: Order ${orderData.id} has already been processed.`,
        )
      } else {
        console.error(`Failed to award stamps: Card ${cardId} not found.`)
      }
    } else {
      console.log("No stamps to award for this transaction")
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "success", stampsAwarded: stampsToAward }),
    }
  } catch (err: any) {
    console.error("Square Webhook handler error:", err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    }
  }
}
