import { LambdaResponseError } from "@coffee-card/shared"
import { APIGatewayProxyEventPathParameters } from "aws-lambda"
import type { infer as ZodInfer, ZodType, ZodTypeAny } from "zod"

export function validateParameters<TSchema extends ZodTypeAny>(
  parameters: APIGatewayProxyEventPathParameters | null,
  schema: TSchema,
): ZodInfer<TSchema> {
  const result = validateSchema(parameters, schema)
  if (!result.valid) {
    throw new ValidationError("Validation error", result.error)
  }

  return result.data
}

export const validateSchema = <T>(
  parameters: APIGatewayProxyEventPathParameters | null,
  schema: ZodType<T>,
): SchemaValidationResult<T> => {
  const result = schema.safeParse(parameters ?? {}) // fallback to empty object so zod gives a better error message
  if (result.success) {
    return { valid: true, data: result.data }
  }

  const error = result.error.issues.map((issue) => {
    const path = issue.path.join(".") // To handle nested fields (e.g., "user.name")
    return `${path}: ${issue.message}`
  })

  return { valid: false, error }
}

export function handleErrors(error: unknown): LambdaResponseError {
  if (error instanceof ValidationError) {
    return createLambdaError(error.message, error.issues)
  } else if (error instanceof Error) {
    return createLambdaError("Internal server error", [error.message], 500)
  }

  return createLambdaError(
    "Unknown error occurred: " + JSON.stringify(error),
    [],
    500,
  )
}

export class ValidationError extends Error {
  public issues: string[]
  constructor(message: string, issues: string[]) {
    super(message)
    this.issues = issues
    Object.setPrototypeOf(this, ValidationError.prototype) // Restore prototype chain
  }
}

export function createLambdaError(
  message: string,
  error: string[] = [],
  statusCode = 400,
): LambdaResponseError {
  return {
    statusCode,
    body: {
      message,
      error,
    },
  }
}

interface ValidSchema<T> {
  valid: true
  data: T
}
interface InvalidSchema {
  valid: false
  error: string[]
}

type SchemaValidationResult<T> = ValidSchema<T> | InvalidSchema
