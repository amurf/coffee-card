import ky from "ky"
import { LoyaltyCardDto, StoreProfileDto } from "../dto"

export const apiBaseUrl =
  "https://rstij0f9ll.execute-api.ap-southeast-2.amazonaws.com/dev"

export const apiClient = ky.extend({
  prefixUrl: apiBaseUrl,
})

export const getCardById = async (cardId: string): Promise<LoyaltyCardDto> => {
  return await apiClient.get(`cards/${cardId}`).json()
}

export const redeemPurchase = async (
  cardId: string,
  coffeeCount: number,
): Promise<LoyaltyCardDto> => {
  return await apiClient
    .post(`cards/${cardId}/redeem`, { searchParams: { coffeeCount } })
    .json()
}

export const createCard = async (storeId: string): Promise<LoyaltyCardDto> => {
  return await apiClient.post(`stores/${storeId}/cards`).json()
}

export const getStoreById = async (
  storeId: string,
): Promise<StoreProfileDto> => {
  return await apiClient.get(`stores/${storeId}`).json()
}
