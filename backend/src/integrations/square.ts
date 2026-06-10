import { StoreProfileModel } from "@coffee-card/shared"
import crypto from "crypto"

/**
 * Verifies the signature of an incoming Square webhook request.
 */
export function verifySquareSignature(
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

/**
 * Retrieves the customer's reference_id (which is our card UUID) from their Square Customer profile.
 */
export async function getSquareCustomerReferenceId(
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

/**
 * Retrieves the full transaction order details from Square.
 */
export async function getSquareOrder(
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

/**
 * Registers an anonymous customer profile in the merchant's Square Customer Directory,
 * storing our Card UUID in the reference_id field.
 */
export async function syncCardToSquare(
  store: StoreProfileModel,
  cardId: string,
): Promise<void> {
  // TODO: In production, instead of using a manually configured Personal Access Token (PAT),
  // this token should be obtained securely via OAuth 2.0 and auto-rotated using refresh tokens.
  const token = store.posConfig?.squareAccessToken
  if (!token) {
    console.warn(
      `No Square access token configured for store: ${store.storeName}`,
    )
    return
  }

  // Square sandbox tokens start with EAAAEP or sandbox-
  const isSandbox = token.startsWith("EAAAEP") || token.startsWith("sandbox-")
  const baseUrl = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com"

  console.log(
    `Syncing card ${cardId} to Square (${isSandbox ? "Sandbox" : "Production"})...`,
  )

  const response = await fetch(`${baseUrl}/v2/customers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-05-15",
    },
    body: JSON.stringify({
      given_name: "Loyalty Card",
      reference_id: cardId,
      note: "Linked Coffee Card loyalty card",
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Square API error: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as any
  console.log(
    `Successfully synced card ${cardId} to Square Customer Directory (ID: ${data.customer?.id})`,
  )
}
