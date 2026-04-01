import { z } from "zod"

export const StoreProfileSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  EntityType: z.literal("Store"),
  storeId: z.string(),
  storeName: z.string(),
  location: z.string(),
  themeOptions: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    logoUrl: z.string().optional(),
  }).optional(),
  rewardRules: z.object({
    stampsRequired: z.number(),
  }).optional(),
})

export type StoreProfileModel = z.infer<typeof StoreProfileSchema>
