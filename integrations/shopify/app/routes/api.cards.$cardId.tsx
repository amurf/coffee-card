import { json, type LoaderFunctionArgs } from "@remix-run/node"
import { getCardById } from "@coffee-card/backend"
import { toLoyaltyCardDto } from "@coffee-card/shared"
import {
  verifySessionToken,
  getStoreNameFromPayload,
} from "../utils/auth.server"
import * as jose from "jose"

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const token = params.cardId
  if (!token) {
    return json({ error: "Missing card token" }, { status: 400 })
  }

  try {
    // 1. Verify the session token from Shopify POS (cashier authenticated)
    const sessionPayload = await verifySessionToken(request)
    const authenticatedStore = getStoreNameFromPayload(sessionPayload)

    // 2. Enforce dynamic token lookup: check if it's a valid JWT
    if (token.split(".").length !== 3) {
      return json(
        { error: "Invalid scan code format. Please scan a live QR code." },
        { status: 400 },
      )
    }

    const qrSecret = process.env.QR_SECRET
    if (!qrSecret) {
      throw new Error("QR_SECRET environment variable is not configured")
    }
    const secret = new TextEncoder().encode(qrSecret)

    let decodedCardId: string
    try {
      const { payload: qrPayload } = await jose.jwtVerify(token, secret)
      decodedCardId = qrPayload.cardId as string
    } catch (e) {
      return json(
        { error: "Scan code expired or invalid. Please scan a live QR code." },
        { status: 400 },
      )
    }

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
