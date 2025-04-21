import { LambdaResponse, LambdaResponseError } from "@coffee-card/shared"
import {
  APIGatewayProxyEventPathParameters,
  APIGatewayProxyEventQueryStringParameters,
  APIGatewayProxyResult,
} from "aws-lambda"

export function validateParameters<T extends readonly string[]>(
  parameters:
    | APIGatewayProxyEventPathParameters
    | APIGatewayProxyEventQueryStringParameters
    | null,
  requiredParameters: T,
): Record<T[number], string> {
  if (!parameters) {
    throw new Error(`Parameters are required: ${requiredParameters.join(", ")}`)
  }

  const { valid, invalid } = validateRequiredParameters(
    parameters,
    requiredParameters,
  )
  if (invalid.length > 0) {
    throw new Error(`Invalid parameters: ${invalid.join(", ")}`)
  }

  return valid
}

export function validateRequiredParameters<T extends readonly string[]>(
  parameters:
    | APIGatewayProxyEventPathParameters
    | APIGatewayProxyEventQueryStringParameters,
  requiredParameters: T,
): { valid: Record<T[number], string>; invalid: string[] } {
  return requiredParameters.reduce(
    (acc, parameter) => {
      const value = parameters[parameter]
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
