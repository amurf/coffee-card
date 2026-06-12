import { json, type LoaderFunctionArgs } from "@remix-run/node"
import { getCardById, verifyQrToken } from "@coffee-card/backend"
import { toLoyaltyCardDto } from "@coffee-card/shared"
import {
  verifySessionToken,
  getStoreNameFromPayload,
} from "../utils/auth.server"

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const token = params.cardId
  if (!token) {
    return json({ error: "Missing card token" }, { status: 400 })
  }

  try {
    // 1. Verify the session token from Shopify POS (cashier authenticated)
    const sessionPayload = await verifySessionToken(request)
    const authenticatedStore = getStoreNameFromPayload(sessionPayload)

    const qrSecret = process.env.QR_SECRET
    if (!qrSecret) {
      throw new Error("QR_SECRET environment variable is not configured")
    }

    const decodedCardId = token

    // 4. Fetch the card details using the decrypted card ID
    const card = await getCardById(decodedCardId)
    if (!card) {
      return json({ error: "Card not found" }, { status: 404 })
    }

    // 5. Enforce tenant isolation
    if (card.storeName !== authenticatedStore) {
      console.warn(
        `Unauthorized access attempt: Store ${authenticatedStore} tried to access card of Store ${card.storeName}`,
      )
      return json({ error: "Unauthorized" }, { status: 403 })
    }

    return json(toLoyaltyCardDto(card))
  } catch (err: any) {
    console.error("Error in api.cards.$cardId loader:", err)
    return json({ error: err.message || "Unauthorized" }, { status: 401 })
  }
}
