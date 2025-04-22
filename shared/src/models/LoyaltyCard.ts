export interface LoyaltyCard {
  PK: string // STORE#<storeName> - storeName is all lowercase
  SK: string
  EntityType: "Card"
  cardId: string
  storeName: string
  issueDate: string
  coffeeCount: number
  coffeesEarned: number
  coffeesRedeemed: number
}
