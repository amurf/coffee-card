import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getStoreByName, updateStoreProfile } from "../../../../dynamo"
import { lambdaResponseToAPIGatewayProxyResult } from "../../../helpers"

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const query = event.queryStringParameters || {}
  const code = query.code
  const state = query.state // can be shopify:shop or standalone:store
  const error = query.error

  if (error) {
    console.error("Square OAuth error callback:", error, query.error_description)
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: `<h1>Square Connection Failed</h1><p>Error: ${error}</p><p>${query.error_description || ""}</p>`,
    }
  }

  if (!code || !state) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: "<h1>Square Connection Failed</h1><p>Missing code or state parameter.</p>",
    }
  }

  const isShopify = state.startsWith("shopify:")
  const shop = isShopify ? state.replace("shopify:", "") : state.replace("standalone:", "")

  try {
    const store = await getStoreByName(shop)
    if (!store) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "text/html" },
        body: `<h1>Square Connection Failed</h1><p>Store profile not found for shop: ${shop}</p>`,
      }
    }

    // Determine sandbox vs production url
    const clientId = process.env.SQUARE_CLIENT_ID || ""
    const clientSecret = process.env.SQUARE_CLIENT_SECRET || ""
    const isSandbox = clientId.startsWith("sandbox-")
    const baseUrl = isSandbox
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com"

    const host = event.headers.host || event.requestContext.domainName || "localhost:3000"
    const protocol =
      event.headers["x-forwarded-proto"] ||
      event.headers["X-Forwarded-Proto"] ||
      "https"
    const defaultRedirectUri = `${protocol}://${host}${event.path}`
    const redirectUri = process.env.SQUARE_REDIRECT_URI || defaultRedirectUri

    console.log(`Exchanging code for Square OAuth tokens (${isSandbox ? "Sandbox" : "Production"})...`)

    const response = await fetch(`${baseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2024-05-15",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Failed to exchange token with Square:", response.status, errorText)
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/html" },
        body: `<h1>Square Connection Failed</h1><p>Failed to exchange code: ${response.status}</p><pre>${errorText}</pre>`,
      }
    }

    const data = (await response.json()) as any

    // Save tokens inside store profile
    store.posType = "SQUARE"
    store.posConfig = {
      ...store.posConfig,
      squareAccessToken: data.access_token,
      squareRefreshToken: data.refresh_token,
      squareTokenExpiresAt: data.expires_at,
      squareMerchantId: data.merchant_id,
    }

    await updateStoreProfile(store)

    console.log(`Successfully connected Square account for store ${shop}. Redirecting...`)

    let redirectUrl: string
    if (isShopify) {
      const appHandle = "coffee-card-dev" // fallback default app name
      redirectUrl = `https://admin.shopify.com/store/${shop}/apps/${appHandle}/app/integrations?success=true`
    } else {
      const standaloneUrl = process.env.STANDALONE_FRONTEND_URL || "http://localhost:5173"
      redirectUrl = `${standaloneUrl}/merchant/scan?success=true`
    }

    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl,
        "Cache-Control": "no-cache",
      },
      body: "",
    }
  } catch (err: any) {
    console.error("Square callback handler error:", err)
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html" },
      body: `<h1>Square Connection Failed</h1><p>Internal error occurred: ${err.message}</p>`,
    }
  }
}
