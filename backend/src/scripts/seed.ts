import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { stores, loyaltyCards } from "@coffee-card/shared/db"

const databaseUrl = process.env.DATABASE_URL || "file:./backend/local.db"

const client = createClient({
  url: databaseUrl,
})
const db = drizzle(client)

async function seed() {
  console.log(`Seeding database at: ${databaseUrl}`)

  // Clean up existing data for idempotency
  await db.delete(loyaltyCards)
  await db.delete(stores)

  // 1. Seed Store: Hadoubrew (Watergardens Town Centre)
  const storeId1 = crypto.randomUUID()
  const storeName1 = "Hadoubrew"
  await db.insert(stores).values({
    id: storeId1,
    name: storeName1,
    location: "Watergardens Town Centre, Taylors Lakes VIC 3038",
    latitude: -37.6994,
    longitude: 144.7762,
    posType: "SHOPIFY",
    posConfig: {
      shopifyShop: `${storeName1}.myshopify.com`,
    },
    themeOptions: {
      primaryColor: "#1e1b4b", // Deep indigo
      secondaryColor: "#e0e7ff", // Light indigo
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
    merchantPasscode: "1234",
  })

  // 2. Seed Store: Java Joint (Sydenham Rd)
  const storeId2 = crypto.randomUUID()
  const storeName2 = "Java Joint"
  await db.insert(stores).values({
    id: storeId2,
    name: storeName2,
    location: "Sydenham Road, Sydenham VIC 3037",
    latitude: -37.7012,
    longitude: 144.7678,
    posType: "NONE",
    themeOptions: {
      primaryColor: "#7c2d12", // Warm amber/orange
      secondaryColor: "#ffedd5", // Soft cream
    },
    rewardRules: {
      earningRule: { type: "SPEND_AMOUNT", amountPerStamp: 5 },
      milestones: [
        {
          id: crypto.randomUUID(),
          stampsRequired: 8,
          rewardType: "PERCENTAGE_DISCOUNT",
          value: 15,
          description: "15% off next purchase",
        },
        {
          id: crypto.randomUUID(),
          stampsRequired: 15,
          rewardType: "FREE_ITEM",
          description: "Free Specialty Latte + Pastry",
        },
      ],
    },
    merchantPasscode: "4321",
  })

  // 3. Seed Store: Brewed Awakening (Taylors Hill)
  const storeId3 = crypto.randomUUID()
  const storeName3 = "Brewed Awakening"
  await db.insert(stores).values({
    id: storeId3,
    name: storeName3,
    location: "Taylors Hill Shopping Centre, Taylors Hill VIC 3037",
    latitude: -37.7088,
    longitude: 144.7542,
    posType: "NONE",
    themeOptions: {
      primaryColor: "#064e3b", // Deep forest green
      secondaryColor: "#d1fae5", // Soft mint
    },
    rewardRules: {
      earningRule: { type: "ITEM_PURCHASE" },
      milestones: [
        {
          id: crypto.randomUUID(),
          stampsRequired: 10,
          rewardType: "FREE_ITEM",
          description: "Free Cold Brew or Iced Tea",
        },
      ],
    },
    merchantPasscode: "8888",
  })

  // 4. Seed Store: The Daily Grind (Calder Park)
  const storeId4 = crypto.randomUUID()
  const storeName4 = "The Daily Grind"
  await db.insert(stores).values({
    id: storeId4,
    name: storeName4,
    location: "Calder Freeway, Calder Park VIC 3037",
    latitude: -37.6845,
    longitude: 144.7891,
    posType: "NONE",
    themeOptions: {
      primaryColor: "#881337", // Rich burgundy
      secondaryColor: "#ffe4e6", // Light rose
    },
    rewardRules: {
      earningRule: { type: "ITEM_PURCHASE" },
      milestones: [
        {
          id: crypto.randomUUID(),
          stampsRequired: 5,
          rewardType: "FIXED_DISCOUNT",
          value: 3,
          description: "$3.00 off next order",
        },
        {
          id: crypto.randomUUID(),
          stampsRequired: 10,
          rewardType: "FREE_ITEM",
          description: "Free Breakfast Wrap + Large Coffee",
        },
      ],
    },
    merchantPasscode: "9999",
  })

  // Seed default loyalty card for predictable testing (e.g. dev-card-id-1234 on Hadoubrew)
  const cardId = "dev-card-id-1234"
  await db.insert(loyaltyCards).values({
    id: cardId,
    storeName: storeName1,
    issueDate: new Date().toISOString(),
    stampCount: 4,
    totalStampsEarned: 4,
    redeemedMilestones: [],
  })

  console.log("Local database seeded with Melbourne 3037 cafes successfully!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Error seeding local database:", err)
  process.exit(1)
})
