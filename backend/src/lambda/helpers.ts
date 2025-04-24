import { LambdaResponse, LambdaResponseError } from "@coffee-card/shared"
import {
  APIGatewayProxyEventPathParameters,
  APIGatewayProxyResult,
} from "aws-lambda"
import { createLambdaError } from "./error"

export async function promiseToLambdaResponse<T>(
  getItem: () => Promise<T>,
): Promise<LambdaResponse<T>> {
  const item = await getItem()
  if (!item) {
    return createLambdaError("Item not found", [], 404)
  }

  return {
    statusCode: 200,
    body: item,
  }
}

export async function lambdaResponseToAPIGatewayProxyResult<T>(
  response: LambdaResponse<T>,
): Promise<APIGatewayProxyResult> {
  return {
    ...response,
    body: JSON.stringify(response.body),
    headers: {
      "Content-Type": "application/json",
    },
    isBase64Encoded: false,
  }

  return {
    statusCode: response.statusCode,
    body: JSON.stringify(response.body),
  }
}

export function asDto<T, Y>(
  mappingFn: (value: T) => Y,
  value: T | null | undefined,
): Y | null {
  if (!value) {
    return null
  }

  return mappingFn(value)
}
