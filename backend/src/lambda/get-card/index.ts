// Lambda for handling card related operations
"use strict"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getCard } from "src/dynamo"

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const cardId = event.pathParameters?.cardId

  if (!cardId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Card ID is required",
      }),
    }
  }

  const card = await getCard(cardId)
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
