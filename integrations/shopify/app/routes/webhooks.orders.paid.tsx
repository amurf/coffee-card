import type { ActionFunctionArgs } from "@remix-run/node"
import { authenticate } from "../shopify.server"
import {
  getStoreByName,
  redeem,
  commitRedemption,
  calculateStamps,
  awardStampsForOrder,
  type NormalizedLineItem,
} from "@coffee-card/backend"

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request)

  console.log(`Received ${topic} webhook for ${shop}`)

  const typedPayload = payload as any
  const noteAttributes = typedPayload.note_attributes || []

  const cardIdAttr = noteAttributes.find(
    (attr: any) => attr.name === "_custom_card_id",
  )
  const tokenAttr = noteAttributes.find(
    (attr: any) => attr.name === "_custom_redemption_token",
  )

  const storeName = shop.split(".")[0]

  // 1. Process stamp earning if a card is linked to the order
  if (cardIdAttr && cardIdAttr.value) {
    const cardId = cardIdAttr.value
    console.log(
      `Found card ID: ${cardId} linked to order. Processing stamp award...`,
    )
    try {
      const store = await getStoreByName(storeName)
      if (store && store.rewardRules) {
        const lineItems = typedPayload.line_items || []
        const normalizedItems: NormalizedLineItem[] = lineItems.map(
          (item: any) => ({
            sku: item.sku,
            name: item.title,
            quantity: item.quantity || 0,
            priceCents: Math.round(parseFloat(item.price || "0") * 100),
          }),
        )

        const stampsToAward = calculateStamps(store, normalizedItems)

        if (stampsToAward > 0) {
          const result = await awardStampsForOrder(
            storeName,
            cardId,
            typedPayload.id.toString(), // Shopify order ID
            stampsToAward,
          )

          if (result.success && result.updatedCard) {
            console.log(
              `Successfully awarded ${stampsToAward} stamps to card ${cardId}. New balance: ${result.updatedCard.stampCount}`,
            )
          } else if (result.alreadyProcessed) {
            console.log(
              `Duplicate webhook skipped: Order ${typedPayload.id} has already been processed.`,
            )
          } else {
            console.error(`Failed to award stamps: Card ${cardId} not found.`)
          }
        }
      } else {
        console.warn(
          `Store profile or reward rules not found for store: ${storeName}`,
        )
      }
    } catch (err) {
      console.error("Error awarding stamps during webhook:", err)
    }
  }

  // 2. Commit redemption if a reward was claimed
  if (tokenAttr && tokenAttr.value) {
    console.log(`Found redemption token: ${tokenAttr.value}, committing...`)
    try {
      await commitRedemption(tokenAttr.value)
      console.log("Successfully committed redemption", tokenAttr.value)
    } catch (err) {
      console.error("Failed to commit redemption:", err)
    }
  }

  return new Response("Webhook processed", { status: 200 })
}
