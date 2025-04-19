export interface LoyaltyCard {
  PK: string // STORE#<storeName> - storeName is all lowercase
  SK: "CARD"
  EntityType: "Card"
  cardId: string
  storeName: string
  issueDate: string
  coffeeCount: number
}
