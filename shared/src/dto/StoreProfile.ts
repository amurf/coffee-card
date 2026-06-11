import z from "zod"
import type { StoreProfileModel } from "../model"
import { RewardRulesSchema } from "../model/StoreProfile"

export const StoreProfileDtoSchema = z.object({
  storeId: z.string(),
  storeName: z.string(),
  location: z.string(),
  themeOptions: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    logoUrl: z.string().optional(),
  }).optional(),
  rewardRules: RewardRulesSchema.optional(),
  posType: z.enum(["SHOPIFY", "SQUARE", "NONE"]).optional(),
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

export type StoreProfileDto = z.infer<typeof StoreProfileDtoSchema>

export const toStoreProfileDto = (
  model: StoreProfileModel,
): StoreProfileDto => {
  return {
    storeId: model.storeId,
    storeName: model.storeName,
    location: model.location,
    themeOptions: model.themeOptions,
    rewardRules: model.rewardRules,
    posType: model.posType,
    posConfig: model.posConfig,
    merchantPasscode: model.merchantPasscode,
  }
}

export const GetStoreParamsSchema = z.object({
  storeId: z.string(),
})

export type GetStoreParams = z.infer<typeof GetStoreParamsSchema>

export const CreateCardForStoreParamsSchema = z.object({
  storeId: z.string(),
})

export type CreateCardForStoreParams = z.infer<
  typeof CreateCardForStoreParamsSchema
>
