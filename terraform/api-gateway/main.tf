
resource "aws_apigatewayv2_api" "coffee_card_api" {
  name          = "coffee-card-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_methods = ["GET", "OPTIONS"]
    allow_origins = ["*"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_stage" "dev" {
  api_id      = aws_apigatewayv2_api.coffee_card_api.id
  name        = "dev"
  auto_deploy = true
}

output "api_gateway_invoke_url" {
  value = "${aws_apigatewayv2_api.coffee_card_api.api_endpoint}/dev"
}

module "add_routes" {
  source = "./add-routes"
  api    = aws_apigatewayv2_api.coffee_card_api
  routes = {
    "GET /cards/{cardId}" = {
      lambda_arn        = var.lambda.card_arn
      lambda_invoke_arn = var.lambda.card_invoke_arn
    },
    "POST /stores/{storeId}/cards" = {
      lambda_arn        = var.lambda.create_card_arn
      lambda_invoke_arn = var.lambda.create_card_invoke_arn
    },
    "GET /stores/{storeId}" = {
      lambda_arn        = var.lambda.store_arn
      lambda_invoke_arn = var.lambda.store_invoke_arn
    },
    # "POST /cards/{cardId}/redeem" = {
    #   lambda_arn        = var.lambda.card_redeem_arn
    #   lambda_invoke_arn = var.lambda.card_redeem_invoke_arn
    # },
  }
}

# module "redeem_route" {
#   source            = "./add-route"
#   api            = aws_apigatewayv2_api.coffee_card_api
#   route_key         = "GET /cards/{cardId}/redeem"
#   lambda_invoke_arn = var.lambda.store_invoke_arn
#   lambda_arn        = var.lambda.store_arn
# }

# module "card_route" {
#   source            = "./add-route"
#   api               = aws_apigatewayv2_api.coffee_card_api
#   route_key         = "GET /cards/{cardId}"
#   lambda_invoke_arn = var.lambda.card_invoke_arn
#   lambda_arn        = var.lambda.card_arn
# }
