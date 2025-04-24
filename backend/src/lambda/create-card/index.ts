// Lambda for handling card related operations
"use strict"
import { toLoyaltyCardDto } from "@coffee-card/shared"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { createNewCardForStore } from "../../dynamo"
import {
  createLambdaError,
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
  validateParameters,
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
        toLoyaltyCardDto(await createNewCardForStore(pathParams.storeId)),
      ),
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(createLambdaError(`${error}`))
  }
}
