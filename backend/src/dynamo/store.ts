import { LoyaltyCardModel, StoreProfileModel } from "@coffee-card/shared"
import { QueryCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import { cardIdToSK, insertData, storeNameToPK } from "./helpers"
import { TABLE_NAME, docClient } from "."
import { syncCardToSquare } from "../integrations/square"

export async function createStore(
  storeName: string,
): Promise<StoreProfileModel> {
  // coffeecarddev.myshopify.com
  const storeId = crypto.randomUUID()
  const storeProfile: StoreProfileModel = {
    PK: storeNameToPK(storeName),
    SK: "PROFILE",
    EntityType: "Store",
    storeId,
    storeName,
    location: "",
    posType: "SHOPIFY",
    posConfig: {
      shopifyShop: `${storeName}.myshopify.com`,
    },
    rewardRules: {
      earningRule: { type: "ITEM_PURCHASE" },
      milestones: [
        {
          id: crypto.randomUUID(),
          stampsRequired: 10,
          rewardType: "FREE_ITEM",
          description: "Free Coffee",
        },
      ],
    },
  }

  return await insertData(storeProfile)
}

export async function updateStoreProfile(
  storeProfile: StoreProfileModel,
): Promise<StoreProfileModel> {
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
    stampCount: 0,
    totalStampsEarned: 0,
    redeemedMilestones: [],
  }

  const savedCard = await insertData(newCard)

  // Asynchronously trigger Square Customer Directory sync if configured
  if (store.posType === "SQUARE") {
    try {
      await syncCardToSquare(store, cardId)
    } catch (err) {
      console.error(`Failed to sync card ${cardId} to Square:`, err)
    }
  }

  return savedCard
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
      ":pk": storeNameToPK(storeName),
      ":skPrefix": "CARD#",
    },
  })

  const response = await docClient.send(command)
  if (response.Items?.length) {
    return response.Items as LoyaltyCardModel[]
  }

  return []
}

export const getStoreBySquareLocation = async (
  locationId: string,
): Promise<{ storeName: string; accessToken: string } | null> => {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: "INTEGRATION#SQUARE",
      SK: `LOCATION#${locationId}`,
    },
  })

  const response = await docClient.send(command)
  if (!response.Item) {
    return null
  }

  return response.Item as { storeName: string; accessToken: string }
}

export const linkStoreToSquare = async (
  storeName: string,
  locationId: string,
  accessToken: string,
): Promise<void> => {
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: "INTEGRATION#SQUARE",
      SK: `LOCATION#${locationId}`,
      storeName,
      accessToken,
      updatedAt: new Date().toISOString(),
    },
  })

  await docClient.send(command)
}
