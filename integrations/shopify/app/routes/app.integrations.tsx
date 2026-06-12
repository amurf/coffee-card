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
  Button,
  Banner,
} from "@shopify/polaris"
import { TitleBar } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"
import {
  getStoreByName,
  updateStoreProfile,
} from "@coffee-card/backend"
import { toStoreProfileDto, type StoreProfileDto } from "@coffee-card/shared"

type LoaderData = {
  store: StoreProfileDto
  shop: string
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
    shop,
  })
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop.split(".")[0]

  const formData = await request.formData()
  const posType = formData.get("posType") as string

  try {
    const existing = await getStoreByName(shop)
    if (!existing) {
      return json({ error: "Store not found" }, { status: 404 })
    }

    const updatedConfig = {
      ...existing.posConfig,
      shopifyShop: `${shop}.myshopify.com`,
    }

    await updateStoreProfile({
      ...existing,
      posType: posType as any,
      posConfig: updatedConfig,
    })

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

  const posOptions = [
    { label: "Shopify POS", value: "SHOPIFY" },
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
