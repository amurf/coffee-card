import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node"
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react"
import { Page, Layout, Card, BlockStack, TextField, Button, Text, ChoiceList, InlineStack, Select, Grid, Divider, Tooltip, Box } from "@shopify/polaris"
import { TitleBar } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"
import { getStoreByName, updateStoreProfile } from "@coffee-card/backend"
import { useState } from "react"
import { StoreProfileModel } from "@coffee-card/shared"
import { randomUUID } from "crypto"

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
  const rulesStr = formData.get("rules") as string
  
  if (!rulesStr) {
    return json({ error: "Missing rules" }, { status: 400 })
  }

  const rewardRules = JSON.parse(rulesStr)

  const shopDetails = await getStoreByName(shop)
  if (!shopDetails) {
    return json({ error: "Store not found" }, { status: 404 })
  }

  const updatedProfile: StoreProfileModel = {
    ...shopDetails,
    rewardRules
  }

  await updateStoreProfile(updatedProfile)

  return json({ success: true })
}

const rewardTypeOptions = [
  { label: "Fixed Discount", value: "FIXED_DISCOUNT" },
  { label: "Percentage Discount", value: "PERCENTAGE_DISCOUNT" },
  { label: "Free Item", value: "FREE_ITEM" },
  { label: "Custom", value: "CUSTOM" },
]

export default function Rewards() {
  const { shopDetails } = useLoaderData<typeof loader>()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const actionData = useActionData<typeof action>()
  const submit = useSubmit()
  const navigation = useNavigation()

  const isSaving = navigation.state === "submitting"

  const defaultRules = shopDetails.rewardRules || {
    earningRule: { type: "ITEM_PURCHASE" },
    milestones: [
      { id: "m1", stampsRequired: 8, rewardType: "FREE_ITEM", description: "Free Item" }
    ]
  }

  const [earningType, setEarningType] = useState<string[]>(
    [defaultRules.earningRule.type]
  )
  const [amountPerStamp, setAmountPerStamp] = useState(
    defaultRules.earningRule.amountPerStamp?.toString() || "10"
  )
  const [milestones, setMilestones] = useState(defaultRules.milestones)

  const handleSave = () => {
    const sortedMilestones = [...milestones].sort((a, b) => a.stampsRequired - b.stampsRequired)
    const formData = new FormData()
    formData.append("rules", JSON.stringify({
      earningRule: {
        type: earningType[0],
        amountPerStamp: earningType[0] === 'SPEND_AMOUNT' ? parseFloat(amountPerStamp) : undefined
      },
      milestones: sortedMilestones
    }))
    submit(formData, { method: "post" })
  }

  const addMilestone = () => {
    setMilestones([
      ...milestones, 
      { id: Date.now().toString(), stampsRequired: 1, rewardType: "FIXED_DISCOUNT", description: "Reward description", value: 5 }
    ])
  }

  const updateMilestone = (id: string, field: string, value: string | number) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id))
  }

  // Live preview calculations
  const maxStamps = Math.max(...milestones.map(m => m.stampsRequired), 1)
  const slots = Array.from({ length: maxStamps }, (_, i) => i + 1)

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }}>
      <TitleBar title="Configure Rewards" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">How customers earn stamps</Text>
                
                <ChoiceList
                  title=""
                  choices={[
                    {label: '1 Stamp per Item Purchased', value: 'ITEM_PURCHASE'},
                    {label: '1 Stamp per $ Amount Spent', value: 'SPEND_AMOUNT'},
                  ]}
                  selected={earningType}
                  onChange={setEarningType}
                />

                {earningType[0] === 'SPEND_AMOUNT' && (
                  <TextField
                    label="Amount spent per stamp ($)"
                    type="number"
                    value={amountPerStamp}
                    onChange={setAmountPerStamp}
                    autoComplete="off"
                    min={1}
                    helpText="Get 1 stamp for every this amount spent."
                  />
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">What customers earn</Text>
                <Text as="p" variant="bodyMd" tone="subdued">Define the milestones and rewards customers unlock as they collect stamps.</Text>
                
                {milestones.map((milestone, idx) => (
                  <div key={milestone.id} style={{ marginBottom: idx < milestones.length - 1 ? '16px' : '0' }}>
                    <BlockStack gap="400">
                      <Grid>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 2, xl: 2}}>
                          <TextField
                            label="Stamps required"
                            type="number"
                            min={1}
                            value={milestone.stampsRequired.toString()}
                            onChange={(val) => updateMilestone(milestone.id, 'stampsRequired', parseInt(val, 10))}
                            autoComplete="off"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 4, xl: 4}}>
                          <Select
                            label="Reward Type"
                            options={rewardTypeOptions}
                            value={milestone.rewardType}
                            onChange={(val) => updateMilestone(milestone.id, 'rewardType', val)}
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 4, xl: 4}}>
                          <TextField
                            label="Description"
                            type="text"
                            value={milestone.description}
                            onChange={(val) => updateMilestone(milestone.id, 'description', val)}
                            autoComplete="off"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 2, xl: 2}}>
                           <div style={{ marginTop: '24px' }}>
                             <Button tone="critical" onClick={() => removeMilestone(milestone.id)}>Remove</Button>
                           </div>
                        </Grid.Cell>
                      </Grid>
                      <Divider />
                    </BlockStack>
                  </div>
                ))}

                <InlineStack align="start">
                  <Button onClick={addMilestone}>+ Add Milestone</Button>
                </InlineStack>

              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Live Preview</Text>
                <Text as="p" variant="bodyMd" tone="subdued">See how your card will look as customers collect stamps.</Text>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '12px' }}>
                    {slots.map(slotNum => {
                      const milestone = milestones.find(m => m.stampsRequired === slotNum)
                      const isHighest = slotNum === maxStamps
                      
                      return (
                        <Tooltip key={slotNum} content={milestone ? `${slotNum} Stamps: ${milestone.description}` : `Stamp ${slotNum}`}>
                          <div style={{ 
                            height: '60px',
                            minWidth: '60px', 
                            borderRadius: '50%',
                            background: milestone ? '#E3F2FD' : '#fff',
                            border: milestone ? '2px solid #005BD3' : '2px dashed #C9CCCF',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '24px',
                            color: '#005BD3',
                            cursor: 'help'
                          }}>
                            {milestone ? (isHighest ? '🏆' : '🎁') : ''}
                          </div>
                        </Tooltip>
                      )
                    })}
                  </div>
                </Box>
              </BlockStack>
            </Card>

            <div style={{ marginTop: "16px", marginBottom: "32px" }}>
              <Button onClick={handleSave} variant="primary" size="large" loading={isSaving}>Save Rewards</Button>
            </div>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
