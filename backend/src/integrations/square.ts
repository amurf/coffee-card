import { StoreProfileModel } from "@coffee-card/shared"
import crypto from "crypto"
import { getStoreByName, updateStoreProfile } from "../dynamo"

/**
 * Retrieves a valid, active Square Access Token for a store, performing OAuth token rotation
 * if the current token has expired or is nearing expiration.
 */
export async function getSquareAccessToken(
  storeName: string,
): Promise<string | null> {
  const store = await getStoreByName(storeName)
  if (!store || !store.posConfig) {
    return null
  }

  const { squareAccessToken, squareRefreshToken, squareTokenExpiresAt } =
    store.posConfig
  if (!squareAccessToken) {
    return null
  }

  // If there's no refresh token or expiration date (legacy personal access token), use it directly
  if (!squareRefreshToken || !squareTokenExpiresAt) {
    return squareAccessToken
  }

  // Check if token expires within 7 days (or has already expired)
  const expiresTime = new Date(squareTokenExpiresAt).getTime()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const isNearingExpiry = Date.now() + sevenDaysMs > expiresTime

  if (!isNearingExpiry) {
    return squareAccessToken
  }

  // Rotate token using refresh token
  console.log(
    `Square token for store ${storeName} is nearing expiration. Rotating...`,
  )

  const clientId = process.env.SQUARE_CLIENT_ID || ""
  const clientSecret = process.env.SQUARE_CLIENT_SECRET || ""
  const isSandbox = clientId.startsWith("sandbox-")
  const baseUrl = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com"

  try {
    const response = await fetch(`${baseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2024-05-15",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: squareRefreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `Failed to rotate Square token for store ${storeName}:`,
        response.status,
        errorText,
      )
      return squareAccessToken // Return the current one as fallback
    }

    const data = (await response.json()) as any

    // Update store profile in DB with new tokens
    store.posConfig = {
      ...store.posConfig,
      squareAccessToken: data.access_token,
      squareRefreshToken: data.refresh_token,
      squareTokenExpiresAt: data.expires_at,
    }

    await updateStoreProfile(store)
    console.log(`Successfully rotated Square token for store ${storeName}`)

    return data.access_token
  } catch (err) {
    console.error(`Error rotating Square token for store ${storeName}:`, err)
    return squareAccessToken // Return current one as fallback
  }
}

// Keep other functions unchanged...


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
  const token = await getSquareAccessToken(store.storeName)
  if (!token) {
    console.warn(
      `No active Square access token configured/retrieved for store: ${store.storeName}`,
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
