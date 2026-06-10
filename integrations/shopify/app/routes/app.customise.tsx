import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node"
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react"
import { Page, Layout, Card, BlockStack, TextField, Button, Text, InlineGrid } from "@shopify/polaris"
import { TitleBar } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"
import { getStoreByName, updateStoreProfile } from "@coffee-card/backend"
import { useEffect } from "react"
import { StoreProfileModel } from "@coffee-card/shared"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop.split(".")[0]
  
  const shopDetails = await getStoreByName(shop)
  if (!shopDetails) {
    throw new Response("Not found", { status: 404 })
  }

  return json({ shopDetails })
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop.split(".")[0]
  
  const formData = await request.formData()
  const primaryColor = formData.get("primaryColor") as string
  const secondaryColor = formData.get("secondaryColor") as string
  const logoUrl = formData.get("logoUrl") as string

  const shopDetails = await getStoreByName(shop)
  if (!shopDetails) {
    return json({ error: "Store not found" }, { status: 404 })
  }

  const updatedProfile: StoreProfileModel = {
    ...shopDetails,
    themeOptions: {
      primaryColor: primaryColor || "#000000",
      secondaryColor: secondaryColor || "#ffffff",
      logoUrl: logoUrl || undefined,
    }
  }

  await updateStoreProfile(updatedProfile)

  return json({ success: true })
}

export default function Customise() {
  const { shopDetails } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const submit = useSubmit()
  const navigation = useNavigation()

  const isSaving = navigation.state === "submitting"



  const themeOptions = shopDetails.themeOptions || {
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    logoUrl: ""
  }

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }}>
      <TitleBar title="Customise Card Appearance" />
      <Layout>
        <Layout.Section>
          <Card>
            <form method="post">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Theme Settings</Text>
                
                <InlineGrid columns={2} gap="400">
                  <TextField
                    label="Primary Color"
                    name="primaryColor"
                    type="text"
                    value={themeOptions.primaryColor}
                    autoComplete="off"
                    helpText="Used for main buttons and card background highlights."
                  />
                  <TextField
                    label="Secondary Color"
                    name="secondaryColor"
                    type="text"
                    value={themeOptions.secondaryColor}
                    autoComplete="off"
                    helpText="Used for text and secondary elements."
                  />
                </InlineGrid>

                <TextField
                  label="Logo URL"
                  name="logoUrl"
                  type="url"
                  value={themeOptions.logoUrl || ""}
                  autoComplete="off"
                  helpText="Optional link to an image for your store logo on the card."
                />

                <div style={{ marginTop: "16px" }}>
                  <Button submit variant="primary" loading={isSaving}>Save Theme</Button>
                </div>
              </BlockStack>
            </form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
