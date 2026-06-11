import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getCardById, getStoreByName } from "../../dynamo"
import * as jose from "jose"
import { promiseToLambdaResponse, lambdaResponseToAPIGatewayProxyResult } from "../helpers"
import { handleErrors } from "../error"

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {}
    const { token } = body

    if (!token) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Token is required" }),
      }
    }

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () => {
        const qrSecret = process.env.QR_SECRET
        if (!qrSecret) {
          throw new Error("QR_SECRET environment variable is not configured")
        }
        const secret = new TextEncoder().encode(qrSecret)

        let cardId: string
        try {
          const { payload: qrPayload } = await jose.jwtVerify(token, secret)
          cardId = qrPayload.cardId as string
        } catch (e) {
          throw new Error("Scan code expired or invalid. Please scan a live QR code.")
        }

        const card = await getCardById(cardId)
        if (!card) {
          throw new Error("Card not found")
        }

        const store = await getStoreByName(card.storeName)
        if (!store) {
          throw new Error("Store not found")
        }

        return { card, store }
      })
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(handleErrors(error))
  }
}
