import { z } from "zod"

export const PendingRedemptionSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  EntityType: z.literal("PendingRedemption"),
  token: z.string(),
  cardId: z.string(),
  milestoneId: z.string(),
  expiresAt: z.number(),
})

export type PendingRedemptionModel = z.infer<typeof PendingRedemptionSchema>
