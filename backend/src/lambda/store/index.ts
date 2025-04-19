// Lambda for handling card related operations
"use strict"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { getStoreByName } from "src/dynamo"

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const storeName = event.pathParameters?.storeName

  if (!storeName) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Store name is required",
      }),
    }
  }

  const store = await getStoreByName(storeName)
  if (!store) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Store not found",
      }),
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(store),
  }
}
