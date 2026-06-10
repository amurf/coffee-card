import { StoreProfileModel } from "@coffee-card/shared"

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
