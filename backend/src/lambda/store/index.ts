// Lambda for handling card related operations
"use strict"
import { GetStoreParamsSchema, toStoreProfileDto } from "@coffee-card/shared"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getStoreByName } from "../../dynamo"
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
    const pathParams = validateParameters(pathParameters, GetStoreParamsSchema)

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () =>
        asDto(toStoreProfileDto, await getStoreByName(pathParams.storeId)),
      ),
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(handleErrors(error))
  }
}
