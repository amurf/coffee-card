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
  useApi,
  Button,
} from "@shopify/ui-extensions-react/point-of-sale"

import type { LoyaltyCardDto } from "@coffee-card/shared"
import {
  getCardById,
  reserveRedemption,
  configureApi,
} from "@coffee-card/shared"

const apiUrl = process.env.VITE_API_URL
if (apiUrl) {
  configureApi(apiUrl)
} else {
  console.error("VITE_API_URL is not defined")
}

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

const CardDetails = ({ card }: { card: LoyaltyCardDto | null }) => {
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
  const [card, setCard] = useState<LoyaltyCardDto | null>(null)
  const [loading, setLoading] = useState(false)

  const api = useApi()
  const getSessionToken = api.session.getSessionToken
  const cart = api.cart

  const onScan = (scannedCardId: string) => {
    setCardId(scannedCardId)
    setLoading(true)

    getCardById(scannedCardId)
      .then(async (cardData) => {
        setCard(cardData)
        await cart.addCartProperties({
          _custom_card_id: scannedCardId,
        })
      })
      .catch((error) => console.error("Error fetching card:", error))
      .finally(() => setLoading(false))
  }

  const handleRedeem = async () => {
    if (!cardId) return
    setLoading(true)
    try {
      const token = await getSessionToken()
      const res = await reserveRedemption(cardId, "m1", token)

      await cart.addCartProperties({
        _custom_redemption_token: res.redemptionToken,
      })

      setCardId(null) // Reset flow
    } catch (err) {
      console.error("Failed to reserve coffee:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    setLoading(true)
    try {
      await cart.addCartProperties({
        _custom_card_id: "",
        _custom_redemption_token: "",
      })
      setCardId(null)
      setCard(null)
    } catch (err) {
      console.error("Failed to clear cart:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Navigator>
      <Screen name="HelloWorld" title="Hello World!">
        <ScrollView>
          {cardId && (
            <Section title="Card Details">
              <Loading loading={loading}>
                <CardDetails card={card} />
                <Button title="Redeem Reward" onPress={handleRedeem} />
                <Button title="Remove Card" onPress={handleReset} />
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
