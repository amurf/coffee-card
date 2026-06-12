import { PendingRedemptionModel } from "@coffee-card/shared"
import { db } from "../db"
import { pendingRedemptions, loyaltyCards } from "@coffee-card/shared/db"
import { getCardById, getStoreByName } from "."
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

export const createPendingRedemption = async (
  cardId: string,
  milestoneId: string
): Promise<PendingRedemptionModel | null> => {
  const card = await getCardById(cardId)
  if (!card) return null

  const store = await getStoreByName(card.storeName)
  if (!store || !store.rewardRules) return null

  const milestone = store.rewardRules.milestones.find((m) => m.id === milestoneId)
  if (!milestone) return null

  if (card.stampCount < milestone.stampsRequired) return null
  if (card.redeemedMilestones?.includes(milestoneId)) return null

  const token = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + 3600 // 1 hour TTL

  const pending: PendingRedemptionModel = {
    PK: `Redemption#${token}`,
    SK: `Redemption#${token}`,
    EntityType: "PendingRedemption",
    token,
    cardId,
    milestoneId,
    expiresAt,
  }

  await db.insert(pendingRedemptions).values({
    token,
    cardId,
    milestoneId,
    expiresAt,
  })

  return pending
}

export const commitRedemption = async (
  token: string
): Promise<boolean> => {
  const res = await db.select().from(pendingRedemptions).where(eq(pendingRedemptions.token, token)).limit(1)
  
  if (!res.length) return false
  const pending = res[0]

  const card = await getCardById(pending.cardId)
  if (!card) return false

  const updatedMilestones = [...(card.redeemedMilestones || []), pending.milestoneId]

  await db.transaction(async (tx) => {
    // 1. Remove pending redemption
    await tx.delete(pendingRedemptions).where(eq(pendingRedemptions.token, token))

    // 2. Add redeemed milestone to card
    await tx.update(loyaltyCards)
      .set({
        redeemedMilestones: updatedMilestones,
      })
      .where(eq(loyaltyCards.id, pending.cardId))
  })

  return true
}
