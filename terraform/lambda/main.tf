resource "aws_s3_bucket" "lambda_deploy_bucket" {
  bucket = var.lambda_deploy_bucket
}

resource "aws_s3_object" "lambda_default_code" {
  bucket = aws_s3_bucket.lambda_deploy_bucket.bucket
  key    = var.lambda_key
  source = var.lambda_file_default
  acl    = "private"
}

resource "aws_iam_role" "lambda_execution_role" {
  name = "lambda_execution_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Effect = "Allow"
        Sid    = ""
      },
    ]
  })
}
resource "aws_iam_policy" "dynamodb_query_policy" {
  name        = "dynamodb_query_policy"
  description = "Policy to allow DynamoDB Query action on all tables"
  policy      = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "dynamodb:Query",
        Effect = "Allow",
        Resource = "arn:aws:dynamodb:*:*:table/*"
      }
    ]
  })
}

# Attach the policy to the Lambda execution role
resource "aws_iam_role_policy_attachment" "lambda_dynamodb_query_attachment" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.dynamodb_query_policy.arn
}
