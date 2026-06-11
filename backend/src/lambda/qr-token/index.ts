import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getCardById } from "../../dynamo"
import * as jose from "jose"
import {
  promiseToLambdaResponse,
  lambdaResponseToAPIGatewayProxyResult,
} from "../helpers"
import { validateParameters, handleErrors } from "../error"
import { GetLoyaltyCardParamsSchema } from "@coffee-card/shared"

const QR_SECRET = process.env.QR_SECRET
if (!QR_SECRET) {
  throw new Error("QR_SECRET environment variable is not configured")
}

export async function handler({
  pathParameters,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const params = validateParameters(
      pathParameters,
      GetLoyaltyCardParamsSchema,
    )

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () => {
        const card = await getCardById(params.cardId)
        if (!card) {
          throw new Error("Card not found")
        }

        const secret = new TextEncoder().encode(QR_SECRET)
        const exp = Math.floor(Date.now() / 1000) + 60 // 60 seconds expiry

        const qrToken = await new jose.SignJWT({ cardId: card.cardId })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime(exp)
          .sign(secret)

        return {
          qrToken,
          expiresAt: exp,
        }
      }),
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(handleErrors(error))
  }
}
