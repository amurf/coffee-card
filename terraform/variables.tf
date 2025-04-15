variable "lambda_deploy_bucket" {
  description = "S3 bucket for deploying lambda code"
  type        = string
  default     = "coffee-card-lambda-deploy-bucket"
}
