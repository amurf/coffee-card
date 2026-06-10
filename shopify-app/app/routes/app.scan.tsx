import { useState, useEffect, useRef } from "react"
import { type ActionFunctionArgs, json } from "@remix-run/node"
import { useActionData, useSubmit, useNavigation } from "@remix-run/react"
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Button,
  Tabs,
  Text,
  Banner,
  InlineStack,
  Divider,
  Badge,
  Grid,
} from "@shopify/polaris"
import { TitleBar } from "@shopify/app-bridge-react"
import { Html5QrcodeScanner } from "html5-qrcode"
import {
  getCardById,
  getStoreByName,
  redeem,
  createPendingRedemption,
  commitRedemption,
} from "@coffee-card/backend"
import { LoyaltyCardModel, StoreProfileModel } from "@coffee-card/shared"

type ActionData = {
  status?: string
  error?: string
  card?: LoyaltyCardModel
  store?: StoreProfileModel
}

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request)
  const formData = await request.formData()
  const cardId = formData.get("cardId") as string
  const actionType = formData.get("_action") as string

  if (!cardId) {
    return json<ActionData>({ error: "Card ID is required" }, { status: 400 })
  }

  try {
    if (actionType === "add_stamps") {
      const stampsToAdd = parseInt(formData.get("stamps") as string, 10)
      if (!isNaN(stampsToAdd) && stampsToAdd > 0) {
        await redeem(cardId, stampsToAdd)
      }
    } else if (actionType === "claim_reward") {
      const milestoneId = formData.get("milestoneId") as string
      const pending = await createPendingRedemption(cardId, milestoneId)
      if (pending) {
        await commitRedemption(pending.token)
      } else {
        return json<ActionData>(
          {
            error:
              "Unable to claim milestone. Not enough stamps or already claimed.",
          },
          { status: 400 },
        )
      }
    }

    // Always fetch latest state
    const card = await getCardById(cardId)
    if (!card) {
      return json<ActionData>(
        { error: "Card not found in database" },
        { status: 404 },
      )
    }
    const store = await getStoreByName(card.storeName)
    if (!store) {
      return json<ActionData>(
        { error: "Store details not found" },
        { status: 404 },
      )
    }

    return json<ActionData>({ status: "success", card, store })
  } catch (err: any) {
    return json<ActionData>({ error: err.message }, { status: 500 })
  }
}

