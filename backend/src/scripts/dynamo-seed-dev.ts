import { createNewCardForStore, createStore } from "../dynamo"

const args = process.argv.slice(2);
const DEV_STORE_NAME = args[0] || "Hadoubrew";

console.log(`Seeding for store: ${DEV_STORE_NAME}`);

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
