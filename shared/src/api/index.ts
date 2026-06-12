import ky from "ky"
import type {
  LoyaltyCardDto,
  StoreProfileDto,
  ReserveResponseDto,
} from "../dto"

let client: typeof ky | undefined

export const configureApi = (url: string) => {
  client = ky.extend({
    prefixUrl: url,
  })
}

const getApiClient = () => {
  if (!client) {
    throw new Error(
      "API client not configured. Please call configureApi first.",
    )
  }
  return client
}

export const getCardById = async (cardId: string): Promise<LoyaltyCardDto> => {
  return await getApiClient().get(`cards/${cardId}`).json()
}

export const getCardQrToken = async (
  cardId: string,
): Promise<{ qrToken: string; expiresAt: number }> => {
  return await getApiClient().get(`cards/${cardId}/qr-token`).json()
}

export const reserveRedemption = async (
  cardId: string,
  milestoneId: string,
  sessionToken?: string,
): Promise<ReserveResponseDto> => {
  return await getApiClient()
    .post(`redemptions/reserve`, {
      json: { cardId, milestoneId },
      ...(sessionToken
        ? { headers: { Authorization: `Bearer ${sessionToken}` } }
        : {}),
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

export const getAllStores = async (): Promise<StoreProfileDto[]> => {
  return await getApiClient().get(`stores`).json()
}

export const getStoreCards = async (storeId: string): Promise<LoyaltyCardDto[]> => {
  return await getApiClient().get(`stores/${storeId}/cards`).json()
}

export const createStore = async (storeName: string): Promise<StoreProfileDto> => {
  return await getApiClient().post("stores", { json: { storeName } }).json()
}

export const updateStore = async (
  storeId: string,
  store: Partial<StoreProfileDto>,
): Promise<StoreProfileDto> => {
  return await getApiClient().put(`stores/${storeId}`, { json: store }).json()
}

export const getSquareConfig = async (): Promise<{
  clientId: string
  redirectUri: string
  oauthBase: string
}> => {
  return await getApiClient().get(`integrations/square/config`).json()
}

export const getShopifyConfig = async (): Promise<{
  clientId: string
  redirectUri: string
}> => {
  return await getApiClient().get(`integrations/shopify/config`).json()
}

