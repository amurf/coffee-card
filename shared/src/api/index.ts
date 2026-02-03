import ky from "ky"
import type { LoyaltyCardDto, StoreProfileDto } from "../dto"

let client: typeof ky | undefined

export const configureApi = (url: string) => {
  client = ky.extend({
    prefixUrl: url,
  })
}

const getApiClient = () => {
  if (!client) {
    throw new Error("API client not configured. Please call configureApi first.")
  }
  return client
}

export const getCardById = async (cardId: string): Promise<LoyaltyCardDto> => {
  return await getApiClient().get(`cards/${cardId}`).json()
}

export const redeemPurchase = async (
  cardId: string,
  coffeeCount: number,
): Promise<LoyaltyCardDto> => {
  return await getApiClient()
    .post(`cards/${cardId}/redeem`, { searchParams: { coffeeCount } })
    .json()
}

export const createCard = async (storeId: string): Promise<LoyaltyCardDto> => {
  return await getApiClient().post(`stores/${storeId}/cards`).json()
}

export const getStoreById = async (
  storeId: string,
): Promise<StoreProfileDto> => {
  return await getApiClient().get(`stores/${storeId}`).json()
}
