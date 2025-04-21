export interface StoreProfile {
  PK: string // STORE#<storeName> - storeName is all lowercase
  SK: string
  EntityType: "Store"
  storeId: string // storeId is what is used in PK as STORE#{storeId} and is just a normalised version of storeName
  storeName: string
  location: string
}
