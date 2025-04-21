resource "aws_apigatewayv2_integration" "integration" {
  for_each = var.routes

  api_id                  = var.api.id
  integration_type        = "AWS_PROXY"
  integration_uri         = each.value.lambda_invoke_arn
  integration_method      = "POST"
  payload_format_version  = "2.0"
}

resource "aws_apigatewayv2_route" "route" {
  for_each = var.routes

  api_id    = var.api.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.integration[each.key].id}"
}

resource "aws_lambda_permission" "lambda_permission" {
  for_each = var.routes

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = each.value.lambda_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api.execution_arn}/*/*"
}
