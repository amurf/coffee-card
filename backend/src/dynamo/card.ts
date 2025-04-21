import { LoyaltyCard } from "@coffee-card/shared"
import { QueryCommand } from "@aws-sdk/lib-dynamodb"
import { TABLE_NAME, TABLE_INDEXES, docClient } from "."

export const getCardById = async (
  cardId: LoyaltyCard["cardId"],
): Promise<LoyaltyCard | null> => {
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
    return response.Items[0] as LoyaltyCard
  }

  return null
}
