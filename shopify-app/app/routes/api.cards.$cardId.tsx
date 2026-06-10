import { json, type LoaderFunctionArgs } from "@remix-run/node"
import { getCardById } from "@coffee-card/backend"
import { toLoyaltyCardDto } from "@coffee-card/shared"
import {
  verifySessionToken,
  getStoreNameFromPayload,
} from "../utils/auth.server"

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const cardId = params.cardId
  if (!cardId) {
    return json({ error: "Missing card ID" }, { status: 400 })
  }

  try {
    // 1. Verify the session token from Shopify POS
    const payload = await verifySessionToken(request)
    const authenticatedStore = getStoreNameFromPayload(payload)

    // 2. Fetch the card details
    const card = await getCardById(cardId)
    if (!card) {
      return json({ error: "Card not found" }, { status: 404 })
    }

    // 3. Enforce tenant isolation (only allow matching store to view its cards)
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
