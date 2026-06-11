import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getCardById, getStoreByName, createPendingRedemption, commitRedemption } from "../../dynamo"
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
    const { milestoneId } = body

    if (!milestoneId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Milestone ID is required" }),
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

        // 1. Create a pending redemption
        const pending = await createPendingRedemption(cardId, milestoneId)
        if (!pending) {
          throw new Error("Milestone claim prerequisites failed (insufficient stamps or already claimed)")
        }

        // 2. Instantly commit it (since cashier is physically claiming it at register)
        const success = await commitRedemption(pending.token)
        if (!success) {
          throw new Error("Failed to commit reward redemption")
        }

        // 3. Return the updated card details
        const updatedCard = await getCardById(cardId)
        return updatedCard
      })
    )
  } catch (error) {
    return lambdaResponseToAPIGatewayProxyResult(handleErrors(error))
  }
}
