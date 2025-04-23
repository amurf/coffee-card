import React, { useEffect, useState } from "react"

import {
  Text,
  Section,
  Screen,
  ScrollView,
  Navigator,
  reactExtension,
  useScannerDataSubscription,
  CameraScanner,
} from "@shopify/ui-extensions-react/point-of-sale"

// Proof of concept to ensure it can call the API and get a response
// Will create an API client in the shared package so we aren't duplicating this in FE + POS
import type { LoyaltyCard } from "@coffee-card/shared"
import { getCardById } from "@coffee-card/shared"
import { Card } from "@shopify/polaris"

const Loading = ({
  loading,
  children,
}: {
  loading: boolean
  children: React.ReactNode
}) => {
  return loading ? <Text>Loading...</Text> : <>{children}</>
}

const CardNotFound = () => {
  return <Text>Error loading card</Text>
}

const CardDetails = ({ card }: { card: LoyaltyCard | null }) => {
  if (!card) {
    return <CardNotFound />
  }

  return (
    <Text>
      Card ID: {card.cardId}
      {"\n"}
      Store name: {card.storeName}
    </Text>
  )
}

const Scanner = ({ onScan }: { onScan: (scannedData: string) => void }) => {
  const { data } = useScannerDataSubscription()

  useEffect(() => {
    if (data) {
      onScan(data)
    }
  }, [data, onScan])

  return <CameraScanner />
}

const Modal = () => {
  const [cardId, setCardId] = useState<string | null>(null)
  const [card, setCard] = useState<LoyaltyCard | null>(null)
  const [loading, setLoading] = useState(false)

  // const cardId = "2fa5fe9b-14b6-43d2-9d42-10d91e2592f0"

  const onScan = (cardId: string) => {
    setCardId(cardId)
    setLoading(true)

    getCardById(cardId)
      .then((cardData) => setCard(cardData))
      .catch((error) => console.error("Error fetching card:", error))
      .finally(() => setLoading(false))
  }

  // const card = await getCardById("2fa5fe9b-14b6-43d2-9d42-10d91e2592f0")
  return (
    <Navigator>
      <Screen name="HelloWorld" title="Hello World!">
        <ScrollView>
          {cardId && (
            <Section title="Card Details">
              <Loading loading={loading}>
                <CardDetails card={card} />
              </Loading>
            </Section>
          )}

          {!cardId && <Scanner onScan={onScan} />}
        </ScrollView>
      </Screen>
    </Navigator>
  )
}

export default reactExtension("pos.home.modal.render", () => <Modal />)
