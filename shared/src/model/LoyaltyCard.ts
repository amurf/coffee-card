import { z } from "zod"

export const LoyaltyCardSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  EntityType: z.literal("Card"),
  cardId: z.string(),
  storeName: z.string(),
  issueDate: z.string(),
  coffeeCount: z.number(),
  coffeesEarned: z.number(),
  coffeesRedeemed: z.number(),
  redeemedMilestones: z.array(z.string()).optional(),
})

export type LoyaltyCardModel = z.infer<typeof LoyaltyCardSchema>
