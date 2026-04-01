import { PendingRedemptionModel } from "@coffee-card/shared"
import { GetCommand, PutCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb"
import { TABLE_NAME, docClient, getCardById } from "."
import { randomUUID } from "node:crypto"

export const createPendingRedemption = async (
  cardId: string,
  coffeeCount: number
): Promise<PendingRedemptionModel | null> => {
  const card = await getCardById(cardId)
  if (!card) return null
  if (card.coffeesEarned < coffeeCount) return null

  const token = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + 3600 // 1 hour TTL

  const pending: PendingRedemptionModel = {
    PK: `Redemption#${token}`,
    SK: `Redemption#${token}`,
    EntityType: "PendingRedemption",
    token,
    cardId,
    coffeeCount,
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
  if (card.coffeesEarned < pending.coffeeCount) return false // Double check

  const updatedCard = {
    ...card,
    coffeesEarned: card.coffeesEarned - pending.coffeeCount,
    coffeesRedeemed: card.coffeesRedeemed + pending.coffeeCount,
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
