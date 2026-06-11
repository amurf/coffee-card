import { LoyaltyCardModel } from "@coffee-card/shared"
import { QueryCommand, UpdateCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb"
import { TABLE_NAME, TABLE_INDEXES, docClient } from "."
import { storeNameToPK } from "./helpers"


export const getCardById = async (
  cardId: LoyaltyCardModel["cardId"],
): Promise<LoyaltyCardModel | null> => {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: TABLE_INDEXES.GET_BY_CARD_ID,
    KeyConditionExpression: "cardId = :cardId",
    ExpressionAttributeValues: {
      ":cardId": cardId,
    },
  })

  const response = await docClient.send(command)

  if (response.Items?.length) {
    return response.Items[0] as LoyaltyCardModel
  }

  return null
}

export const redeem = async (
  cardId: LoyaltyCardModel["cardId"],
  stampCount: number,
): Promise<LoyaltyCardModel | null> => {
  const card = await getCardById(cardId)
  if (!card) {
    return null
  }

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: card.PK,
      SK: card.SK,
    },
    UpdateExpression:
      "SET stampCount = stampCount + :val, totalStampsEarned = if_not_exists(totalStampsEarned, :zero) + :val",
    ExpressionAttributeValues: {
      ":val": stampCount,
      ":zero": 0,
    },
    ReturnValues: "ALL_NEW",
  })

  const response = await docClient.send(command)
  return response.Attributes as LoyaltyCardModel
}

export const awardStampsForOrder = async (
  storeName: string,
  cardId: string,
  orderId: string,
  stampsToAward: number,
): Promise<{
  success: boolean
  alreadyProcessed?: boolean
  updatedCard?: LoyaltyCardModel
}> => {
  const card = await getCardById(cardId)
  if (!card) {
    return { success: false }
  }

  const storePK = storeNameToPK(storeName)
  const orderSK = `PROCESSED_ORDER#${orderId}`

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                PK: storePK,
                SK: orderSK,
                EntityType: "ProcessedOrder",
                cardId,
                stampsAwarded: stampsToAward,
                createdAt: new Date().toISOString(),
              },
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            Update: {
              TableName: TABLE_NAME,
              Key: {
                PK: card.PK,
                SK: card.SK,
              },
              UpdateExpression:
                "SET stampCount = stampCount + :val, totalStampsEarned = if_not_exists(totalStampsEarned, :zero) + :val",
              ExpressionAttributeValues: {
                ":val": stampsToAward,
                ":zero": 0,
              },
            },
          },
        ],
      }),
    )

    const updatedCard = await getCardById(cardId)
    return {
      success: true,
      updatedCard: updatedCard || undefined,
    }
  } catch (err: any) {
    if (err.name === "TransactionCanceledException") {
      const reasons = err.CancellationReasons
      if (reasons && reasons[0]?.Code === "ConditionalCheckFailed") {
        console.warn(
          `Order ${orderId} was already processed for store ${storeName}. Skipping.`,
        )
        return { success: false, alreadyProcessed: true }
      }
    }
    throw err
  }
}


