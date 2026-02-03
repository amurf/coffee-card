import { type LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  TextField,
} from "@shopify/polaris"
import { TitleBar } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"

import { getStoreByName, getStoreCards } from "@coffee-card/backend"
import {
  type LoyaltyCardDto,
  type StoreProfileDto,
  toLoyaltyCardDto,
  toStoreProfileDto,
} from "@coffee-card/shared"

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
    shopifyDetails: responseJson.data.shop,
    cards: cards ? cards.map((card) => toLoyaltyCardDto(card)) : ([] as LoyaltyCardDto[]),
  }
}

function EditStoreNameForm({ store }: { store: StoreProfileDto }) {
  return (
    <BlockStack gap="200">
      <Text as="h2" variant="headingSm">
        Program Display Name
      </Text>
      <form method="post">
        <BlockStack gap="200">
          <TextField
            label="Store name"
            labelHidden
            value={store.storeName}
            type="text"
            name="storeName"
            autoComplete="off"
            helpText="This is the name customers will see on their loyalty card."
          />
          <Button submit>Update name</Button>
        </BlockStack>
      </form>
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
  const { shop, shopifyDetails, cards } = useLoaderData<typeof loader>()

  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        <Layout>
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
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Your loyalty cards
                  </Text>
                  <Cards cards={cards} />
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  )
}

