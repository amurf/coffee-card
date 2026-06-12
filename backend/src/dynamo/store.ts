import { LoyaltyCardModel, StoreProfileModel } from "@coffee-card/shared"
import { db } from "../db"
import { stores, loyaltyCards } from "@coffee-card/shared/db"
import { eq } from "drizzle-orm"
import { syncCardToSquare } from "../integrations/square"

export async function createStore(
  storeName: string,
): Promise<StoreProfileModel> {
  const storeId = crypto.randomUUID()
  
  const storeData = {
    id: storeId,
    name: storeName,
    location: "",
    posType: "SHOPIFY" as const,
    posConfig: {
      shopifyShop: `${storeName}.myshopify.com`,
    },
    rewardRules: {
      earningRule: { type: "ITEM_PURCHASE" as const },
      milestones: [
        {
          id: crypto.randomUUID(),
          stampsRequired: 10,
          rewardType: "FREE_ITEM" as const,
          description: "Free Coffee",
        },
      ],
    },
    merchantPasscode: "1234",
  }

  await db.insert(stores).values(storeData)

  return {
    PK: `STORE#${storeName.toLowerCase()}`,
    SK: "PROFILE",
    EntityType: "Store",
    storeId,
    storeName,
    location: storeData.location,
    posType: storeData.posType,
    posConfig: storeData.posConfig,
    rewardRules: storeData.rewardRules,
    merchantPasscode: storeData.merchantPasscode,
  }
}

export async function updateStoreProfile(
  storeProfile: StoreProfileModel,
): Promise<StoreProfileModel> {
  await db.update(stores)
    .set({
      location: storeProfile.location,
      themeOptions: storeProfile.themeOptions,
      rewardRules: storeProfile.rewardRules,
      posType: storeProfile.posType,
      posConfig: storeProfile.posConfig,
      merchantPasscode: storeProfile.merchantPasscode,
    })
    .where(eq(stores.name, storeProfile.storeName))

  return storeProfile
}

export const createNewCardForStore = async (
  storeName: string,
): Promise<LoyaltyCardModel> => {
  const cardId = crypto.randomUUID()
  const store = await getStoreByName(storeName)

  if (!store) {
    throw new Error(`Store with name ${storeName} does not exist`)
  }

  const issueDate = new Date().toISOString()
  await db.insert(loyaltyCards).values({
    id: cardId,
    storeName: store.storeName,
    issueDate,
    stampCount: 0,
    totalStampsEarned: 0,
    redeemedMilestones: [],
  })

  const newCard: LoyaltyCardModel = {
    PK: `STORE#${storeName.toLowerCase()}`,
    SK: `CARD#${cardId}`,
    EntityType: "Card",
    cardId,
    storeName: store.storeName,
    issueDate,
    stampCount: 0,
    totalStampsEarned: 0,
    redeemedMilestones: [],
  }

  // Asynchronously trigger Square Customer Directory sync if configured
  if (store.posType === "SQUARE") {
    try {
      await syncCardToSquare(store, cardId)
    } catch (err) {
      console.error(`Failed to sync card ${cardId} to Square:`, err)
    }
  }

  return newCard
}

export const getStoreByName = async (
  storeName: string,
): Promise<StoreProfileModel | null> => {
  const result = await db.select().from(stores).where(eq(stores.name, storeName)).limit(1)

  if (!result.length) {
    return null
  }

  const store = result[0]
  return {
    PK: `STORE#${store.name.toLowerCase()}`,
    SK: "PROFILE",
    EntityType: "Store",
    storeId: store.id,
    storeName: store.name,
    location: store.location,
    themeOptions: store.themeOptions ?? undefined,
    rewardRules: store.rewardRules ?? undefined,
    posType: store.posType,
    posConfig: store.posConfig ?? undefined,
    merchantPasscode: store.merchantPasscode ?? undefined,
  }
}

export const getStoreCards = async (
  storeName: string,
): Promise<LoyaltyCardModel[]> => {
  const result = await db.select().from(loyaltyCards).where(eq(loyaltyCards.storeName, storeName))

  return result.map((card) => ({
    PK: `STORE#${storeName.toLowerCase()}`,
    SK: `CARD#${card.id}`,
    EntityType: "Card",
    cardId: card.id,
    storeName: card.storeName,
    issueDate: card.issueDate,
    stampCount: card.stampCount,
    totalStampsEarned: card.totalStampsEarned,
    redeemedMilestones: card.redeemedMilestones,
  }))
}

export const getStoreBySquareLocation = async (
  locationId: string,
): Promise<{ storeName: string; accessToken: string } | null> => {
  const result = await db.select().from(stores).where(eq(stores.posType, "SQUARE"))
  
  const matchedStore = result.find((s) => s.posConfig?.squareLocationId === locationId)
  if (!matchedStore || !matchedStore.posConfig?.squareAccessToken) {
    return null
  }

  return {
    storeName: matchedStore.name,
    accessToken: matchedStore.posConfig.squareAccessToken,
  }
}

export const linkStoreToSquare = async (
  storeName: string,
  locationId: string,
  accessToken: string,
): Promise<void> => {
  const store = await getStoreByName(storeName)
  if (!store) return

  const updatedConfig = {
    ...(store.posConfig || {}),
    squareLocationId: locationId,
    squareAccessToken: accessToken,
  }

  await db.update(stores)
    .set({
      posType: "SQUARE",
      posConfig: updatedConfig,
    })
    .where(eq(stores.name, storeName))
}

export const getAllStores = async (): Promise<StoreProfileModel[]> => {
  const result = await db.select().from(stores)

  return result.map((store) => ({
    PK: `STORE#${store.name.toLowerCase()}`,
    SK: "PROFILE",
    EntityType: "Store",
    storeId: store.id,
    storeName: store.name,
    location: store.location,
    themeOptions: store.themeOptions ?? undefined,
    rewardRules: store.rewardRules ?? undefined,
    posType: store.posType,
    posConfig: store.posConfig ?? undefined,
    merchantPasscode: store.merchantPasscode ?? undefined,
  }))
}
