// Lambda for handling card related operations
"use strict"
import { toStoreProfileDto } from "@coffee-card/shared"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getStoreByName } from "../../dynamo"
import {
  createLambdaError,
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
  validateParameters,
  asDto,
} from "../helpers"

const REQUIRED_PATH_PARAMETERS = ["storeId"] as const

export async function handler({
  pathParameters,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const pathParams = validateParameters(
      pathParameters,
      REQUIRED_PATH_PARAMETERS,
    )

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () =>
        asDto(toStoreProfileDto, await getStoreByName(pathParams.storeId)),
      ),
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(createLambdaError(`${error}`))
  }
}
