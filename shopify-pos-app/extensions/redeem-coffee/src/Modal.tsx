import React, { useEffect, useState } from "react"

import {
  Text,
  Screen,
  ScrollView,
  Navigator,
  reactExtension,
} from "@shopify/ui-extensions-react/point-of-sale"

// Proof of concept to ensure it can call the API and get a response
// Will create an API client in the shared package so we aren't duplicating this in FE + POS
import { LoyaltyCard } from "@coffee-card/shared"

const Modal = () => {
  const [card, setCard] = useState<LoyaltyCard | null>(null)
  const [loading, setLoading] = useState(true)

  const cardId = "2fa5fe9b-14b6-43d2-9d42-10d91e2592f0"
  const apiBaseUrl =
    "https://rstij0f9ll.execute-api.ap-southeast-2.amazonaws.com/dev"
  const apiUrl = `${apiBaseUrl}/cards/${cardId}`
  const fetchData = async (): Promise<LoyaltyCard> => {
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error("Network response was not ok")
    }
    return response.json()
  }

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const cardData = await fetchData()
        setCard(cardData)
      } catch (error) {
        console.error("Error fetching card:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCard()
  }, [])

  // const card = await getCardById("2fa5fe9b-14b6-43d2-9d42-10d91e2592f0")
  return (
    <Navigator>
      <Screen name="HelloWorld" title="Hello World!">
        <ScrollView>
          {loading ? (
            <Text>Loading...</Text>
          ) : !card ? (
            <Text>Card not found</Text>
          ) : (
            <Text>Card ID: {card.cardId}</Text>
          )}
        </ScrollView>
      </Screen>
    </Navigator>
  )
}

export default reactExtension("pos.home.modal.render", () => <Modal />)
