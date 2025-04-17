import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb"

import { LoyaltyCard, StoreProfile } from "@coffee-card/shared"
const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

// TODO: client lib wrapper.
const insertData = async <T extends Record<string, any>>(
  tableName: string,
  data: T,
) => {
  const command = new PutCommand({
    TableName: tableName,
    Item: data,
  })

  const response = await docClient.send(command)
  return response
}

await insertData<StoreProfile>("StoreProfileWithLoyaltyCards", {
  PK: "STORE#CoffeeLads",
  SK: "PROFILE",
  storeName: "Coffee Lads",
  location: "Melbourne",
})

await insertData<LoyaltyCard>("StoreProfileWithLoyaltyCards", {
  PK: "STORE#CoffeeLads",
  SK: "CARD",
  cardId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  storeName: "Coffee Lads",
  issueDate: "2025-04-16",
  coffeeCount: 0,
})
