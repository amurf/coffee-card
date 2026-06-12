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

  const storeId = crypto.randomUUID()
  const storeName = "Hadoubrew"

  // 1. Seed store profile
  await db.insert(stores).values({
    id: storeId,
    name: storeName,
    location: "Hadoubrew Cafe",
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
    merchantPasscode: "1234",
  }).onConflictDoNothing()

  // 2. Seed loyalty card
  const cardId = "dev-card-id-1234" // Fixed card ID for predictable local testing
  
  // Clean up existing card if it exists (for re-seeding)
  await db.delete(loyaltyCards)

  await db.insert(loyaltyCards).values({
    id: cardId,
    storeName: storeName,
    issueDate: new Date().toISOString(),
    stampCount: 4, // Pre-award 4 stamps for dev testing
    totalStampsEarned: 4,
    redeemedMilestones: [],
  })

  console.log("Local database seeded successfully!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Error seeding local database:", err)
  process.exit(1)
})
