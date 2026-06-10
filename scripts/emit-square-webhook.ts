import dotenv from "dotenv"
import ky from "ky"
import crypto from "crypto"

// Load env files
dotenv.config({ path: "./backend/.env" })
dotenv.config({ path: "./web-frontend/.env" })

const API_URL = process.env.VITE_API_URL || "http://localhost:3000"
const SQUARE_WEBHOOK_SIGNATURE_KEY =
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "test-signature-key"
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || ""
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || "L-MOCK-LOCATION"

async function setupRealSquareResources(cardId: string, amountDollars: number) {
  if (!SQUARE_ACCESS_TOKEN) {
    console.log("No SQUARE_ACCESS_TOKEN found. Running in MOCK payload mode.")
    return {
      customerId: "SQUARE_CUSTOMER_MOCK_123",
      orderId: "SQUARE_ORDER_MOCK_999",
    }
  }

  const isSandbox =
    SQUARE_ACCESS_TOKEN.startsWith("EAAAEP") ||
    SQUARE_ACCESS_TOKEN.startsWith("sandbox-")
  const baseUrl = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com"

  console.log(
    `Setting up Square resources on ${isSandbox ? "Sandbox" : "Production"}...`,
  )

  // 1. Create Customer
  const customerRes = (await ky
    .post(`${baseUrl}/v2/customers`, {
      headers: {
        Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-05-15",
      },
      json: {
        given_name: "Coffee Card Test Customer",
        reference_id: cardId,
        note: "Created by integration test harness",
      },
    })
    .json()) as any

  const customerId = customerRes.customer.id
  console.log(
    `- Created Square Customer ID: ${customerId} (reference_id: ${cardId})`,
  )

  // 2. Create Order
  const orderRes = (await ky
    .post(`${baseUrl}/v2/orders`, {
      headers: {
        Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-05-15",
      },
      json: {
        order: {
          location_id: SQUARE_LOCATION_ID,
          customer_id: customerId,
          line_items: [
            {
              name: "Latte Special",
              quantity: "1",
              total_money: {
                amount: Math.round(amountDollars * 100),
                currency: "AUD",
              },
            },
          ],
        },
      },
    })
    .json()) as any

  const orderId = orderRes.order.id
  console.log(
    `- Created Square Order ID: ${orderId} (Total: $${amountDollars})`,
  )

  return { customerId, orderId }
}

async function emit() {
  const cardId = process.argv[2] ?? "test-card-uuid"
  const amountDollars = parseFloat(process.argv[3] ?? "15.00")

  const { customerId, orderId } = await setupRealSquareResources(
    cardId,
    amountDollars,
  )

  const payload = {
    merchant_id: "merchant-id-mock-abc",
    type: "order.updated",
    event_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    data: {
      id: orderId,
      object: {
        order: {
          id: orderId,
          location_id: SQUARE_LOCATION_ID,
          customer_id: customerId,
          state: "COMPLETED",
        },
      },
    },
  }

  const rawBody = JSON.stringify(payload)
  const webhookUrl = `${API_URL}/integrations/square/webhook`

  // Calculate Square HMAC-SHA256 signature
  const hmac = crypto
    .createHmac("sha256", SQUARE_WEBHOOK_SIGNATURE_KEY)
    .update(webhookUrl + rawBody)
    .digest("base64")

  console.log(`Emitting Square webhook event to: ${webhookUrl}`)

  try {
    const response = await ky.post(webhookUrl, {
      body: rawBody,
      headers: {
        "x-square-hmacsha256-signature": hmac,
        "Content-Type": "application/json",
      },
    })
    console.log(
      "Webhook emitted successfully! Response:",
      await response.text(),
    )
  } catch (err: any) {
    if (err.response) {
      console.error(
        "Failed to emit webhook:",
        err.response.status,
        await err.response.text(),
      )
    } else {
      console.error("Failed to emit webhook:", err.message)
    }
  }
}

emit()
