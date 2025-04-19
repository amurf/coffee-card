export interface StoreProfile {
  PK: string // STORE#<storeName> - storeName is all lowercase
  SK: "PROFILE"
  EntityType: "Store"
  storeName: string
  location: string
}
