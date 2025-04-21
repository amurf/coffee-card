terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.94.1"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region  = "ap-southeast-2"
}

module "iam" {
  source = "./iam"
}

module "dynamodb" {
  source = "./dynamodb"
}

module "lambda" {
  source = "./lambda"
  lambda_deploy_bucket = var.lambda_deploy_bucket
  dynamodb_module = module.dynamodb
}

module "api-gateway" {
  source = "./api-gateway"
  lambda = module.lambda
}

# Uncomment this block to deploy CloudFront + S3 in prod
# module "web_frontend_prod" {
#   source = "./web_frontend"
# }
