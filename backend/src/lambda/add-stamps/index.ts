import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getCardById, getStoreByName, redeem } from "../../dynamo"
import { promiseToLambdaResponse, lambdaResponseToAPIGatewayProxyResult } from "../helpers"
import { handleErrors } from "../error"

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const cardId = event.pathParameters?.cardId
    if (!cardId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Card ID is required" }),
      }
    }

    const authHeader = event.headers.Authorization || event.headers.authorization || ""
    const passcode = authHeader.replace(/^Bearer\s+/i, "").trim()

    if (!passcode) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Store passcode is required" }),
      }
    }

    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {}
    const stamps = parseInt(body.stamps, 10)

    if (isNaN(stamps) || stamps <= 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid stamps count" }),
      }
    }

    return lambdaResponseToAPIGatewayProxyResult(
      await promiseToLambdaResponse(async () => {
        const card = await getCardById(cardId)
        if (!card) {
          throw new Error("Card not found")
        }

        const store = await getStoreByName(card.storeName)
        if (!store) {
          throw new Error("Store profile not found")
        }

        const expectedPasscode = store.merchantPasscode || "1234"
        if (passcode !== expectedPasscode) {
          throw new Error("Unauthorized: Invalid store passcode")
        }

        const updatedCard = await redeem(cardId, stamps)
        if (!updatedCard) {
          throw new Error("Failed to add stamps")
        }

        return updatedCard
      })
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(handleErrors(error))
  }
}
