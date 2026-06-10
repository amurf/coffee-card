import * as jose from "jose"

export interface ShopifySessionTokenPayload extends jose.JWTPayload {
  iss: string
  dest: string
  sub: string
}

export async function verifySessionToken(
  request: Request,
): Promise<ShopifySessionTokenPayload> {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header")
  }

  const token = authHeader.split(" ")[1]
  const apiSecret = process.env.SHOPIFY_API_SECRET
  const apiKey = process.env.SHOPIFY_API_KEY

  if (!apiSecret || !apiKey) {
    throw new Error(
      "Shopify API configuration environment variables are missing",
    )
  }

  const secret = new TextEncoder().encode(apiSecret)
  const { payload } = await jose.jwtVerify(token, secret, {
    audience: apiKey,
  })

  return payload as ShopifySessionTokenPayload
}

export function getStoreNameFromPayload(
  payload: ShopifySessionTokenPayload,
): string {
  // Extract subdomain: e.g., "https://hadoubrew.myshopify.com" -> "hadoubrew"
  const dest = payload.dest
  return dest.replace("https://", "").split(".")[0]
}
