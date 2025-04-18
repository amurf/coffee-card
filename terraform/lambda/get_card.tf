resource "aws_lambda_function" "get_card" {
  function_name = "get-card"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  s3_bucket     = aws_s3_bucket.lambda_deploy_bucket.bucket
  s3_key        = aws_s3_object.lambda_default_code.key
}

output "lambda_get_card_arn" {
  value = aws_lambda_function.get_card.arn
}

output "lambda_get_card_invoke_arn" {
  value = aws_lambda_function.get_card.invoke_arn
}
