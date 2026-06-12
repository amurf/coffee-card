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
  exchangeCode(code: string, redirectUri: string): Promise<{
    posType: "SQUARE" | "LIGHTSPEED" | "SHOPIFY" | "NONE"
    posConfig: Record<string, any>
  }>
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
  lightspeed: {
    async exchangeCode(code: string, redirectUri: string) {
      // Future Lightspeed Restaurant (O-Series) OAuth exchange logic will go here
      throw new Error("Lightspeed OAuth integration is not yet implemented")
    }
  }
}

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
  const shop = isShopify ? state.replace("shopify:", "") : state.replace("standalone:", "")

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
    const redirectUri = `${protocol}://${host}/api/integrations/${provider}/callback`

    console.log(`Exchanging code for ${provider} OAuth tokens...`)
    const { posType, posConfig } = await handler.exchangeCode(code, redirectUri)

    store.posType = posType
    store.posConfig = {
      ...store.posConfig,
      ...posConfig,
    }

    const { updateStoreProfile } = await import("./dynamo")
    await updateStoreProfile(store)

    let redirectUrl: string
    if (isShopify) {
      const appHandle = "coffee-card-dev"
      redirectUrl = `https://admin.shopify.com/store/${shop}/apps/${appHandle}/app/integrations?success=true`
    } else {
      const standaloneUrl =
        process.env.STANDALONE_FRONTEND_URL || "http://localhost:5173"
      redirectUrl = `${standaloneUrl}/?success=true`
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

// Configure Bun native HTTP runner
export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
