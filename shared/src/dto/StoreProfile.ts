import z from "zod"
import type { StoreProfileModel } from "../model"

export const EarningTypeSchema = z.enum(["ITEM_PURCHASE", "SPEND_AMOUNT"])

export const EarningRuleSchema = z.object({
  type: EarningTypeSchema,
  amountPerStamp: z.number().optional(),
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

export const RewardRulesSchema = z.object({
  earningRule: EarningRuleSchema,
  milestones: z.array(MilestoneRewardSchema),
})

export const StoreProfileSchema = z.object({
  storeId: z.string(),
  storeName: z.string(),
  location: z.string(),
  themeOptions: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    logoUrl: z.string().optional(),
  }).optional(),
  rewardRules: RewardRulesSchema.optional(),
})

export type StoreProfileDto = z.infer<typeof StoreProfileSchema>

export const toStoreProfileDto = (
  model: StoreProfileModel,
): StoreProfileDto => {
  return {
    storeId: model.storeId,
    storeName: model.storeName,
    location: model.location,
    themeOptions: model.themeOptions,
    rewardRules: model.rewardRules,
  }
}

export const GetStoreParamsSchema = z.object({
  storeId: z.string(),
})

export type GetStoreParams = z.infer<typeof CreateCardForStoreParamsSchema>

export const CreateCardForStoreParamsSchema = z.object({
  storeId: z.string(),
})

export type CreateCardForStoreParams = z.infer<
  typeof CreateCardForStoreParamsSchema
>
