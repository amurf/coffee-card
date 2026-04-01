import { z } from "zod"

export const PendingRedemptionSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  EntityType: z.literal("PendingRedemption"),
  token: z.string(),
  cardId: z.string(),
  coffeeCount: z.number(),
  expiresAt: z.number(),
})

export type PendingRedemptionModel = z.infer<typeof PendingRedemptionSchema>
