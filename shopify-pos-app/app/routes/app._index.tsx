import { useEffect } from "react"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  TextField,
} from "@shopify/polaris"
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"

import { getStoreByName, getStoreCards } from "@coffee-card/backend"
import {
  LoyaltyCardDto,
  StoreProfileDto,
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request)
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ]
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  )
  const responseJson = await response.json()

  const product = responseJson.data!.productCreate!.product!
  const variantId = product.variants.edges[0]!.node!.id!

  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  )

  const variantResponseJson = await variantResponse.json()

  return {
    product: responseJson!.data!.productCreate!.product,
    variant:
      variantResponseJson!.data!.productVariantsBulkUpdate!.productVariants,
  }
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
  const fetcher = useFetcher<typeof action>()
  const { shop, cards } = useLoaderData<typeof loader>()

  const shopify = useAppBridge()
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST"
  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  )

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created")
    }
  }, [productId, shopify])
  const generateProduct = () => fetcher.submit({}, { method: "POST" })

  return (
    <Page>
      <TitleBar title="Remix app template">
        <button variant="primary" onClick={generateProduct}>
          Generate a product
        </button>
      </TitleBar>
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
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Congrats on creating a new Shopify app 🎉 {shop?.storeName}
                  </Text>
                  <Text variant="bodyMd" as="p">
                    This embedded app template uses{" "}
                    <Link
                      url="https://shopify.dev/docs/apps/tools/app-bridge"
                      target="_blank"
                      removeUnderline
                    >
                      App Bridge
                    </Link>{" "}
                    interface examples like an{" "}
                    <Link url="/app/additional" removeUnderline>
                      additional page in the app nav
                    </Link>
                    , as well as an{" "}
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql"
                      target="_blank"
                      removeUnderline
                    >
                      Admin GraphQL
                    </Link>{" "}
                    mutation demo, to provide a starting point for app
                    development.
                  </Text>
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Get started with products
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Generate a product with GraphQL and get the JSON output for
                    that product. Learn more about the{" "}
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate"
                      target="_blank"
                      removeUnderline
                    >
                      productCreate
                    </Link>{" "}
                    mutation in our API references.
                  </Text>
                </BlockStack>
                <InlineStack gap="300">
                  <Button loading={isLoading} onClick={generateProduct}>
                    Generate a product
                  </Button>
                  {fetcher.data?.product && (
                    <Button
                      url={`shopify:admin/products/${productId}`}
                      target="_blank"
                      variant="plain"
                    >
                      View product
                    </Button>
                  )}
                </InlineStack>
                {fetcher.data?.product && (
                  <>
                    <Text as="h3" variant="headingMd">
                      {" "}
                      productCreate mutation
                    </Text>
                    <Box
                      padding="400"
                      background="bg-surface-active"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="border"
                      overflowX="scroll"
                    >
                      <pre style={{ margin: 0 }}>
                        <code>
                          {JSON.stringify(fetcher.data.product, null, 2)}
                        </code>
                      </pre>
                    </Box>
                    <Text as="h3" variant="headingMd">
                      {" "}
                      productVariantsBulkUpdate mutation
                    </Text>
                    <Box
                      padding="400"
                      background="bg-surface-active"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="border"
                      overflowX="scroll"
                    >
                      <pre style={{ margin: 0 }}>
                        <code>
                          {JSON.stringify(fetcher.data.variant, null, 2)}
                        </code>
                      </pre>
                    </Box>
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    App template specs
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Framework
                      </Text>
                      <Link
                        url="https://remix.run"
                        target="_blank"
                        removeUnderline
                      >
                        Remix
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Database
                      </Text>
                      <Link
                        url="https://www.prisma.io/"
                        target="_blank"
                        removeUnderline
                      >
                        Prisma
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Interface
                      </Text>
                      <span>
                        <Link
                          url="https://polaris.shopify.com"
                          target="_blank"
                          removeUnderline
                        >
                          Polaris
                        </Link>
                        {", "}
                        <Link
                          url="https://shopify.dev/docs/apps/tools/app-bridge"
                          target="_blank"
                          removeUnderline
                        >
                          App Bridge
                        </Link>
                      </span>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        API
                      </Text>
                      <Link
                        url="https://shopify.dev/docs/api/admin-graphql"
                        target="_blank"
                        removeUnderline
                      >
                        GraphQL API
                      </Link>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Next steps
                  </Text>
                  <List>
                    <List.Item>
                      Build an{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/getting-started/build-app-example"
                        target="_blank"
                        removeUnderline
                      >
                        {" "}
                        example app
                      </Link>{" "}
                      to get started
                    </List.Item>
                    <List.Item>
                      Explore Shopify’s API with{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
                        target="_blank"
                        removeUnderline
                      >
                        GraphiQL
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  )
}
