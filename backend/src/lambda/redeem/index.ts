// Lambda for handling card related operations
"use strict"
import {
  RedeemParamsSchema,
  RedeemQueryParamsSchema,
  toLoyaltyCardDto,
} from "@coffee-card/shared"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { redeem } from "../../dynamo"
import {
  asDto,
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
} from "../helpers"
import { validateParameters, handleErrors } from "../error"

export async function handler({
  pathParameters,
  queryStringParameters,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const pathParams = validateParameters(pathParameters, RedeemParamsSchema)
    const queryParams = validateParameters(
      queryStringParameters,
      RedeemQueryParamsSchema,
    )

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () =>
        asDto(
          toLoyaltyCardDto,
          await redeem(pathParams.cardId, queryParams.coffeeCount),
        ),
      ),
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(handleErrors(error))
  }
}
