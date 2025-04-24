import { LoyaltyCardModel, StoreProfileModel } from "@coffee-card/shared"
import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb"
import { cardIdToSK, insertData, storeNameToPK } from "./helpers"
import { TABLE_NAME, docClient } from "."

export async function createStore(
  storeName: string,
): Promise<StoreProfileModel> {
  const storeId = crypto.randomUUID()
  const storeProfile: StoreProfileModel = {
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
): Promise<LoyaltyCardModel> => {
  const cardId = crypto.randomUUID()
  const store = await getStoreByName(storeName)

  if (!store) {
    throw new Error(`Store with name ${storeName} does not exist`)
  }

  const newCard: LoyaltyCardModel = {
    PK: storeNameToPK(storeName),
    SK: cardIdToSK(cardId),
    EntityType: "Card",
    cardId,
    storeName: store.storeName,
    issueDate: new Date().toISOString(),
    coffeeCount: 0,
    coffeesEarned: 0,
    coffeesRedeemed: 0,
  }

  return await insertData(newCard)
}

export const getStoreByName = async (
  storeName: string,
): Promise<StoreProfileModel | null> => {
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

  return response.Item as StoreProfileModel
}

export const getStoreCards = async (
  storeName: string,
): Promise<LoyaltyCardModel[]> => {
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
    return response.Items as LoyaltyCardModel[]
  }

  return []
}
