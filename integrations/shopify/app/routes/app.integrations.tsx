import { useState } from "react"
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node"
import { useLoaderData, useNavigation, Form } from "@remix-run/react"
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Select,
  TextField,
  Button,
  Banner,
  InlineStack,
} from "@shopify/polaris"
import { TitleBar } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"
import {
  getStoreByName,
  updateStoreProfile,
  linkStoreToSquare,
} from "@coffee-card/backend"
import { toStoreProfileDto, type StoreProfileDto } from "@coffee-card/shared"

type LoaderData = {
  store: StoreProfileDto
  squareClientId: string
  squareRedirectUri: string
  shop: string
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop.split(".")[0]

  const store = await getStoreByName(shop)
  if (!store) {
    throw new Response("Store not found", { status: 404 })
  }

  const apiUrl = process.env.API_URL || ""
  const squareRedirectUri =
    process.env.SQUARE_REDIRECT_URI ||
    (apiUrl ? `${apiUrl}/integrations/square/callback` : "")

  return json<LoaderData>({
    store: toStoreProfileDto(store),
    squareClientId: process.env.SQUARE_CLIENT_ID || "",
    squareRedirectUri,
    shop,
  })
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop.split(".")[0]

  const formData = await request.formData()
  const posType = formData.get("posType") as string
  const squareLocationId = formData.get("squareLocationId") as string
  const squareAccessTokenInput = formData.get("squareAccessToken") as string
  const formAction = formData.get("_action") as string

  try {
    const existing = await getStoreByName(shop)
    if (!existing) {
      return json({ error: "Store not found" }, { status: 404 })
    }

    if (formAction === "disconnect_square") {
      // Clear Square credentials
      const updatedConfig = {
        ...existing.posConfig,
        squareAccessToken: "",
        squareRefreshToken: "",
        squareTokenExpiresAt: "",
        squareMerchantId: "",
      }

      await updateStoreProfile({
        ...existing,
        posConfig: updatedConfig,
      })

      return json({ success: true })
    }

    const updatedConfig = {
      ...existing.posConfig,
      shopifyShop: `${shop}.myshopify.com`,
      ...(posType === "SQUARE" ? { squareLocationId } : {}),
      // Only set access token manually if it was submitted (manual PAT fallback mode)
      ...(posType === "SQUARE" && squareAccessTokenInput
        ? { squareAccessToken: squareAccessTokenInput }
        : {}),
    }

    await updateStoreProfile({
      ...existing,
      posType: posType as any,
      posConfig: updatedConfig,
    })

    // If Square is selected and we have Location ID + access token, link it in single-table
    const activeToken = updatedConfig.squareAccessToken
    if (posType === "SQUARE" && squareLocationId && activeToken) {
      await linkStoreToSquare(shop, squareLocationId, activeToken)
    }

    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 })
  }
}

export default function IntegrationsPage() {
  const { store, squareClientId, squareRedirectUri, shop } =
    useLoaderData<typeof loader>()
  const nav = useNavigation()
  const isSaving = nav.state === "submitting"

  const [posType, setPosType] = useState(store.posType || "SHOPIFY")
  const [squareLocationId, setSquareLocationId] = useState(
    store.posConfig?.squareLocationId || "",
  )
  const [squareAccessToken, setSquareAccessToken] = useState(
    store.posConfig?.squareAccessToken || "",
  )
  const [showManual, setShowManual] = useState(!squareClientId)

  const isConnected = !!store.posConfig?.squareRefreshToken
  const hasAccessToken = !!store.posConfig?.squareAccessToken

  const posOptions = [
    { label: "Shopify POS", value: "SHOPIFY" },
    { label: "Square POS", value: "SQUARE" },
    { label: "None (Standalone)", value: "NONE" },
  ]

  const oauthBase = squareClientId.startsWith("sandbox-")
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com"

  const oauthUrl = `${oauthBase}/oauth2/authorize?client_id=${squareClientId}&scope=CUSTOMERS_WRITE+CUSTOMERS_READ+ORDERS_READ&state=${shop}&redirect_uri=${encodeURIComponent(squareRedirectUri)}`

  return (
    <Page>
      <TitleBar title="POS Integrations" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Connection Settings
              </Text>
              <Text as="p" tone="subdued">
                Select your primary Point of Sale (POS) system. This tells
                Coffee Card how to listen for customer transaction events and
                award stamps.
              </Text>

              <Form method="post">
                <BlockStack gap="400">
                  <Select
                    label="Primary POS Platform"
                    options={posOptions}
                    onChange={(val) => setPosType(val as any)}
                    value={posType}
                    name="posType"
                  />

                  {posType === "SHOPIFY" && (
                    <Banner tone="info" title="Shopify Integration Active">
                      <p>
                        Stamps will be automatically awarded via Shopify order
                        webhooks. Make sure your checkout note attributes
                        include the custom card ID.
                      </p>
                    </Banner>
                  )}

                  {posType === "SQUARE" && (
                    <BlockStack gap="400">
                      {isConnected ? (
                        <Banner tone="success" title="Square Connected">
                          <BlockStack gap="200">
                            <p>
                              Your Square account is successfully linked
                              (Merchant ID:{" "}
                              {store.posConfig?.squareMerchantId || "Connected"}
                              ).
                            </p>
                            <Button
                              submit
                              tone="critical"
                              variant="secondary"
                              name="_action"
                              value="disconnect_square"
                            >
                              Disconnect Square
                            </Button>
                          </BlockStack>
                        </Banner>
                      ) : (
                        !showManual && (
                          <Banner
                            tone="warning"
                            title="Square Authorization Required"
                          >
                            <BlockStack gap="300">
                              <p>
                                Connect your Square account to authorize Coffee
                                Card to sync customer profiles and receive completed
                                transaction webhook events.
                              </p>
                              <InlineStack gap="300">
                                <Button
                                  url={oauthUrl}
                                  variant="primary"
                                  external
                                >
                                  Connect with Square
                                </Button>
                                <Button
                                  variant="plain"
                                  onClick={() => setShowManual(true)}
                                >
                                  Or configure manually
                                </Button>
                              </InlineStack>
                            </BlockStack>
                          </Banner>
                        )
                      )}

                      {(isConnected || hasAccessToken || showManual) && (
                        <TextField
                          label="Square Location ID"
                          value={squareLocationId}
                          onChange={setSquareLocationId}
                          name="squareLocationId"
                          autoComplete="off"
                          helpText="Retrieve this from your Square Developer Console under Locations."
                        />
                      )}

                      {showManual && !isConnected && (
                        <BlockStack gap="400">
                          <TextField
                            label="Square Personal Access Token"
                            value={squareAccessToken}
                            onChange={setSquareAccessToken}
                            name="squareAccessToken"
                            type="password"
                            autoComplete="off"
                            helpText="Create a Square application in your Developer Console and paste the Access Token here."
                          />
                          {squareClientId && (
                            <Button
                              variant="plain"
                              onClick={() => setShowManual(false)}
                            >
                              Use Connect with Square instead
                            </Button>
                          )}
                        </BlockStack>
                      )}
                    </BlockStack>
                  )}

                  {posType === "NONE" && (
                    <Banner tone="warning" title="No POS Connection">
                      <p>
                        No POS is linked. Loyalty cards will behave in manual
                        standalone mode, requiring the cashier scanning app to
                        award stamps.
                      </p>
                    </Banner>
                  )}

                  {(posType !== "SQUARE" || isConnected || hasAccessToken || showManual) && (
                    <Button submit variant="primary" loading={isSaving}>
                      Save Settings
                    </Button>
                  )}
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
