import type { ActionFunctionArgs } from "@remix-run/node"
import { authenticate } from "../shopify.server"
import { getStoreByName, redeem, commitRedemption } from "@coffee-card/backend"

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
        let stampsToAward = 0
        const earningRule = store.rewardRules.earningRule

        const lineItems = typedPayload.line_items || []
        const skuPrefix = store.rewardRules.eligibility?.skuPrefix

        let eligibleItems = lineItems
        if (skuPrefix) {
          eligibleItems = lineItems.filter(
            (item: any) => item.sku && item.sku.startsWith(skuPrefix),
          )
          console.log(
            `Filtering by SKU prefix "${skuPrefix}". Eligible items: ${eligibleItems.length}/${lineItems.length}`,
          )
        }

        if (earningRule.type === "ITEM_PURCHASE") {
          // Sum up quantities of eligible items purchased
          stampsToAward = eligibleItems.reduce(
            (acc: number, item: any) => acc + (item.quantity || 0),
            0,
          )
          console.log(
            `Earning rule is ITEM_PURCHASE. Awarding ${stampsToAward} stamps.`,
          )
        } else if (earningRule.type === "SPEND_AMOUNT") {
          // Sum up spend of eligible items purchased (excludes non-eligible items, tax, and shipping)
          const eligibleSpend = eligibleItems.reduce(
            (acc: number, item: any) =>
              acc + parseFloat(item.price || "0") * (item.quantity || 0),
            0,
          )
          const amountPerStamp = earningRule.amountPerStamp || 10
          stampsToAward = Math.floor(eligibleSpend / amountPerStamp)
          console.log(
            `Earning rule is SPEND_AMOUNT (eligible spend: $${eligibleSpend}, threshold: $${amountPerStamp}). Awarding ${stampsToAward} stamps.`,
          )
        }

        if (stampsToAward > 0) {
          const updatedCard = await redeem(cardId, stampsToAward)
          if (updatedCard) {
            console.log(
              `Successfully awarded ${stampsToAward} stamps to card ${cardId}. New balance: ${updatedCard.stampCount}`,
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
