variable "api" {
  description = "The API Gateway"
  type        = object({
    id                  = string
    execution_arn       = string
  })
}

variable "routes" {
  description = "A map of route keys to Lambda ARNs"
  type = map(object({
    lambda_arn        = string
    lambda_invoke_arn = string
  }))
}
