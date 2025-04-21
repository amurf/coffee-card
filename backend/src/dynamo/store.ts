import { LoyaltyCard, StoreProfile } from "@coffee-card/shared"
import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb"
import { cardIdToSK, insertData, storeNameToPK } from "./helpers"
import { TABLE_NAME, docClient } from "."

export async function createStore(storeName: string): Promise<StoreProfile> {
  const storeId = crypto.randomUUID()
  const storeProfile: StoreProfile = {
    PK: storeNameToPK(storeName),
    SK: "PROFILE",
    EntityType: "Store",
    storeId,
    storeName,
    location: "",
  }

  return await insertData(storeProfile)
}

export const createNewCardForStore = async (
  storeName: string,
): Promise<LoyaltyCard> => {
  const cardId = crypto.randomUUID()

  const newCard: LoyaltyCard = {
    PK: storeNameToPK(storeName),
    SK: cardIdToSK(cardId),
    EntityType: "Card",
    cardId,
    storeName: storeName,
    issueDate: new Date().toISOString(),
    coffeeCount: 0,
  }

  return await insertData(newCard)
}

export const getStoreByName = async (
  storeName: string,
): Promise<StoreProfile | null> => {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: storeNameToPK(storeName),
      SK: "PROFILE",
    },
  })

  const response = await docClient.send(command)

  if (!response.Item) {
    return null
  }

  return response.Item as StoreProfile
}

export const getStoreCards = async (
  storeName: string,
): Promise<LoyaltyCard[]> => {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `STORE#${storeName}`,
      ":skPrefix": "CARD#",
    },
  })

  const response = await docClient.send(command)
  if (response.Items?.length) {
    return response.Items as LoyaltyCard[]
  }

  return []
}
