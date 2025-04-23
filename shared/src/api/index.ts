import ky from "ky"
import { LoyaltyCard, StoreProfile } from "../models"

export const apiBaseUrl =
  "https://rstij0f9ll.execute-api.ap-southeast-2.amazonaws.com/dev"

export const apiClient = ky.extend({
  prefixUrl: apiBaseUrl,
})

export const getCardById = async (cardId: string): Promise<LoyaltyCard> => {
  return await apiClient.get(`cards/${cardId}`).json()
}

export const redeemPurchase = async (cardId: string): Promise<LoyaltyCard> => {
  return await apiClient.post(`cards/${cardId}/redeem`).json()
}

export const createCard = async (storeId: string): Promise<LoyaltyCard> => {
  return await apiClient.post(`stores/${storeId}/cards`).json()
}

export const getStoreById = async (storeId: string): Promise<StoreProfile> => {
  return await apiClient.get(`stores/${storeId}`).json()
}
