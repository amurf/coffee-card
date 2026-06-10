import { StoreProfileModel } from "@coffee-card/shared"

export interface NormalizedLineItem {
  sku?: string
  name?: string
  quantity: number
  priceCents: number
}

/**
 * Calculates the number of stamps to award based on store reward rules
 * and normalized line items.
 */
export function calculateStamps(
  store: StoreProfileModel,
  lineItems: NormalizedLineItem[],
): number {
  if (!store.rewardRules) return 0
  const earningRule = store.rewardRules.earningRule
  const skuPrefix = store.rewardRules.eligibility?.skuPrefix

  // Filter items by SKU/Name prefix if configured
  let eligibleItems = lineItems
  if (skuPrefix) {
    eligibleItems = lineItems.filter(
      (item) =>
        (item.sku &&
          item.sku.toLowerCase().startsWith(skuPrefix.toLowerCase())) ||
        (item.name &&
          item.name.toLowerCase().includes(skuPrefix.toLowerCase())),
    )
  }

  if (earningRule.type === "ITEM_PURCHASE") {
    return eligibleItems.reduce((acc, item) => acc + item.quantity, 0)
  } else if (earningRule.type === "SPEND_AMOUNT") {
    const eligibleSpendDollars = eligibleItems.reduce((acc, item) => {
      return acc + item.priceCents / 100
    }, 0)
    const amountPerStamp = earningRule.amountPerStamp || 10
    return Math.floor(eligibleSpendDollars / amountPerStamp)
  }

  return 0
}
