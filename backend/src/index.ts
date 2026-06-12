import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { getCardById, getStoreByName, createPendingRedemption, commitRedemption, createNewCardForStore, awardStampsForOrder } from "./dynamo"
import { calculateStamps } from "./core/loyalty"
import { toLoyaltyCardDto, toStoreProfileDto } from "@coffee-card/shared"
import { SignJWT } from "jose"
import { verifySquareSignature, getSquareCustomerReferenceId, getSquareOrder, getSquareAccessToken } from "./integrations/square"

export * from "./dynamo"
export * from "./core/loyalty"

const app = new Hono()

// Standard Middlewares
app.use("*", cors())
app.use("*", logger())

// Global Exception Mapping
app.onError((err, c) => {
  console.error("API Error:", err)
  return c.json(
    {
      message: err.message || "Internal server error occurred",
      error: [err.message].filter(Boolean),
    },
    500,
  )
})

// 1. GET /api/cards/:cardId
app.get("/api/cards/:cardId", async (c) => {
  const cardId = c.req.param("cardId")
  const card = await getCardById(cardId)
  if (!card) {
    return c.json({ message: "Card not found" }, 404)
  }
  return c.json(toLoyaltyCardDto(card))
})

// 2. GET /api/cards/:cardId/qr-token
app.get("/api/cards/:cardId/qr-token", async (c) => {
  const cardId = c.req.param("cardId")
  const card = await getCardById(cardId)
  if (!card) {
    return c.json({ message: "Card not found" }, 404)
  }

  const qrSecret = process.env.QR_SECRET || "coffee-card-default-qr-hmac-secret-key-32-chars-long"

  const secret = new TextEncoder().encode(qrSecret)
  const exp = Math.floor(Date.now() / 1000) + 60 // 60s expiration
  const qrToken = await new SignJWT({ cardId: card.cardId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .sign(secret)

  return c.json({ qrToken, expiresAt: exp })
})

// 3. POST /api/redemptions/reserve
app.post("/api/redemptions/reserve", async (c) => {
  const body = await c.req.json()
  const { cardId, milestoneId } = body
  if (!cardId || !milestoneId) {
    return c.json({ message: "cardId and milestoneId are required" }, 400)
  }

  const pending = await createPendingRedemption(cardId, milestoneId)
  if (!pending) {
    return c.json(
      { message: "Insufficient stamps, milestone already redeemed, or card not found" },
      400,
    )
  }
  return c.json({
    redemptionToken: pending.token,
    expiresAt: pending.expiresAt,
  })
})

// 4. POST /api/redemptions/commit
app.post("/api/redemptions/commit", async (c) => {
  const body = await c.req.json()
  const { redemptionToken } = body
  if (!redemptionToken) {
    return c.json({ message: "redemptionToken is required" }, 400)
  }

  const success = await commitRedemption(redemptionToken)
  if (!success) {
    return c.json({ message: "Invalid or expired redemption token" }, 400)
  }
  return c.json({ success: true })
})

// 5. POST /api/stores/:storeId/cards
app.post("/api/stores/:storeId/cards", async (c) => {
  const storeId = c.req.param("storeId") // Parameter represents storeName in design
  const card = await createNewCardForStore(storeId)
  return c.json(toLoyaltyCardDto(card), 201)
})

// 5.5. GET /api/stores
app.get("/api/stores", async (c) => {
  const { getAllStores } = await import("./dynamo")
  const storesList = await getAllStores()
  return c.json(storesList.map(toStoreProfileDto))
})

// 5.6. POST /api/stores
app.post("/api/stores", async (c) => {
  const body = await c.req.json()
  const { storeName } = body
  if (!storeName) {
    return c.json({ message: "storeName is required" }, 400)
  }
  const { getStoreByName, createStore } = await import("./dynamo")
  const existing = await getStoreByName(storeName)
  if (existing) {
    return c.json({ message: `Store name "${storeName}" is already taken` }, 409)
  }

  try {
    const store = await createStore(storeName)
    return c.json(toStoreProfileDto(store), 201)
  } catch (err: any) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      return c.json({ message: `Store name "${storeName}" is already taken` }, 409)
    }
    throw err
  }
})

