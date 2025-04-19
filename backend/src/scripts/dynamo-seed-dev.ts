import { insertData } from "../dynamo"
import { LoyaltyCard, StoreProfile } from "@coffee-card/shared"

async function seedDatabase() {
  await insertData({
    PK: "STORE#coffeelads",
    SK: "PROFILE",
    EntityType: "Store",
    storeName: "Coffee Lads",
    location: "Melbourne",
  } as StoreProfile)

  await insertData({
    PK: "STORE#coffeelads",
    SK: "CARD",
    EntityType: "Card",
    cardId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    storeName: "Coffee Lads",
    issueDate: "2025-04-16",
    coffeeCount: 0,
  } as LoyaltyCard)
}

seedDatabase()
  .then(() => {
    console.log("Database seeded successfully")
  })
  .catch((error) => {
    console.error("Error seeding database:", error)
  })
