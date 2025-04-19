variable "lambda_deploy_bucket" {}

variable "lambda_key" {
  description = "S3 key for initial lambda code"
  type = string
  default = "hello-world.zip"
}

variable "lambda_file_default" {
  description = "The hello-world lambda, we upload this as a placeholder for initial infrastructure deployment"
  type = string
  default = "./lambda/hello-world.zip"
}
