import { describe, it, expect } from "vitest"
import { createStore, createNewCardForStore } from "./store"
import { getCardById, redeem, awardStampsForOrder } from "./card"

describe("Card DB Integration", () => {
  it("should atomically increment stamps and respect order idempotency", async () => {
    const uniqueStoreName = `test-card-int-${crypto.randomUUID()}`

    // 1. Setup store and card
    const store = await createStore(uniqueStoreName)
    expect(store).toBeDefined()

    const card = await createNewCardForStore(uniqueStoreName)
    expect(card).toBeDefined()
    expect(card.stampCount).toBe(0)
    expect(card.totalStampsEarned).toBe(0)

    // 2. Test atomic redeem
    const redeemedCard = await redeem(card.cardId, 5)
    expect(redeemedCard).toBeDefined()
    expect(redeemedCard?.stampCount).toBe(5)
    expect(redeemedCard?.totalStampsEarned).toBe(5)

    // 3. Test awardStampsForOrder first attempt (should succeed)
    const orderId = `order-${crypto.randomUUID()}`
    const result1 = await awardStampsForOrder(
      uniqueStoreName,
      card.cardId,
      orderId,
      3,
    )
    expect(result1.success).toBe(true)
    expect(result1.alreadyProcessed).toBeUndefined()
    expect(result1.updatedCard).toBeDefined()
    expect(result1.updatedCard?.stampCount).toBe(8)
    expect(result1.updatedCard?.totalStampsEarned).toBe(8)

    // 4. Test awardStampsForOrder second attempt (duplicate order, should be rejected)
    const result2 = await awardStampsForOrder(
      uniqueStoreName,
      card.cardId,
      orderId,
      3,
    )
    expect(result2.success).toBe(false)
    expect(result2.alreadyProcessed).toBe(true)
    expect(result2.updatedCard).toBeUndefined()

    // Verify card balance didn't change from the duplicate request
    const finalCard = await getCardById(card.cardId)
    expect(finalCard?.stampCount).toBe(8)
    expect(finalCard?.totalStampsEarned).toBe(8)

    // 5. Test awardStampsForOrder with a different order (should succeed)
    const newOrderId = `order-${crypto.randomUUID()}`
    const result3 = await awardStampsForOrder(
      uniqueStoreName,
      card.cardId,
      newOrderId,
      2,
    )
    expect(result3.success).toBe(true)
    expect(result3.alreadyProcessed).toBeUndefined()
    expect(result3.updatedCard?.stampCount).toBe(10)
    expect(result3.updatedCard?.totalStampsEarned).toBe(10)
  })
})
