import z from "zod"
import { StoreProfileModel } from "../model"

const StoreProfileSchema = z.object({
  storeId: z.string(),
  storeName: z.string(),
  location: z.string(),
})

export type StoreProfileDto = z.infer<typeof StoreProfileSchema>

export const toStoreProfileDto = (
  model: StoreProfileModel,
): StoreProfileDto => {
  return {
    storeId: model.storeId,
    storeName: model.storeName,
    location: model.location,
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
