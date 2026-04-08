import { type LoaderFunctionArgs, type ActionFunctionArgs, json } from "@remix-run/node"
import { useLoaderData, useNavigate, useNavigation, Form } from "@remix-run/react"
import { useState, lazy, Suspense } from "react"
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Banner,
} from "@shopify/polaris"
import { TitleBar } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"

import { getStoreByName, getStoreCards, updateStoreProfile } from "@coffee-card/backend"
import {
  type LoyaltyCardDto,
  type StoreProfileDto,
  toLoyaltyCardDto,
  toStoreProfileDto,
} from "@coffee-card/shared"

// Lazy load QRCode to bypass Vite/Remix SSR CommonJS/ESM interop mismatch
const QRCode = lazy(() => import("react-qr-code"))

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request)
// ... standard action ...
  const shop = session.shop.split(".")[0]

  const formData = await request.formData()
  const storeName = formData.get("storeName") as string

  if (storeName) {
    const existing = await getStoreByName(shop)
    if (existing) {
      await updateStoreProfile({
        ...existing,
        storeName,
      })
      return json({ success: true })
    }
  }

  return json({ success: false }, { status: 400 })
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request)

  const shop = session.shop.split(".")[0]

  const response = await admin.graphql(
    `#graphql
      query getShopDetails {
        shop {
          name
          email
          primaryDomain {
            url
          }
          billingAddress {
            city
            country
          }
          currencyCode
        }
      }
    `,
  )

  const responseJson = await response.json()

  console.log(shop)
  const shopDetails = await getStoreByName(shop)
  const cards = await getStoreCards(shop)

  if (!shopDetails) {
    throw new Response("Not found", { status: 404 })
  }

  return {
    shop: toStoreProfileDto(shopDetails),
    shopDomain: shop,
    shopifyDetails: responseJson.data.shop,
    cards: cards ? cards.map((card) => toLoyaltyCardDto(card)) : ([] as LoyaltyCardDto[]),
    frontendUrl: process.env.FRONTEND_URL!,
  }
}

function EditStoreNameForm({ store }: { store: StoreProfileDto }) {
  const nav = useNavigation()
  const [storeName, setStoreName] = useState(store.storeName)
  const isSaving = nav.state === "submitting"

  return (
    <BlockStack gap="200">
      <Text as="h2" variant="headingSm">
        Program Display Name
      </Text>
      <Form method="post">
        <BlockStack gap="200">
          <TextField
            label="Store name"
            labelHidden
            value={storeName}
            onChange={setStoreName}
            type="text"
            name="storeName"
            autoComplete="off"
            helpText="This is the name customers will see on their loyalty card."
          />
          <Button submit loading={isSaving}>Update name</Button>
        </BlockStack>
      </Form>
    </BlockStack>
  )
}

function StoreDetailsCard({
  store,
  shopifyDetails,
}: {
  store: StoreProfileDto
  shopifyDetails: any
}) {
  return (
    <Card>
      <BlockStack gap="500">
        <BlockStack gap="200">
          <Text as="h2" variant="headingLg">
            {shopifyDetails.name}
          </Text>
          <Text as="p" tone="subdued">
            {shopifyDetails.primaryDomain.url}
          </Text>
        </BlockStack>

        <BlockStack gap="200">
          <Text as="h3" variant="headingSm">
            Billing
          </Text>
          <Text as="p">
            {shopifyDetails.billingAddress.city}, {shopifyDetails.billingAddress.country}
          </Text>
          <Text as="p">Currency: {shopifyDetails.currencyCode}</Text>
        </BlockStack>

        <EditStoreNameForm store={store} />

        <InlineStack gap="200" align="start">
          <Text as="span" variant="bodySm" tone="subdued">
            Internal Store ID: {store.storeId}
          </Text>
        </InlineStack>
      </BlockStack>
    </Card>
  )
}

function StoreQRCode({ storeName, frontendUrl }: { storeName: string; frontendUrl: string }) {
  const url = `${frontendUrl}/create-card/${storeName}`
  
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Your Store QR Code
        </Text>
        <Text as="p">
          Print this QR code and place it on your counter for customers to easily create their loyalty card!
        </Text>
        <div style={{ padding: "16px", background: "white", width: "max-content", minHeight: "182px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Suspense fallback={<Text as="span">Loading QR Code...</Text>}>
            <QRCode value={url} size={150} />
          </Suspense>
        </div>
        <InlineStack>
          <Button url={url} target="_blank">
            Open URL
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  )
}

function Cards({ cards }: { cards: LoyaltyCardDto[] }) {
  return (
    <BlockStack gap="500">
      {cards.map((card) => (
        <Card key={card.cardId}>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              {card.cardId}
            </Text>
            <Text variant="bodyMd" as="p">
              {card.issueDate}
            </Text>
          </BlockStack>
        </Card>
      ))}
    </BlockStack>
  )
}

export default function Index() {
  const { shop, shopDomain, shopifyDetails, cards, frontendUrl } = useLoaderData<typeof loader>()
  const navigate = useNavigate()

  // Determine if store name is unconfigured (matches Shopify domain or default)
  const isUnconfigured = shop.storeName.includes("myshopify.com") || shop.storeName === shopifyDetails.primaryDomain.url

  return (
    <Page>
      <TitleBar title="Dashboard">
        <button variant="primary" onClick={() => navigate("/app/scan")}>
          Scan Card
        </button>
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          {isUnconfigured && (
            <Layout.Section>
              <Banner title="Welcome to Coffee Card!" tone="success">
                <Text as="p">
                  Please update your program's display name below and print out your QR code so customers can begin redeeming their rewards.
                </Text>
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Store details
                </Text>
                <StoreDetailsCard store={shop} shopifyDetails={shopifyDetails} />
              </BlockStack>
            </BlockStack>

            <BlockStack gap="500">
              <StoreQRCode storeName={shopDomain} frontendUrl={frontendUrl} />
            </BlockStack>

            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Configuration
                </Text>
                <Card>
                  <InlineStack gap="200">
                    <Button onClick={() => navigate("/app/customise")}>Theme Settings</Button>
                    <Button onClick={() => navigate("/app/rewards")}>Loyalty Rewards</Button>
                  </InlineStack>
                </Card>
              </BlockStack>
            </BlockStack>

            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Your loyalty cards
                  </Text>
                  {cards.length === 0 ? (
                    <Text tone="subdued" as="p">No cards issued yet.</Text>
                  ) : (
                    <Cards cards={cards} />
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  )
}

