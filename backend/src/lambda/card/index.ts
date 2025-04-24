// Lambda for handling card related operations
"use strict"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { toLoyaltyCardDto } from "@coffee-card/shared"
import { getCardById } from "../../dynamo"
import {
  createLambdaError,
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
  validateParameters,
  asDto,
} from "../helpers"

const REQUIRED_PATH_PARAMETERS = ["cardId"] as const

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
        asDto(toLoyaltyCardDto, await getCardById(pathParams.cardId)),
      ),
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(createLambdaError(`${error}`))
  }
}
