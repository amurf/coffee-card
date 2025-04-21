// Lambda for handling card related operations
"use strict"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { redeem } from "src/dynamo"
import {
  createLambdaError,
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
  validateParameters,
} from "src/lambda/helpers"

const REQUIRED_PATH_PARAMETERS = ["cardId"] as const
const REQUIRED_QUERY_PARAMETERS = ["coffeeCount"] as const

export async function handler({
  pathParameters,
  queryStringParameters,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const pathParams = validateParameters(
      pathParameters,
      REQUIRED_PATH_PARAMETERS,
    )

    const queryParams = validateParameters(
      queryStringParameters,
      REQUIRED_QUERY_PARAMETERS,
    )

    const coffeeCount = parseInt(queryParams.coffeeCount)
    if (isNaN(coffeeCount) || coffeeCount <= 0) {
      return lambdaResponseToAPIGatewayProxyResult(
        createLambdaError(
          `Invalid query parameter: coffeeCount must be a non-negative integer`,
        ),
      )
    }

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () =>
        redeem(pathParams.cardId, coffeeCount),
      ),
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(createLambdaError(`${error}`))
  }
}
