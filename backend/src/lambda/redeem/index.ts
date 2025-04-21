// Lambda for handling card related operations
"use strict"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { redeem } from "src/dynamo"
import {
  createLambdaError,
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
  validateRequiredPathParameters,
} from "src/lambda/helpers"

const REQUIRED_PATH_PARAMETERS = ["cardId"] as const

export async function handler({
  pathParameters,
  queryStringParameters,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!pathParameters) {
    return lambdaResponseToAPIGatewayProxyResult(
      createLambdaError(
        `Path parameters are required: ${REQUIRED_PATH_PARAMETERS.join(", ")}`,
      ),
    )
  }

  const { valid: params, invalid: invalidParams } =
    validateRequiredPathParameters(pathParameters, REQUIRED_PATH_PARAMETERS)

  // Need to improve this error message.
  if (invalidParams.length > 0) {
    return lambdaResponseToAPIGatewayProxyResult(
      createLambdaError(`Invalid path parameters: ${invalidParams.join(", ")}`),
    )
  }

  // Simplify validation of query parameters later.
  if (!queryStringParameters?.coffeeCount) {
    return lambdaResponseToAPIGatewayProxyResult(
      createLambdaError(`Coffee count is required as a query parameter`),
    )
  }

  const coffeeCount = parseInt(queryStringParameters.coffeeCount)
  if (isNaN(coffeeCount) || coffeeCount <= 0) {
    return lambdaResponseToAPIGatewayProxyResult(
      createLambdaError(
        `Invalid query parameter: coffeeCount must be a non-negative integer`,
      ),
    )
  }

  return lambdaResponseToAPIGatewayProxyResult(
    await promiseToLambdaResponse(async () =>
      redeem(params.cardId, coffeeCount),
    ),
  )
}
