resource "aws_apigatewayv2_api" "coffee_card_api" {
  name          = "coffee-card-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_methods = ["GET", "OPTIONS"]
    allow_origins = ["*"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_integration" "store_lambda" {
  api_id             = aws_apigatewayv2_api.coffee_card_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = var.lambda.store_invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "coffee_card_api_store" {
  api_id    = aws_apigatewayv2_api.coffee_card_api.id
  route_key = "GET /store"
  target    = "integrations/${aws_apigatewayv2_integration.store_lambda.id}"
}

resource "aws_apigatewayv2_integration" "card_lambda" {
  api_id             = aws_apigatewayv2_api.coffee_card_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = var.lambda.card_invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "coffee_card_api_card" {
  api_id    = aws_apigatewayv2_api.coffee_card_api.id
  route_key = "GET /card/{cardId}"
  target    = "integrations/${aws_apigatewayv2_integration.card_lambda.id}"
}

resource "aws_lambda_permission" "allow_api_gateway_store_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda.store_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.coffee_card_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_api_gateway_card_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda.card_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.coffee_card_api.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "dev" {
  api_id      = aws_apigatewayv2_api.coffee_card_api.id
  name        = "dev"
  auto_deploy = true
}

output "api_gateway_invoke_url" {
  value = "${aws_apigatewayv2_api.coffee_card_api.api_endpoint}/dev"
}
