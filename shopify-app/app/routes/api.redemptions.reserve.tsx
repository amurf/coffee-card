import { json, type ActionFunctionArgs } from "@remix-run/node"
import { getCardById, createPendingRedemption } from "@coffee-card/backend"
import {
  verifySessionToken,
  getStoreNameFromPayload,
} from "../utils/auth.server"

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    // 1. Verify the session token from Shopify POS
    const payload = await verifySessionToken(request)
    const authenticatedStore = getStoreNameFromPayload(payload)

    // 2. Parse request body
    const body = await request.json()
    const { cardId, milestoneId } = body

    if (!cardId || !milestoneId) {
      return json({ error: "Missing cardId or milestoneId" }, { status: 400 })
    }

    // 3. Fetch card and verify store ownership
    const card = await getCardById(cardId)
    if (!card) {
      return json({ error: "Card not found" }, { status: 404 })
    }

    if (card.storeName !== authenticatedStore) {
      console.warn(
        `Unauthorized reserve attempt: Store ${authenticatedStore} tried to redeem card of Store ${card.storeName}`,
      )
      return json({ error: "Unauthorized" }, { status: 403 })
    }

    // 4. Create pending redemption
    const pending = await createPendingRedemption(cardId, milestoneId)
    if (!pending) {
      return json(
        {
          error:
            "Insufficient stamps, milestone already redeemed, or card not found",
        },
        { status: 400 },
      )
    }

    return json({
      redemptionToken: pending.token,
      expiresAt: pending.expiresAt,
    })
  } catch (err: any) {
    console.error("Error in api.redemptions.reserve action:", err)
    return json({ error: err.message || "Unauthorized" }, { status: 401 })
  }
}