export default function ScanPage() {
  const [selectedTab, setSelectedTab] = useState(0)
  const [manualId, setManualId] = useState("")
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("1")
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  const navigation = useNavigation()
  const actionData = useActionData<ActionData>()
  const submit = useSubmit()

  const isSubmitting = navigation.state === "submitting"

  const tabs = [
    { id: "scan-qr", content: "Scan QR", panelID: "scan-qr-content" },
    {
      id: "manual-entry",
      content: "Manual Entry",
      panelID: "manual-entry-content",
    },
  ]

  useEffect(() => {
    // Only initialize scanner if we are on Scan tab AND we don't have a card loaded yet
    if (selectedTab === 0 && !scanResult && !actionData?.card) {
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false,
        )

        scanner.render(
          (decodedText) => {
            setScanResult(decodedText)
            scanner.clear()
            submit(
              { cardId: decodedText, _action: "lookup" },
              { method: "post" },
            )
          },
          (error) => {},
        )
        scannerRef.current = scanner
      }, 100)

      return () => {
        clearTimeout(timer)
        if (scannerRef.current) {
          try {
            scannerRef.current.clear()
          } catch (e) {}
        }
      }
    } else {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (e) {}
        scannerRef.current = null
      }
    }
  }, [selectedTab, scanResult, submit, actionData?.card])

  const handleManualSubmit = () => {
    submit({ cardId: manualId, _action: "lookup" }, { method: "post" })
  }

  const handleAddStamps = () => {
    const val = parseFloat(inputValue)
    if (isNaN(val) || val <= 0) return

    let stampsEarned = val
    const earningRule = actionData?.store?.rewardRules?.earningRule
    if (earningRule?.type === "SPEND_AMOUNT" && earningRule.amountPerStamp) {
      stampsEarned = Math.floor(val / earningRule.amountPerStamp)
    }

    if (stampsEarned > 0) {
      submit(
        {
          cardId: actionData!.card!.cardId,
          _action: "add_stamps",
          stamps: stampsEarned.toString(),
        },
        { method: "post" },
      )
      setInputValue("")
    }
  }

  const handleClaimReward = (milestoneId: string) => {
    submit(
      {
        cardId: actionData!.card!.cardId,
        _action: "claim_reward",
        milestoneId,
      },
      { method: "post" },
    )
  }

  const resetScan = () => {
    setScanResult(null)
    setManualId("")
    setInputValue("1")
    // Clear actionData by submitting empty
    submit({}, { method: "get" })
  }

  const card = actionData?.card
  const store = actionData?.store

  const earningRule = store?.rewardRules?.earningRule
  const milestones = store?.rewardRules?.milestones || []
  const sortedMilestones = [...milestones].sort(
    (a, b) => a.stampsRequired - b.stampsRequired,
  )

  return (
    <Page>
      <TitleBar title="Point of Sale" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {actionData?.error && (
              <Banner
                tone="critical"
                title="Error"
                onDismiss={() =>
                  submit(
                    { cardId: card?.cardId || "", _action: "lookup" },
                    { method: "post" },
                  )
                }
              >
                <p>{actionData.error}</p>
              </Banner>
            )}

            {!card ? (
              <Card>
                <BlockStack gap="400">
                  <Tabs
                    tabs={tabs}
                    selected={selectedTab}
                    onSelect={setSelectedTab}
                  />

                  {selectedTab === 0 && (
                    <BlockStack gap="400">
                      <div
                        id="reader"
                        style={{ width: "100%", minHeight: "300px" }}
                      ></div>
                      <Text as="p" tone="subdued" variant="bodySm">
                        Point the camera at a customer's loyalty card QR code.
                      </Text>
                    </BlockStack>
                  )}

                  {selectedTab === 1 && (
                    <BlockStack gap="400">
                      <TextField
                        label="Card ID"
                        value={manualId}
                        onChange={setManualId}
                        autoComplete="off"
                        disabled={isSubmitting}
                      />
                      <Button
                        onClick={handleManualSubmit}
                        loading={isSubmitting}
                        disabled={!manualId}
                        variant="primary"
                      >
                        Look up Card
                      </Button>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            ) : (
              <BlockStack gap="500">
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text as="h2" variant="headingLg">
                        Card Found
                      </Text>
                      <Button onClick={resetScan}>Scan Another</Button>
                    </InlineStack>
                    <Text as="p" tone="subdued">
                      ID: {card.cardId}
                    </Text>
                    <div style={{ marginTop: "1rem" }}>
                      <Text as="h1" variant="heading3xl">
                        {card.stampCount} Stamps
                      </Text>
                    </div>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Add Stamps
                    </Text>
                    <Grid>
                      <Grid.Cell
                        columnSpan={{ xs: 6, sm: 4, md: 4, lg: 8, xl: 8 }}
                      >
                        <TextField
                          label={
                            earningRule?.type === "SPEND_AMOUNT"
                              ? `Purchase Amount ($) - Earns 1 stamp per $${earningRule.amountPerStamp}`
                              : "Number of items purchased"
                          }
                          value={inputValue}
                          onChange={setInputValue}
                          type="number"
                          min={1}
                          autoComplete="off"
                        />
                      </Grid.Cell>
                      <Grid.Cell
                        columnSpan={{ xs: 6, sm: 2, md: 2, lg: 4, xl: 4 }}
                      >
                        <div style={{ marginTop: "24px" }}>
                          <Button
                            onClick={handleAddStamps}
                            loading={isSubmitting}
                            variant="primary"
                            fullWidth
                          >
                            Grant Stamps
                          </Button>
                        </div>
                      </Grid.Cell>
                    </Grid>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Available Perks
                    </Text>
                    {sortedMilestones.length === 0 ? (
                      <Text as="p" tone="subdued">
                        No rewards configured for this store.
                      </Text>
                    ) : (
                      <BlockStack gap="300">
                        {sortedMilestones.map((milestone) => {
                          const isClaimed = card.redeemedMilestones?.includes(
                            milestone.id,
                          )
                          const isLocked =
                            card.stampCount < milestone.stampsRequired

                          return (
                            <div key={milestone.id}>
                              <InlineStack
                                align="space-between"
                                blockAlign="center"
                              >
                                <BlockStack gap="100">
                                  <InlineStack gap="200" blockAlign="center">
                                    <Text
                                      as="span"
                                      variant="bodyLg"
                                      fontWeight="bold"
                                    >
                                      {milestone.stampsRequired} Stamps
                                    </Text>
                                    {isClaimed ? (
                                      <Badge tone="success">Claimed</Badge>
                                    ) : isLocked ? (
                                      <Badge tone="info">Locked</Badge>
                                    ) : null}
                                  </InlineStack>
                                  <Text as="p">{milestone.description}</Text>
                                </BlockStack>

                                <Button
                                  onClick={() =>
                                    handleClaimReward(milestone.id)
                                  }
                                  disabled={isClaimed || isLocked}
                                  variant={
                                    !isClaimed && !isLocked
                                      ? "primary"
                                      : undefined
                                  }
                                  loading={isSubmitting}
                                >
                                  {isClaimed ? "Already Claimed" : "Claim"}
                                </Button>
                              </InlineStack>
                              <div
                                style={{
                                  marginTop: "1rem",
                                  marginBottom: "1rem",
                                }}
                              >
                                <Divider />
                              </div>
                            </div>
                          )
                        })}
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>
              </BlockStack>
            )}
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  )
}
