data "aws_iam_policy_document" "create_logs" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]

    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_policy" "create_logs" {
  name        = "create_logs"
  description = "IAM policy to allow Lambda function to create logs in CloudWatch"

  policy = data.aws_iam_policy_document.create_logs.json
}
