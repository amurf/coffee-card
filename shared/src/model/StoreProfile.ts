import { z } from "zod"

export const EarningTypeSchema = z.enum(["ITEM_PURCHASE", "SPEND_AMOUNT"])

export const EarningRuleSchema = z.object({
  type: EarningTypeSchema,
  amountPerStamp: z.number().optional(), // Used if type is 'SPEND_AMOUNT'
})

export const RewardTypeSchema = z.enum([
  "FIXED_DISCOUNT",
  "PERCENTAGE_DISCOUNT",
  "FREE_ITEM",
  "CUSTOM",
])

export const MilestoneRewardSchema = z.object({
  id: z.string(),
  stampsRequired: z.number(),
  rewardType: RewardTypeSchema,
  value: z.number().optional(),
  description: z.string(),
})

export const EligibilitySchema = z.object({
  skuPrefix: z.string().optional(),
})

export const RewardRulesSchema = z.object({
  earningRule: EarningRuleSchema,
  milestones: z.array(MilestoneRewardSchema),
  eligibility: EligibilitySchema.optional(),
})

export const StoreProfileSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  EntityType: z.literal("Store"),
  storeId: z.string(),
  storeName: z.string(),
  location: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  themeOptions: z
    .object({
      primaryColor: z.string(),
      secondaryColor: z.string(),
      logoUrl: z.string().optional(),
    })
    .optional(),
  rewardRules: RewardRulesSchema.optional(),
  posType: z.enum(["SHOPIFY", "SQUARE", "LIGHTSPEED", "NONE"]).optional(),
  posConfig: z
    .object({
      shopifyShop: z.string().optional(),
      squareLocationId: z.string().optional(),
      squareAccessToken: z.string().optional(),
      squareRefreshToken: z.string().optional(),
      squareTokenExpiresAt: z.string().optional(),
      squareMerchantId: z.string().optional(),
    })
    .optional(),
  merchantPasscode: z.string().optional(),
})

export type StoreProfileModel = z.infer<typeof StoreProfileSchema>
