import ky from "ky"
import type { LoyaltyCardDto, StoreProfileDto, ReserveResponseDto } from "../dto"

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

export const reserveRedemption = async (
  cardId: string,
  coffeeCount: number,
  sessionToken?: string
): Promise<ReserveResponseDto> => {
  return await getApiClient()
    .post(`redemptions/reserve`, {
      json: { cardId, coffeeCount },
      ...(sessionToken ? { headers: { Authorization: `Bearer ${sessionToken}` } } : {})
    })
    .json()
}

export const commitRedemption = async (
  redemptionToken: string,
): Promise<void> => {
  return await getApiClient()
    .post(`redemptions/commit`, { json: { redemptionToken } })
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
