import { z } from "zod"

export const StoreProfileSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  EntityType: z.literal("Store"),
  storeId: z.string(),
  storeName: z.string(),
  location: z.string(),
})

export type StoreProfileModel = z.infer<typeof StoreProfileSchema>
