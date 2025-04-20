// Lambda for handling card related operations
"use strict"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getStoreByName } from "src/dynamo"
import {
  createLambdaError,
  fetchItemAsLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
  validateRequiredPathParameters,
} from "src/lambda/helpers"

const REQUIRED_PATH_PARAMETERS = ["storeName"] as const

export async function handler({
  pathParameters,
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

  if (invalidParams.length > 0) {
    return lambdaResponseToAPIGatewayProxyResult(
      createLambdaError(`Invalid path parameters: ${invalidParams.join(", ")}`),
    )
  }

  return lambdaResponseToAPIGatewayProxyResult(
    await fetchItemAsLambdaResponse(async () =>
      getStoreByName(params.storeName),
    ),
  )
}
