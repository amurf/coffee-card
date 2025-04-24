import z from "zod"
import { LoyaltyCardModel } from "../model"

export const GetLoyaltyCardSchema = z.object({
  cardId: z.string(),
  storeName: z.string(),
  issueDate: z.string(),
  coffeeCount: z.number(),
  coffeesEarned: z.number(),
  coffeesRedeemed: z.number(),
})

export type LoyaltyCardDto = z.infer<typeof GetLoyaltyCardSchema>

export const toLoyaltyCardDto = (model: LoyaltyCardModel): LoyaltyCardDto => {
  return {
    cardId: model.cardId,
    storeName: model.storeName,
    issueDate: model.issueDate,
    coffeeCount: model.coffeeCount,
    coffeesEarned: model.coffeesEarned,
    coffeesRedeemed: model.coffeesRedeemed,
  }
}

export const GetLoyaltyCardParamsSchema = z.object({
  cardId: z.string(),
})

export type GetLoyaltyCardParams = z.infer<typeof GetLoyaltyCardParamsSchema>

export const RedeemParamsSchema = z.object({
  cardId: z.string(),
})

export type RedeemParams = z.infer<typeof RedeemParamsSchema>

export const RedeemQueryParamsSchema = z.object({
  coffeeCount: z
    .string()
    .transform((val) => {
      const num = parseInt(val)
      if (isNaN(num)) {
        throw new Error("Invalid number")
      }
      return num
    })
    .refine((num) => num > 0, {
      message: "The number must be positive",
    }),
})

export type RedeemQueryParams = z.infer<typeof RedeemQueryParamsSchema>
