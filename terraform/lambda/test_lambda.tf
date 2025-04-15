resource "aws_lambda_function" "test" {
  function_name = "test"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  s3_bucket     = aws_s3_bucket.lambda_deploy_bucket.bucket
  s3_key        = aws_s3_object.lambda_default_code.key
}

output "lambda_test_arn" {
  value = aws_lambda_function.test.arn
}
