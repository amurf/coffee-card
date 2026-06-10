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
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop.split(".")[0]

  const store = await getStoreByName(shop)
  if (!store) {
    throw new Response("Store not found", { status: 404 })
  }

  return json<LoaderData>({
    store: toStoreProfileDto(store),
  })
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop.split(".")[0]

  const formData = await request.formData()
  const posType = formData.get("posType") as string
  const squareLocationId = formData.get("squareLocationId") as string
  const squareAccessToken = formData.get("squareAccessToken") as string

  try {
    const existing = await getStoreByName(shop)
    if (!existing) {
      return json({ error: "Store not found" }, { status: 404 })
    }

    const updatedConfig = {
      ...existing.posConfig,
      shopifyShop: `${shop}.myshopify.com`,
      ...(posType === "SQUARE" ? { squareLocationId, squareAccessToken } : {}),
    }

    await updateStoreProfile({
      ...existing,
      posType: posType as any,
      posConfig: updatedConfig,
    })

    // If Square is selected, sync the location mapping
    if (posType === "SQUARE" && squareLocationId && squareAccessToken) {
      await linkStoreToSquare(shop, squareLocationId, squareAccessToken)
    }

    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 })
  }
}

export default function IntegrationsPage() {
  const { store } = useLoaderData<typeof loader>()
  const nav = useNavigation()
  const isSaving = nav.state === "submitting"

  const [posType, setPosType] = useState(store.posType || "SHOPIFY")
  const [squareLocationId, setSquareLocationId] = useState(
    store.posConfig?.squareLocationId || "",
  )
  const [squareAccessToken, setSquareAccessToken] = useState(
    store.posConfig?.squareAccessToken || "",
  )

  const posOptions = [
    { label: "Shopify POS", value: "SHOPIFY" },
    { label: "Square POS", value: "SQUARE" },
    { label: "None (Standalone)", value: "NONE" },
  ]

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
                      <TextField
                        label="Square Location ID"
                        value={squareLocationId}
                        onChange={setSquareLocationId}
                        name="squareLocationId"
                        autoComplete="off"
                        helpText="Retrieve this from your Square Developer Console under Locations."
                      />
                      {/* 
                        TODO: For production distribution on the Square App Marketplace, 
                        replace this manual Personal Access Token input with an OAuth 2.0 
                        onboarding flow ("Connect with Square" button) to obtain and rotate 
                        access/refresh tokens automatically.
                      */}
                      <TextField
                        label="Square Personal Access Token"
                        value={squareAccessToken}
                        onChange={setSquareAccessToken}
                        name="squareAccessToken"
                        type="password"
                        autoComplete="off"
                        helpText="Create a Square application in your Developer Console and paste the Access Token here."
                      />
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

                  <Button submit variant="primary" loading={isSaving}>
                    Save Settings
                  </Button>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
