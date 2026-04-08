import { PendingRedemptionModel } from "@coffee-card/shared"
import { GetCommand, PutCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb"
import { TABLE_NAME, docClient, getCardById, getStoreByName } from "."
import { randomUUID } from "node:crypto"

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

  if (card.coffeeCount < milestone.stampsRequired) return null
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

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: pending,
    })
  )

  return pending
}

export const commitRedemption = async (
  token: string
): Promise<boolean> => {
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `Redemption#${token}`,
        SK: `Redemption#${token}`,
      },
    })
  )
  const pending = res.Item as PendingRedemptionModel | undefined
  if (!pending) return false

  const card = await getCardById(pending.cardId)
  if (!card) return false

  const updatedCard = {
    ...card,
    redeemedMilestones: [...(card.redeemedMilestones || []), pending.milestoneId],
  }

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PK: pending.PK,
              SK: pending.SK,
            },
            ConditionExpression: "attribute_exists(PK)",
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: updatedCard,
          },
        },
      ],
    })
  )

  return true
}
