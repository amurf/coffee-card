import {
  CommitBodySchema,
} from "@coffee-card/shared"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { commitRedemption } from "../../dynamo"
import {
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
} from "../helpers"
import { validateBody, handleErrors } from "../error"

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = validateBody(event.body, CommitBodySchema)

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () => {
        const success = await commitRedemption(body.redemptionToken)
        if (!success) {
          throw new Error("Invalid or expired redemption token")
        }
        return { success: true }
      })
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(handleErrors(error))
  }
}
