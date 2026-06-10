import dotenv from "dotenv"
import ky from "ky"

dotenv.config({ path: "./integrations/shopify/.env" })

const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL || "http://localhost:3000"

async function emit() {
  const payload = {
    id: 123456789,
    note_attributes: [
      {
        name: "_custom_redemption_token",
        value: process.argv[2] ?? "test-token",
      },
    ],
  }

  // Create HMAC (simplified for mock, in reality it's base64 hmac-sha256)
  const hmac = "mock-hmac"

  console.log("Emitting orders/paid webhook to", SHOPIFY_APP_URL)

  try {
    await ky.post(`${SHOPIFY_APP_URL}/webhooks/orders/paid`, {
      json: payload,
      headers: {
        "X-Shopify-Topic": "orders/paid",
        "X-Shopify-Hmac-Sha256": hmac,
        "X-Shopify-Shop-Domain": "test-coffee-store.myshopify.com",
      },
    })
    console.log("Webhook pushed successfully!")
  } catch (err: any) {
    if (err.response) {
      console.error(
        "Failed to push webhook:",
        err.response.status,
        await err.response.text(),
      )
    } else {
      console.error("Failed to push webhook:", err.message)
    }
  }
}

emit()
