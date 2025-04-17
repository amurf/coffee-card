import { insertData, getCard } from "../dynamo"
import { LoyaltyCard, StoreProfile } from "@coffee-card/shared"

await insertData({
  PK: "STORE#CoffeeLads",
  SK: "PROFILE",
  storeName: "Coffee Lads",
  location: "Melbourne",
} as StoreProfile)

await insertData({
  PK: "STORE#CoffeeLads",
  SK: "CARD",
  cardId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  storeName: "Coffee Lads",
  issueDate: "2025-04-16",
  coffeeCount: 0,
} as LoyaltyCard)

const card = await getCard("f47ac10b-58cc-4372-a567-0e02b2c3d479")
console.log("Card:", card)
