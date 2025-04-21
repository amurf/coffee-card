import { createNewCardForStore, createStore } from "../dynamo"

const DEV_STORE_NAME = "Coffee Lads"

async function seedDatabase() {
  await createStore(DEV_STORE_NAME)
  await createNewCardForStore(DEV_STORE_NAME)
}

seedDatabase()
  .then(() => {
    console.log("Database seeded successfully")
  })
  .catch((error) => {
    console.error("Error seeding database:", error)
  })
