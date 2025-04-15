resource "aws_lambda_function" "test_lambda" {
  function_name = "test_lambda"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  s3_bucket     = aws_s3_bucket.lambda_deploy_bucket.bucket
  s3_key        = aws_s3_object.default_lambda_code.key
}

output "test_lambda_arn" {
  value = aws_lambda_function.test_lambda.arn
}
