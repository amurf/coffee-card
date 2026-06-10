import { describe, it, expect } from "vitest"
import { calculateStamps, NormalizedLineItem } from "./loyalty"
import { StoreProfileModel } from "@coffee-card/shared"

describe("Loyalty Stamp Calculation", () => {
  const mockStore = (
    earningType: "ITEM_PURCHASE" | "SPEND_AMOUNT",
    amountPerStamp = 10,
    skuPrefix?: string,
  ): StoreProfileModel => ({
    PK: "STORE#test",
    SK: "PROFILE",
    EntityType: "Store",
    storeId: "test-id",
    storeName: "test-store",
    location: "Tokyo",
    rewardRules: {
      earningRule: {
        type: earningType,
        amountPerStamp,
      },
      milestones: [],
      eligibility: {
        skuPrefix,
      },
    },
  })

  it("should calculate stamps by item count when earningType is ITEM_PURCHASE", () => {
    const store = mockStore("ITEM_PURCHASE")
    const items: NormalizedLineItem[] = [
      { sku: "COFFEE-1", name: "Latte", quantity: 2, priceCents: 500 },
      { sku: "COFFEE-2", name: "Americano", quantity: 1, priceCents: 400 },
    ]
    expect(calculateStamps(store, items)).toBe(3)
  })

  it("should calculate stamps by spend amount when earningType is SPEND_AMOUNT", () => {
    const store = mockStore("SPEND_AMOUNT", 10)
    const items: NormalizedLineItem[] = [
      { sku: "COFFEE-1", name: "Latte", quantity: 2, priceCents: 1000 },
      { sku: "COFFEE-2", name: "Americano", quantity: 1, priceCents: 1550 },
    ]
    expect(calculateStamps(store, items)).toBe(2)
  })

  it("should filter by SKU prefix when configured", () => {
    const store = mockStore("ITEM_PURCHASE", 10, "COFFEE-")
    const items: NormalizedLineItem[] = [
      { sku: "COFFEE-1", name: "Latte", quantity: 2, priceCents: 500 },
      { sku: "PASTRY-1", name: "Croissant", quantity: 3, priceCents: 350 },
    ]
    expect(calculateStamps(store, items)).toBe(2)
  })
})
