import { describe, it, expect } from "vitest"
import { createStore, getStoreByName } from "./store"

describe("Store DB Integration", () => {
  it("should create a store and retrieve it from the database", async () => {
    // Generate a unique store name so tests don't collide
    const uniqueStoreName = `test-integration-store-${crypto.randomUUID()}`
    
    // Create new store
    const store = await createStore(uniqueStoreName)
    
    expect(store).toBeDefined()
    expect(store.storeId).toBeDefined()
    expect(store.storeName).toBe(uniqueStoreName)
    expect(store.EntityType).toBe("Store")
    
    // Retrieve it from DynamoDB
    const retrievedStore = await getStoreByName(uniqueStoreName)
    
    expect(retrievedStore).toBeDefined()
    expect(retrievedStore?.storeId).toBe(store.storeId)
  })
})
