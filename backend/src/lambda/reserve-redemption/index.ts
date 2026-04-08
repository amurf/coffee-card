import {
  ReserveBodySchema,
} from "@coffee-card/shared"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { createPendingRedemption } from "../../dynamo"
import {
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
} from "../helpers"
import { validateBody, handleErrors } from "../error"

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: Verify Authorization header (Shopify Session Token, API Key, etc.)
    const authHeader = event.headers.Authorization || event.headers.authorization;
    // if (!authHeader) throw new Error("Unauthorized");

    const body = validateBody(event.body, ReserveBodySchema)

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () => {
        const pending = await createPendingRedemption(body.cardId, body.milestoneId)
        if (!pending) {
          throw new Error("Insufficient stamps, milestone already redeemed, or card not found")
        }
        return {
          redemptionToken: pending.token,
          expiresAt: pending.expiresAt,
        }
      })
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(handleErrors(error))
  }
}
