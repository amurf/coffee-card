import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node"
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react"
import { Page, Layout, Card, BlockStack, TextField, Button, Text } from "@shopify/polaris"
import { TitleBar } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"
import { getStoreByName, updateStoreProfile } from "@coffee-card/backend"
import { useEffect, useState } from "react"
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
  const stampsRequiredStr = formData.get("stampsRequired") as string
  const stampsRequired = parseInt(stampsRequiredStr, 10)

  if (isNaN(stampsRequired) || stampsRequired < 1) {
    return json({ error: "Stamps required must be at least 1" }, { status: 400 })
  }

  const shopDetails = await getStoreByName(shop)
  if (!shopDetails) {
    return json({ error: "Store not found" }, { status: 404 })
  }

  const updatedProfile: StoreProfileModel = {
    ...shopDetails,
    rewardRules: {
      stampsRequired
    }
  }

  await updateStoreProfile(updatedProfile)

  return json({ success: true })
}

export default function Rewards() {
  const { shopDetails } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const submit = useSubmit()
  const navigation = useNavigation()

  const isSaving = navigation.state === "submitting"

  const defaultStamps = shopDetails.rewardRules?.stampsRequired || 10
  const [stamps, setStamps] = useState(defaultStamps.toString())



  const handleSave = () => {
    const formData = new FormData()
    formData.append("stampsRequired", stamps)
    submit(formData, { method: "post" })
  }

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }}>
      <TitleBar title="Configure Rewards" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Loyalty Rules</Text>
              
              <TextField
                label="Stamps Required"
                type="number"
                value={stamps}
                onChange={setStamps}
                autoComplete="off"
                min={1}
                helpText="The number of stamps a customer must collect to earn a reward."
              />

              <div style={{ marginTop: "16px" }}>
                <Button onClick={handleSave} variant="primary" loading={isSaving}>Save Rewards</Button>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
