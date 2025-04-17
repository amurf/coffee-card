import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  PutCommandOutput,
} from "@aws-sdk/lib-dynamodb"
import { LoyaltyCard } from "@coffee-card/shared"

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

const TABLE_NAME = "CoffeeCardData" // TODO Environment variable
const TABLE_INDEXES = {
  GET_BY_CARD_ID: "getByCardId",
} as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const insertData = async <T extends Record<string, any>>(
  data: T,
): Promise<PutCommandOutput> => {
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: data,
  })

  const response = await docClient.send(command)
  return response
}

export const getCard = async (
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
