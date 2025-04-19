resource "aws_lambda_function" "store" {
  function_name = "store"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  s3_bucket     = aws_s3_bucket.lambda_deploy_bucket.bucket
  s3_key        = aws_s3_object.lambda_default_code.key
}

output "store_arn" {
  value = aws_lambda_function.store.arn
}

output "store_invoke_arn" {
  value = aws_lambda_function.store.invoke_arn
}
