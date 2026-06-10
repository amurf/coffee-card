import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import crypto from "crypto"
import {
  getStoreBySquareLocation,
  getStoreByName,
  redeem,
} from "../../../../dynamo"

const SQUARE_WEBHOOK_SIGNATURE_KEY =
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || ""

function verifySquareSignature(
  signature: string,
  notificationUrl: string,
  rawBody: string,
  signatureKey: string,
): boolean {
  const combined = notificationUrl + rawBody
  const hmac = crypto.createHmac("sha256", signatureKey)
  hmac.update(combined)
  const calculatedSignature = hmac.digest("base64")

  const calcBuf = Buffer.from(calculatedSignature)
  const sigBuf = Buffer.from(signature)

  if (calcBuf.length !== sigBuf.length) {
    return false
  }

  return crypto.timingSafeEqual(calcBuf, sigBuf)
}

async function getSquareCustomerReferenceId(
  customerId: string,
  token: string,
): Promise<string | null> {
  const isSandbox = token.startsWith("EAAAEP") || token.startsWith("sandbox-")
  const baseUrl = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com"

  try {
    const response = await fetch(`${baseUrl}/v2/customers/${customerId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Square-Version": "2024-05-15",
      },
    })

    if (!response.ok) {
      console.error(
        `Failed to fetch Square customer ${customerId}:`,
        await response.text(),
      )
      return null
    }

    const data = (await response.json()) as any
    return data.customer?.reference_id || null
  } catch (err) {
    console.error(`Error fetching customer ${customerId} from Square:`, err)
    return null
  }
}

async function getSquareOrder(
  orderId: string,
  token: string,
): Promise<any | null> {
  const isSandbox = token.startsWith("EAAAEP") || token.startsWith("sandbox-")
  const baseUrl = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com"

  try {
    const response = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Square-Version": "2024-05-15",
      },
    })

    if (!response.ok) {
      console.error(
        `Failed to fetch Square order ${orderId}:`,
        await response.text(),
      )
      return null
    }

    const data = (await response.json()) as any
    return data.order || null
  } catch (err) {
    console.error(`Error fetching order ${orderId} from Square:`, err)
    return null
  }
}

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const headers = event.headers
  const rawBody = event.body || ""

  console.log("Received Square webhook event")

  // 1. Verify Signature if configured
  if (SQUARE_WEBHOOK_SIGNATURE_KEY) {
    const signature = headers["x-square-hmacsha256-signature"] || ""
    if (!signature) {
      console.error("Missing x-square-hmacsha256-signature header")
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized: Missing signature" }),
      }
    }

    const host = headers.host || event.requestContext.domainName
    const protocol =
      headers["x-forwarded-proto"] || headers["X-Forwarded-Proto"] || "https"

    let queryString = ""
    if (event.queryStringParameters) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(event.queryStringParameters)) {
        if (value !== undefined) {
          params.append(key, value)
        }
      }
      const str = params.toString()
      if (str) {
        queryString = `?${str}`
      }
    }

    const notificationUrl = `${protocol}://${host}${event.path}${queryString}`

    const isVerified = verifySquareSignature(
      signature,
      notificationUrl,
      rawBody,
      SQUARE_WEBHOOK_SIGNATURE_KEY,
    )

    if (!isVerified) {
      console.error("Square webhook signature verification failed")
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized: Invalid signature" }),
      }
    }
  }

  // 2. Parse payload
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    }
  }

  const eventType = payload.type
  if (eventType !== "order.updated") {
    console.log(`Skipping unhandled event type: ${eventType}`)
    return { statusCode: 200, body: JSON.stringify({ status: "ignored" }) }
  }

  const orderData = payload.data?.object?.order
  if (!orderData) {
    console.warn("Missing order object in webhook payload")
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing order details" }),
    }
  }

  const state = orderData.state
  if (state !== "COMPLETED") {
    console.log(
      `Order ${orderData.id} state is not COMPLETED (current: ${state}). Skipping...`,
    )
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "skipped", reason: "not_completed" }),
    }
  }

  const locationId = orderData.location_id
  const customerId = orderData.customer_id

  if (!customerId) {
    console.log(`Order ${orderData.id} has no customer linked. Skipping...`)
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "skipped", reason: "no_customer" }),
    }
  }

  try {
    // 3. Look up the store mapped to the Square Location ID
    const mapping = await getStoreBySquareLocation(locationId)
    if (!mapping) {
      console.warn(
        `No store mapping found for Square Location ID: ${locationId}`,
      )
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
      console.warn(
        `Store profile or reward rules not found for store: ${mapping.storeName}`,
      )
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "skipped", reason: "store_not_found" }),
      }
    }

    // 4. Retrieve customer profile from Square to get the Card ID (reference_id)
    const cardId = await getSquareCustomerReferenceId(
      customerId,
      mapping.accessToken,
    )
    if (!cardId) {
      console.warn(
        `No card ID (reference_id) found on Square customer: ${customerId}`,
      )
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "skipped", reason: "no_card_id" }),
      }
    }

    // 5. Fetch full order detail to calculate stamps
    const fullOrder = await getSquareOrder(orderData.id, mapping.accessToken)
    if (!fullOrder) {
      console.error(
        `Failed to retrieve full order details for order: ${orderData.id}`,
      )
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch full order" }),
      }
    }

    const lineItems = fullOrder.line_items || []
    const skuPrefix = store.rewardRules.eligibility?.skuPrefix

    let eligibleItems = lineItems
    if (skuPrefix) {
      eligibleItems = lineItems.filter(
        (item: any) =>
          (item.catalog_object_id &&
            item.catalog_object_id.startsWith(skuPrefix)) ||
          (item.name &&
            item.name.toLowerCase().includes(skuPrefix.toLowerCase())),
      )
    }

    let stampsToAward = 0
    const earningRule = store.rewardRules.earningRule

    if (earningRule.type === "ITEM_PURCHASE") {
      stampsToAward = eligibleItems.reduce(
        (acc: number, item: any) => acc + parseInt(item.quantity || "0", 10),
        0,
      )
      console.log(
        `Square purchase ITEM_PURCHASE. Awarding ${stampsToAward} stamps.`,
      )
    } else if (earningRule.type === "SPEND_AMOUNT") {
      const eligibleSpend = eligibleItems.reduce((acc: number, item: any) => {
        const priceCents = item.total_money?.amount || 0
        return acc + priceCents / 100
      }, 0)
      const amountPerStamp = earningRule.amountPerStamp || 10
      stampsToAward = Math.floor(eligibleSpend / amountPerStamp)
      console.log(
        `Square purchase SPEND_AMOUNT. Spend: $${eligibleSpend}, rate: $${amountPerStamp}. Awarding ${stampsToAward} stamps.`,
      )
    }

    // 6. Award stamps in the database
    if (stampsToAward > 0) {
      const updatedCard = await redeem(cardId, stampsToAward)
      if (updatedCard) {
        console.log(
          `Awarded ${stampsToAward} stamps to card ${cardId}. New stamp balance: ${updatedCard.stampCount}`,
        )
      } else {
        console.error(
          `Failed to award stamps: Card ${cardId} not found in database`,
        )
      }
    } else {
      console.log("No stamps to award for this transaction")
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "success", stampsAwarded: stampsToAward }),
    }
  } catch (err: any) {
    console.error("Error processing Square webhook:", err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Internal Server Error" }),
    }
  }
}