// 5.7. PUT /api/stores/:storeId
app.put("/api/stores/:storeId", async (c) => {
  const storeId = c.req.param("storeId") // represents storeName
  const body = await c.req.json()
  const { getStoreByName, updateStoreProfile } = await import("./dynamo")
  const store = await getStoreByName(storeId)
  if (!store) {
    return c.json({ message: "Store profile not found" }, 404)
  }

  // Update provided fields
  if (body.location !== undefined) {
    store.location = body.location
    if (body.latitude === undefined && body.longitude === undefined) {
      if (body.location.trim() === "") {
        store.latitude = undefined
        store.longitude = undefined
      } else {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(body.location)}&limit=1`,
            {
              headers: {
                "User-Agent": "CoffeeCardLoyalty/1.0"
              }
            }
          )
          if (response.ok) {
            const results = (await response.json()) as any[]
            if (results && results.length > 0) {
              store.latitude = parseFloat(results[0].lat)
              store.longitude = parseFloat(results[0].lon)
            }
          }
        } catch (err) {
          console.error("Geocoding lookup failed:", err)
        }
      }
    }
  }
  if (body.latitude !== undefined) store.latitude = body.latitude
  if (body.longitude !== undefined) store.longitude = body.longitude
  if (body.themeOptions !== undefined) store.themeOptions = body.themeOptions
  if (body.rewardRules !== undefined) store.rewardRules = body.rewardRules
  if (body.posType !== undefined) store.posType = body.posType
  if (body.posConfig !== undefined) store.posConfig = body.posConfig
  if (body.merchantPasscode !== undefined) store.merchantPasscode = body.merchantPasscode

  const updated = await updateStoreProfile(store)

  // Link to Square single-table if needed
  if (updated.posType === "SQUARE" && updated.posConfig?.squareLocationId && updated.posConfig?.squareAccessToken) {
    const { linkStoreToSquare } = await import("./dynamo")
    await linkStoreToSquare(updated.storeName, updated.posConfig.squareLocationId, updated.posConfig.squareAccessToken)
  }

  return c.json(toStoreProfileDto(updated))
})

// 6. GET /api/stores/:storeId
app.get("/api/stores/:storeId", async (c) => {
  const storeId = c.req.param("storeId") // Represents storeName
  const store = await getStoreByName(storeId)
  if (!store) {
    return c.json({ message: "Store profile not found" }, 404)
  }
  return c.json(toStoreProfileDto(store))
})

// 6.5. GET /api/stores/:storeId/cards
app.get("/api/stores/:storeId/cards", async (c) => {
  const storeId = c.req.param("storeId") // Represents storeName
  const { getStoreCards } = await import("./dynamo")
  const cards = await getStoreCards(storeId)
  return c.json(cards.map(toLoyaltyCardDto))
})



interface OAuthHandler {
  exchangeCode(code: string, redirectUri: string, shopDomain?: string): Promise<{
    posType: "SQUARE" | "LIGHTSPEED" | "SHOPIFY" | "NONE"
    posConfig: Record<string, any>
  }>
}

async function registerShopifyWebhook(
  shopDomain: string,
  accessToken: string,
  apiVersion = "2024-04",
  webhookUrl: string,
) {
  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/${apiVersion}/webhooks.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          webhook: {
            topic: "orders/paid",
            address: webhookUrl,
            format: "json",
          },
        }),
      },
    )
    if (!response.ok) {
      const err = await response.text()
      console.error(
        `Failed to register Shopify webhook: ${response.status} - ${err}`,
      )
    } else {
      console.log(`Successfully registered Shopify webhook for ${shopDomain}`)
    }
  } catch (err) {
    console.error("Error registering Shopify webhook:", err)
  }
}

export function verifyShopifySignature(
  signature: string,
  rawBody: string,
  clientSecret: string,
): boolean {
  const calculated = crypto
    .createHmac("sha256", clientSecret)
    .update(rawBody, "utf8")
    .digest("base64")
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculated),
  )
}

const oauthHandlers: Record<string, OAuthHandler> = {
  square: {
    async exchangeCode(code: string, redirectUri: string) {
      const clientId = process.env.SQUARE_CLIENT_ID || ""
      const clientSecret = process.env.SQUARE_CLIENT_SECRET || ""
      const isSandbox = clientId.startsWith("sandbox-")
      const baseUrl = isSandbox
        ? "https://connect.squareupsandbox.com"
        : "https://connect.squareup.com"

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
        throw new Error(`Failed to exchange token with Square: ${response.status} - ${errorText}`)
      }

      const data = (await response.json()) as any
      return {
        posType: "SQUARE",
        posConfig: {
          squareAccessToken: data.access_token,
          squareRefreshToken: data.refresh_token,
          squareTokenExpiresAt: data.expires_at,
          squareMerchantId: data.merchant_id,
        }
      }
    }
  },
  shopify: {
    async exchangeCode(code: string, redirectUri: string, shopDomain?: string) {
      if (!shopDomain) {
        throw new Error("Missing shop query parameter for Shopify OAuth exchange")
      }
      const clientId = process.env.SHOPIFY_CLIENT_ID || ""
      const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || ""

      const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to exchange token with Shopify: ${response.status} - ${errorText}`)
      }

      const data = (await response.json()) as any
      return {
        posType: "SHOPIFY",
        posConfig: {
          shopifyShop: shopDomain,
          shopifyAccessToken: data.access_token,
        }
      }
    }
  },
  lightspeed: {
    async exchangeCode(code: string, redirectUri: string) {
      // Future Lightspeed Restaurant (O-Series) OAuth exchange logic will go here
      throw new Error("Lightspeed OAuth integration is not yet implemented")
    }
  }
}

