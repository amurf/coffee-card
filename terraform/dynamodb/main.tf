resource "aws_dynamodb_table" "store_profile_with_loyalty_cards" {
  name           = "StoreProfileWithLoyaltyCards"
  billing_mode   = "PAY_PER_REQUEST"  # Change to "PROVISIONED" if preferred
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "cardId"
    type = "S"
  }

  global_secondary_index {
    name            = "getByCardId"
    hash_key        = "cardId"
    projection_type = "ALL"
  }
}
