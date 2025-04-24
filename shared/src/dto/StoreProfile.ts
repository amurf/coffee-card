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