app.get("/api/integrations/square/config", (c) => {
  const clientId = process.env.SQUARE_CLIENT_ID || ""
  const isSandbox = clientId.startsWith("sandbox-")
  const oauthBase = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com"
  
  const host = c.req.header("host") || new URL(c.req.url).host
  const protocol = c.req.header("x-forwarded-proto") || "https"
  const redirectUri = process.env.SQUARE_REDIRECT_URI || `${protocol}://${host}/api/integrations/square/callback`

  return c.json({
    clientId,
    redirectUri,
    oauthBase,
  })
})

app.get("/api/integrations/shopify/config", (c) => {
  const clientId = process.env.SHOPIFY_CLIENT_ID || ""
  const host = c.req.header("host") || new URL(c.req.url).host
  const protocol = c.req.header("x-forwarded-proto") || "https"
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI || `${protocol}://${host}/api/integrations/shopify/callback`

  return c.json({
    clientId,
    redirectUri,
  })
})

// 10. GET /api/integrations/:provider/callback
app.get("/api/integrations/:provider/callback", async (c) => {
  const provider = c.req.param("provider").toLowerCase()
  const query = c.req.query()
  const code = query.code
  const state = query.state
  const error = query.error

  if (error) {
    console.error(`${provider} OAuth error callback:`, error, query.error_description)
    return c.html(
      `<h1>${provider.toUpperCase()} Connection Failed</h1><p>Error: ${error}</p><p>${query.error_description || ""}</p>`,
      400,
    )
  }

  if (!code || !state) {
    return c.html(
      `<h1>${provider.toUpperCase()} Connection Failed</h1><p>Missing code or state parameter.</p>`,
      400,
    )
  }

  const handler = oauthHandlers[provider]
  if (!handler) {
    return c.html(
      `<h1>Connection Failed</h1><p>Unsupported provider: ${provider}</p>`,
      400,
    )
  }

  const isShopify = state.startsWith("shopify:")
  const isAdmin = state.startsWith("admin:")
  const shop = isShopify
    ? state.replace("shopify:", "")
    : isAdmin
      ? state.replace("admin:", "")
      : state.replace("standalone:", "")

  try {
    const store = await getStoreByName(shop)
    if (!store) {
      return c.html(
        `<h1>Connection Failed</h1><p>Store profile not found for shop: ${shop}</p>`,
        404,
      )
    }

    const host = c.req.header("host") || new URL(c.req.url).host
    const protocol = c.req.header("x-forwarded-proto") || "https"
    
    let redirectUri = ""
    if (provider === "square") {
      redirectUri = process.env.SQUARE_REDIRECT_URI || `${protocol}://${host}/api/integrations/square/callback`
    } else if (provider === "shopify") {
      redirectUri = process.env.SHOPIFY_REDIRECT_URI || `${protocol}://${host}/api/integrations/shopify/callback`
    } else {
      redirectUri = `${protocol}://${host}/api/integrations/${provider}/callback`
    }

    console.log(`Exchanging code for ${provider} OAuth tokens...`)
    const { posType, posConfig } = await handler.exchangeCode(code, redirectUri, query.shop as string)

    store.posType = posType
    store.posConfig = {
      ...store.posConfig,
      ...posConfig,
    }

    const { updateStoreProfile } = await import("./dynamo")
    await updateStoreProfile(store)

    // Programmatically register Shopify webhook if connected
    if (posType === "SHOPIFY" && posConfig.shopifyShop && posConfig.shopifyAccessToken) {
      const webhookUrl = `${protocol}://${host}/api/integrations/shopify/webhook`
      await registerShopifyWebhook(posConfig.shopifyShop, posConfig.shopifyAccessToken, "2024-04", webhookUrl)
    }

    let redirectUrl: string
    if (isShopify) {
      const appHandle = "coffee-card-dev"
      redirectUrl = `https://admin.shopify.com/store/${shop}/apps/${appHandle}/app/integrations?success=true`
    } else if (isAdmin) {
      const adminUrl =
        process.env.ADMIN_FRONTEND_URL || "http://localhost:5174"
      redirectUrl = `${adminUrl}/?success=true&store=${shop}`
    } else {
      const standaloneUrl =
        process.env.STANDALONE_FRONTEND_URL || "http://localhost:5173"
      redirectUrl = `${standaloneUrl}/merchant/signup?success=true&store=${shop}`
    }

    return c.redirect(redirectUrl, 302)
  } catch (err: any) {
    console.error(`${provider} callback error:`, err)
    return c.html(
      `<h1>${provider.toUpperCase()} Connection Failed</h1><p>Internal error: ${err.message}</p>`,
      500,
    )
  }
})

