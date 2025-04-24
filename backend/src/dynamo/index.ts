import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({})
export const docClient = DynamoDBDocumentClient.from(client)

export const TABLE_NAME = "CoffeeCardData" // TODO Environment variable
export const TABLE_INDEXES = {
  GET_BY_CARD_ID: "getByCardId",
} as const

export * from "./store"
export * from "./card"
