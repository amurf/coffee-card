import z from "zod"
import { LoyaltyCardModel } from "../model"

const GetLoyaltyCardSchema = z.object({
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

const GetLoyaltyCardParams = z.object({
  cardId: z.string(),
})

export type GetLoyaltyCardParams = z.infer<typeof GetLoyaltyCardParams>
