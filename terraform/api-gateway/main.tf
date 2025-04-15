resource "aws_apigatewayv2_api" "test_api" {
  name          = "test-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_methods = ["GET", "OPTIONS"]
    allow_origins = ["*"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_integration" "test_lambda" {
  api_id             = aws_apigatewayv2_api.test_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = var.lambda.lambda_test_invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "test_api_get_test" {
  api_id    = aws_apigatewayv2_api.test_api.id
  route_key = "GET /test"
  target    = "integrations/${aws_apigatewayv2_integration.test_lambda.id}"
}

resource "aws_lambda_permission" "allow_api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda.lambda_test_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.test_api.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "dev" {
  api_id      = aws_apigatewayv2_api.test_api.id
  name        = "dev"
  auto_deploy = true
}

output "api_gateway_invoke_url" {
  value = "${aws_apigatewayv2_api.test_api.api_endpoint}/test"
}
