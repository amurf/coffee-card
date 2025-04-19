// Lambda for handling card related operations
"use strict"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getCardById } from "src/dynamo"

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  // TODO: make this handle more http methods / endpoints.
  const cardId = event.pathParameters?.cardId

  if (!cardId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Card ID is required",
      }),
    }
  }

  const card = await getCardById(cardId)
  if (!card) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Card not found",
      }),
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(card),
  }
}