// 11. POST /api/integrations/square/webhook
app.post("/api/integrations/square/webhook", async (c) => {
  const signature = c.req.header("x-square-hmacsha256-signature") || ""
  const rawBody = await c.req.text()
  const requestUrl = c.req.url

  const SQUARE_WEBHOOK_SIGNATURE_KEY =
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || ""

  if (SQUARE_WEBHOOK_SIGNATURE_KEY) {
    if (!signature) {
      console.error("Missing x-square-hmacsha256-signature header")
      return c.json({ error: "Unauthorized" }, 401)
    }

    if (
      !verifySquareSignature(
        signature,
        requestUrl,
        rawBody,
        SQUARE_WEBHOOK_SIGNATURE_KEY,
      )
    ) {
      console.error("Square webhook signature verification failed")
      return c.json({ error: "Unauthorized" }, 401)
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch (err) {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  if (payload.type !== "order.updated") {
    return c.json({ status: "ignored" })
  }

  const orderData = payload.data?.object?.order
  if (!orderData || orderData.state !== "COMPLETED") {
    return c.json({ status: "ignored" })
  }

  const customerId = orderData.customer_id
  if (!customerId) {
    return c.json({ status: "skipped", reason: "no_customer" })
  }

  try {
    const { getStoreBySquareLocation, getStoreByName, awardStampsForOrder } =
      await import("./dynamo")
    const mapping = await getStoreBySquareLocation(orderData.location_id)
    if (!mapping) {
      return c.json({ status: "skipped", reason: "unmapped_location" })
    }

    const store = await getStoreByName(mapping.storeName)
    if (!store || !store.rewardRules) {
      return c.json({ status: "skipped", reason: "store_not_found" })
    }

    const accessToken =
      (await getSquareAccessToken(store.storeName)) || mapping.accessToken
    const cardId = await getSquareCustomerReferenceId(customerId, accessToken)
    if (!cardId) {
      return c.json({ status: "skipped", reason: "no_card_id" })
    }

    const fullOrder = await getSquareOrder(orderData.id, accessToken)
    if (!fullOrder) {
      return c.json({ error: "Failed to fetch full order details" }, 500)
    }

    const squareLineItems = fullOrder.line_items || []
    const normalizedItems = squareLineItems.map((item: any) => ({
      sku: item.catalog_object_id,
      name: item.name,
      quantity: parseInt(item.quantity || "0", 10),
      priceCents: item.total_money?.amount || 0,
    }))

    const stampsToAward = calculateStamps(store, normalizedItems)
    if (stampsToAward > 0) {
      const result = await awardStampsForOrder(
        store.storeName,
        cardId,
        orderData.id,
        stampsToAward,
      )
      if (result.success && result.updatedCard) {
        console.log(`Awarded ${stampsToAward} stamps to card ${cardId}.`)
      } else if (result.alreadyProcessed) {
        console.log(`Duplicate webhook skipped: Order ${orderData.id}`)
      } else {
        console.error(`Failed to award stamps: Card ${cardId} not found`)
      }
    }

    return c.json({ status: "success", stampsAwarded: stampsToAward })
  } catch (err: any) {
    console.error("Square Webhook handler error:", err)
    return c.json({ error: "Internal Server Error" }, 500)
  }
})

// 12. POST /api/integrations/shopify/webhook
app.post("/api/integrations/shopify/webhook", async (c) => {
  const signature = c.req.header("X-Shopify-Hmac-Sha256") || ""
  const rawBody = await c.req.text()
  
  const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || ""
  if (SHOPIFY_CLIENT_SECRET) {
    if (!signature) {
      console.error("Missing X-Shopify-Hmac-Sha256 header")
      return c.json({ error: "Unauthorized" }, 401)
    }
    if (!verifyShopifySignature(signature, rawBody, SHOPIFY_CLIENT_SECRET)) {
      console.error("Shopify webhook HMAC verification failed")
      return c.json({ error: "Unauthorized" }, 401)
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch (err) {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const shopDomain = c.req.header("X-Shopify-Shop-Domain") || ""
  const storeName = shopDomain.split(".")[0]
  
  const noteAttributes = payload.note_attributes || []
  const cardIdAttr = noteAttributes.find((attr: any) => attr.name === "_custom_card_id")
  const tokenAttr = noteAttributes.find((attr: any) => attr.name === "_custom_redemption_token")

  if (cardIdAttr && cardIdAttr.value) {
    const cardId = cardIdAttr.value
    try {
      const { getStoreByName, awardStampsForOrder } = await import("./dynamo")
      const store = await getStoreByName(storeName)
      if (store && store.rewardRules) {
        const lineItems = payload.line_items || []
        const normalizedItems = lineItems.map((item: any) => ({
          sku: item.sku,
          name: item.title,
          quantity: item.quantity || 0,
          priceCents: Math.round(parseFloat(item.price || "0") * 100),
        }))

        const stampsToAward = calculateStamps(store, normalizedItems)
        if (stampsToAward > 0) {
          const result = await awardStampsForOrder(
            storeName,
            cardId,
            payload.id.toString(),
            stampsToAward,
          )
          if (result.success && result.updatedCard) {
            console.log(`Successfully awarded ${stampsToAward} stamps to card ${cardId}.`)
          } else if (result.alreadyProcessed) {
            console.log(`Duplicate webhook: Order ${payload.id} already processed.`)
          }
        }
      }
    } catch (err) {
      console.error("Error awarding stamps during Shopify webhook:", err)
    }
  }

  if (tokenAttr && tokenAttr.value) {
    try {
      await commitRedemption(tokenAttr.value)
      console.log("Successfully committed redemption", tokenAttr.value)
    } catch (err) {
      console.error("Failed to commit redemption:", err)
    }
  }

  return c.json({ status: "success" })
})

// Configure Bun native HTTP runner
export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
