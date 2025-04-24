// Lambda for handling card related operations
"use strict"
import {
  CreateCardForStoreParamsSchema,
  toLoyaltyCardDto,
} from "@coffee-card/shared"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { createNewCardForStore } from "../../dynamo"
import {
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
} from "../helpers"
import { validateParameters, handleErrors } from "../error"

export async function handler({
  pathParameters,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const pathParams = validateParameters(
      pathParameters,
      CreateCardForStoreParamsSchema,
    )

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () =>
        toLoyaltyCardDto(await createNewCardForStore(pathParams.storeId)),
      ),
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(handleErrors(error))
  }
}
