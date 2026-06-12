import { LoyaltyCardModel } from "@coffee-card/shared"
import { db } from "../db"
import { loyaltyCards, processedOrders } from "@coffee-card/shared/db"
import { eq, sql } from "drizzle-orm"

export const getCardById = async (
  cardId: LoyaltyCardModel["cardId"],
): Promise<LoyaltyCardModel | null> => {
  const result = await db.select().from(loyaltyCards).where(eq(loyaltyCards.id, cardId)).limit(1)

  if (!result.length) {
    return null
  }

  const card = result[0]
  return {
    PK: `STORE#${card.storeName.toLowerCase()}`,
    SK: `CARD#${card.id}`,
    EntityType: "Card",
    cardId: card.id,
    storeName: card.storeName,
    issueDate: card.issueDate,
    stampCount: card.stampCount,
    totalStampsEarned: card.totalStampsEarned,
    redeemedMilestones: card.redeemedMilestones,
  }
}

export const redeem = async (
  cardId: LoyaltyCardModel["cardId"],
  stampCount: number,
): Promise<LoyaltyCardModel | null> => {
  const card = await getCardById(cardId)
  if (!card) {
    return null
  }

  await db.update(loyaltyCards)
    .set({
      stampCount: sql`${loyaltyCards.stampCount} + ${stampCount}`,
      totalStampsEarned: sql`${loyaltyCards.totalStampsEarned} + ${stampCount}`,
    })
    .where(eq(loyaltyCards.id, cardId))

  return await getCardById(cardId)
}

export const awardStampsForOrder = async (
  storeName: string,
  cardId: string,
  orderId: string,
  stampsToAward: number,
): Promise<{
  success: boolean
  alreadyProcessed?: boolean
  updatedCard?: LoyaltyCardModel
}> => {
  try {
    const updatedCard = await db.transaction(async (tx) => {
      // 1. Check/Insert processed order (idempotency key)
      await tx.insert(processedOrders).values({
        orderId,
        storeName,
        cardId,
        stampsAwarded: stampsToAward,
        createdAt: new Date().toISOString(),
      })

      // 2. Increment card stamp counts
      await tx.update(loyaltyCards)
        .set({
          stampCount: sql`${loyaltyCards.stampCount} + ${stampsToAward}`,
          totalStampsEarned: sql`${loyaltyCards.totalStampsEarned} + ${stampsToAward}`,
        })
        .where(eq(loyaltyCards.id, cardId))

      const card = await tx.select().from(loyaltyCards).where(eq(loyaltyCards.id, cardId)).limit(1)
      if (!card.length) {
        throw new Error(`Card ${cardId} not found during transaction`)
      }
      return card[0]
    })

    return {
      success: true,
      updatedCard: {
        PK: `STORE#${storeName.toLowerCase()}`,
        SK: `CARD#${updatedCard.id}`,
        EntityType: "Card",
        cardId: updatedCard.id,
        storeName: updatedCard.storeName,
        issueDate: updatedCard.issueDate,
        stampCount: updatedCard.stampCount,
        totalStampsEarned: updatedCard.totalStampsEarned,
        redeemedMilestones: updatedCard.redeemedMilestones,
      },
    }
  } catch (err: any) {
    const errorMsg = (err.message || "") + (err.cause?.message || "")
    if (
      errorMsg.includes("UNIQUE constraint failed") ||
      errorMsg.includes("constraint failed") ||
      errorMsg.includes("SQLITE_CONSTRAINT")
    ) {
      console.warn(
        `Order ${orderId} was already processed for store ${storeName}. Skipping.`,
      )
      return { success: false, alreadyProcessed: true }
    }
    throw err
  }
}
