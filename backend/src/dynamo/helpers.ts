import { PutCommand, PutCommandOutput } from "@aws-sdk/lib-dynamodb"
import { docClient, TABLE_NAME } from "src/dynamo"

export const storeNameToPK = (storeName: string): string => {
  const trimmedStoreName = storeName.replace(/[^a-zA-Z0-9]/g, "")
  const lowerCaseStoreName = trimmedStoreName.toLocaleLowerCase()

  return `STORE#${lowerCaseStoreName}`
}

export const cardIdToSK = (cardId: string): string => {
  return `CARD#${cardId}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const insertData = async <T extends Record<string, any>>(
  data: T,
): Promise<T> => {
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: data,
  })

  try {
    await docClient.send(command)
  } catch (error) {
    throw new Error("Failed to insert data: " + JSON.stringify(error))
  }

  return data
}
