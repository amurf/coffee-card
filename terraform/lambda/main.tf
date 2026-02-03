resource "aws_s3_bucket" "lambda_deploy_bucket" {
  bucket = var.lambda_deploy_bucket
}

resource "aws_s3_object" "lambda_default_code" {
  bucket = aws_s3_bucket.lambda_deploy_bucket.bucket
  key    = var.lambda_key
  source = var.lambda_file_default
  acl    = "private"
}

resource "aws_iam_role" "lambda_read_role" {
  name = "lambda_read_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Effect = "Allow"
      },
    ]
  })
}

resource "aws_iam_role" "lambda_write_role" {
  name = "lambda_write_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Effect = "Allow"
      },
    ]
  })
}

resource "aws_iam_policy" "lambda_read_policy" {
  name        = "lambda_read_policy"
  description = "Policy for read-only access to DynamoDB"
  policy      = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
        ]
        Effect = "Allow",
        Resource = [
          var.dynamodb_module.coffee_card_data_table_arn,
          var.dynamodb_module.coffee_card_data_table_get_by_card_id_arn,
        ]
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        Effect = "Allow",
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_write_policy" {
  name        = "lambda_write_policy"
  description = "Policy for read-write access to DynamoDB (includes PutItem)"
  policy      = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
        ]
        Effect = "Allow",
        Resource = [
          var.dynamodb_module.coffee_card_data_table_arn,
          var.dynamodb_module.coffee_card_data_table_get_by_card_id_arn,
        ]
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        Effect = "Allow",
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_read_attachment" {
  role       = aws_iam_role.lambda_read_role.name
  policy_arn = aws_iam_policy.lambda_read_policy.arn
}

resource "aws_iam_role_policy_attachment" "lambda_write_attachment" {
  role       = aws_iam_role.lambda_write_role.name
  policy_arn = aws_iam_policy.lambda_write_policy.arn
}
