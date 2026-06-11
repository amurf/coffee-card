import dotenv from "dotenv"
import ky from "ky"
import crypto from "crypto"

dotenv.config({ path: "./integrations/shopify/.env" })

const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL || "http://localhost:3000"
const SHOPIFY_API_SECRET =
  process.env.SHOPIFY_API_SECRET || "coffee-card-default-secret"

async function emit() {
  const cardId = process.argv[2] ?? "test-card-uuid"
  const stamps = parseInt(process.argv[3] ?? "1", 10)

  const payload = {
    id: Date.now(),
    note_attributes: [
      {
        name: "_custom_card_id",
        value: cardId,
      },
    ],
    line_items: [
      {
        quantity: stamps,
        price: "10.00",
        sku: "COFFEE-MOCK",
        title: "Mock Coffee",
      },
    ],
  }

  const rawBody = JSON.stringify(payload)

  // Calculate real Shopify HMAC signature using client secret
  const hmac = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(rawBody, "utf8")
    .digest("base64")

  console.log(
    `Emitting orders/paid webhook to ${SHOPIFY_APP_URL}/webhooks/orders/paid`,
  )
  console.log(`Linking Card ID: ${cardId}, Stamps to award: ${stamps}`)

  try {
    const response = await ky.post(`${SHOPIFY_APP_URL}/webhooks/orders/paid`, {
      body: rawBody,
      headers: {
        "X-Shopify-Topic": "orders/paid",
        "X-Shopify-Hmac-Sha256": hmac,
        "X-Shopify-Shop-Domain": "test-coffee-store.myshopify.com",
        "Content-Type": "application/json",
      },
    })
    console.log("Webhook pushed successfully! Status:", response.status)
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
