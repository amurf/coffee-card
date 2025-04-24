import { LoyaltyCardModel } from "@coffee-card/shared"
import { QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import { TABLE_NAME, TABLE_INDEXES, docClient } from "."

export const getCardById = async (
  cardId: LoyaltyCardModel["cardId"],
): Promise<LoyaltyCardModel | null> => {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: TABLE_INDEXES.GET_BY_CARD_ID,
    KeyConditionExpression: "cardId = :cardId",
    ExpressionAttributeValues: {
      ":cardId": cardId,
    },
  })

  const response = await docClient.send(command)

  if (response.Items?.length) {
    return response.Items[0] as LoyaltyCardModel
  }

  return null
}

export const redeem = async (
  cardId: LoyaltyCardModel["cardId"],
  coffeeCount: number,
): Promise<LoyaltyCardModel | null> => {
  const card = await getCardById(cardId)
  if (!card) {
    return null
  }

  // TODO: this would really be configurable.
  const FREE_COFFEE_THRESHOLD = 10

  const newCoffeeCount =
    (card.coffeeCount + coffeeCount) % FREE_COFFEE_THRESHOLD
  const coffeesEarned =
    Math.floor((card.coffeeCount + coffeeCount) / FREE_COFFEE_THRESHOLD) +
    card.coffeesEarned

  const updatedCard = {
    ...card,
    coffeeCount: newCoffeeCount,
    coffeesEarned,
  }

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: updatedCard,
  })

  await docClient.send(command)
  return updatedCard
}
