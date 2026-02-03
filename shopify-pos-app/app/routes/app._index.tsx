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
  const { session } = await authenticate.admin(request)

  const shop = session.shop.split(".")[0]

  console.log(shop)
  const shopDetails = await getStoreByName(shop)
  const cards = await getStoreCards(shop)

  if (!shopDetails) {
    throw new Response("Not found", { status: 404 })
  }

  const response = {
    shop: toStoreProfileDto(shopDetails),
    cards: [] as LoyaltyCardDto[],
  }

  if (cards) {
    response.cards = cards.map((card) => toLoyaltyCardDto(card))
  }

  return response
}

function EditStoreNameForm({ store }: { store: StoreProfileDto }) {
  return (
    <BlockStack gap="200">
      <Text as="h2" variant="headingMd">
        Edit store name
      </Text>
      <form method="post">
        <BlockStack gap="200">
          <TextField
            label="Store name"
            value={store.storeName}
            type="text"
            name="storeName"
            autoComplete="off"
          />
          <Button submit>Update name</Button>
        </BlockStack>
      </form>
    </BlockStack>
  )
}

// Edit form component for editing store name
function StoreDetails({ store }: { store: StoreProfileDto }) {
  return (
    <BlockStack gap="200">
      <EditStoreNameForm store={store} />
      <InlineStack gap="200" align="space-between">
        <Text as="span" variant="bodyMd">
          Location
        </Text>
        <Text as="span" variant="bodyMd">
          {store.location}
        </Text>
      </InlineStack>
    </BlockStack>
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
  const { shop, cards } = useLoaderData<typeof loader>()

  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Store details
                  </Text>
                  <StoreDetails store={shop} />
                </BlockStack>
              </Card>
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

