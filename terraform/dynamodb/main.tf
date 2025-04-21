resource "aws_dynamodb_table" "coffee_card_data" {
  name           = "CoffeeCardData"
  billing_mode   = "PAY_PER_REQUEST"
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

output "coffee_card_data_table_arn" {
  value = aws_dynamodb_table.coffee_card_data.arn
}
