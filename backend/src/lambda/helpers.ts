import { LambdaResponse, LambdaResponseError } from "@coffee-card/shared"
import {
  APIGatewayProxyEventPathParameters,
  APIGatewayProxyResult,
} from "aws-lambda"

export function validateRequiredPathParameters<T extends readonly string[]>(
  pathParameters: APIGatewayProxyEventPathParameters,
  parameters: T,
): { valid: Record<T[number], string>; invalid: string[] } {
  return parameters.reduce(
    (acc, parameter) => {
      const value = pathParameters[parameter]
      if (value) {
        acc.valid[parameter as T[number]] = value
      } else {
        acc.invalid.push(parameter)
      }
      return acc
    },
    {
      valid: {} as Record<T[number], string>,
      invalid: [] as string[],
    },
  )
}

export async function promiseToLambdaResponse<T>(
  getItem: () => Promise<T>,
): Promise<LambdaResponse<T>> {
  const item = await getItem()
  if (!item) {
    return createLambdaError("Item not found", 404)
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

export function createLambdaError(
  message: string,
  statusCode = 400,
): LambdaResponseError {
  return {
    statusCode,
    body: {
      message,
    },
  }
}
