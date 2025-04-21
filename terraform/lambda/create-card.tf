resource "aws_lambda_function" "create_card" {
  function_name = "create-card"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  s3_bucket     = aws_s3_bucket.lambda_deploy_bucket.bucket
  s3_key        = aws_s3_object.lambda_default_code.key
}

output "create_card_arn" {
  value = aws_lambda_function.create_card.arn
}

output "create_card_invoke_arn" {
  value = aws_lambda_function.create_card.invoke_arn
}
