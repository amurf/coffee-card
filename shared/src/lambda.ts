export interface LambdaResponseError {
  statusCode: number
  body: {
    message: string
    error?: string[]
  }
}

export interface LambdaResponseSuccess<T> {
  statusCode: 200 | 201 | 204
  body: T
}

export type LambdaResponse<T> = LambdaResponseSuccess<T> | LambdaResponseError
