// Lambda for handling card related operations
"use strict"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import {
  toLoyaltyCardDto,
  GetLoyaltyCardParamsSchema,
} from "@coffee-card/shared"
import { getCardById } from "../../dynamo"
import {
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
  asDto,
} from "../helpers"
import { validateParameters, handleErrors } from "../error"

export async function handler({
  pathParameters,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const params = validateParameters(
      pathParameters,
      GetLoyaltyCardParamsSchema,
    )

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () =>
        asDto(toLoyaltyCardDto, await getCardById(params.cardId)),
      ),
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(handleErrors(error))
  }
}
