<script setup lang="ts">
import { ref, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { 
  createStore, 
  updateStore, 
  getAllStores, 
  getSquareConfig,
  getShopifyConfig
} from "@coffee-card/shared"
import { 
  Sparkles, 
  Store as StoreIcon, 
  Cpu, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Loader2, 
  ArrowLeft, 
  Paintbrush, 
  Link2,
  Lock,
  Settings,
  HelpCircle,
  X,
  Plus,
  Trash2
} from "lucide-vue-next"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()

// Core tabs: 'register' or 'manage'
const activeTab = ref<"register" | "manage">("register")

// Step within the registration flow: 1 (details) or 2 (POS)
const registrationStep = ref<1 | 2>(1)

// List of all stores
const { data: stores, refetch: refetchStores } = useQuery({
  queryKey: ["stores"],
  queryFn: getAllStores
})

// Square & Shopify OAuth Config
const squareConfig = ref<{ clientId: string; redirectUri: string; oauthBase: string } | null>(null)
const shopifyConfig = ref<{ clientId: string; redirectUri: string } | null>(null)

// Form states for creating a new store
const newStoreName = ref("")
const newLocation = ref("")
const primaryColor = ref("#733f2e") // Warm brown
const secondaryColor = ref("#f7efea") // Warm cream

// Selected store for management
const selectedManageStoreName = ref("")
const merchantPasscodeInput = ref("")
const isStoreUnlocked = ref(false)
const unlockError = ref("")
const registerError = ref("")

// The store currently being configured (newly created or unlocked)
const activeConfigStore = ref<any>(null)

// Integration form inputs for activeConfigStore
const posTypeInput = ref<"NONE" | "SHOPIFY" | "SQUARE" | "LIGHTSPEED">("NONE")
const squareLocationIdInput = ref<string>("")
const shopifyShopInput = ref<string>("")

// Loyalty configuration inputs
const earningTypeInput = ref<"ITEM_PURCHASE" | "SPEND_AMOUNT">("ITEM_PURCHASE")
const amountPerStampInput = ref<number>(10)
const skuPrefixInput = ref<string>("")
const milestonesInput = ref<any[]>([])

const addMilestone = () => {
  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
  milestonesInput.value.push({
    id,
    stampsRequired: 10,
    rewardType: "FREE_ITEM",
    description: "Free Coffee",
    value: undefined
  })
}

const removeMilestone = (id: string) => {
  milestonesInput.value = milestonesInput.value.filter(m => m.id !== id)
}

const isSuccessBannerOpen = ref(false)
const notificationMessage = ref("")

onMounted(async () => {
  // Load Square config
  try {
    squareConfig.value = await getSquareConfig()
  } catch (err) {
    console.error("Failed to load Square config", err)
  }

  // Load Shopify config
  try {
    shopifyConfig.value = await getShopifyConfig()
  } catch (err) {
    console.error("Failed to load Shopify config", err)
  }

  // Handle OAuth callback redirection parameter
  if (route.query.success === "true" && route.query.store) {
    isSuccessBannerOpen.value = true
    notificationMessage.value = "POS integrated successfully!"
    activeTab.value = "manage"
    selectedManageStoreName.value = route.query.store as string
    
    // Automatically unlock the store for them since they just finished OAuth
    await fetchAndUnlockStore(route.query.store as string)
    router.replace({ path: route.path })
  }
})

async function fetchAndUnlockStore(storeName: string) {
  try {
    const list = await getAllStores()
    const matched = list.find((s: any) => s.storeName === storeName)
    if (matched) {
      activeConfigStore.value = matched
      isStoreUnlocked.value = true
      
      // Load current configurations
      posTypeInput.value = matched.posType || "NONE"
      squareLocationIdInput.value = matched.posConfig?.squareLocationId || ""
      shopifyShopInput.value = matched.posConfig?.shopifyShop || ""

      const rules = (matched.rewardRules as any) || {}
      earningTypeInput.value = rules.earningRule?.type || "ITEM_PURCHASE"
      amountPerStampInput.value = rules.earningRule?.amountPerStamp || 10
      skuPrefixInput.value = rules.eligibility?.skuPrefix || ""
      milestonesInput.value = rules.milestones ? JSON.parse(JSON.stringify(rules.milestones)) : [
        { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), stampsRequired: 10, rewardType: "FREE_ITEM", description: "Free Coffee" }
      ]
    }
  } catch (err) {
    console.error("Failed to load redirected store", err)
  }
}

// Unlocking store manually in the 'manage' tab
const handleUnlockStore = () => {
  unlockError.value = ""
  const matched = stores.value?.find(s => s.storeName === selectedManageStoreName.value)
  if (!matched) {
    unlockError.value = "Store profile not found."
    return
  }

  if (matched.merchantPasscode && matched.merchantPasscode !== merchantPasscodeInput.value) {
    unlockError.value = "Incorrect merchant passcode."
    return
  }

  activeConfigStore.value = matched
  isStoreUnlocked.value = true
  posTypeInput.value = matched.posType || "NONE"
  squareLocationIdInput.value = matched.posConfig?.squareLocationId || ""
  shopifyShopInput.value = matched.posConfig?.shopifyShop || ""

  const rules = (matched.rewardRules as any) || {}
  earningTypeInput.value = rules.earningRule?.type || "ITEM_PURCHASE"
  amountPerStampInput.value = rules.earningRule?.amountPerStamp || 10
  skuPrefixInput.value = rules.eligibility?.skuPrefix || ""
  milestonesInput.value = rules.milestones ? JSON.parse(JSON.stringify(rules.milestones)) : [
    { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), stampsRequired: 10, rewardType: "FREE_ITEM", description: "Free Coffee" }
  ]
}

// Store creation mutation
const createStoreMutation = useMutation({
  mutationFn: async () => {
    registerError.value = ""
    if (!newStoreName.value.trim()) throw new Error("Store name is required")
    try {
      const store = await createStore(newStoreName.value.trim())
      
      // Update it with location & theme options
      const updated = await updateStore(store.storeName, {
        location: newLocation.value,
        themeOptions: {
          primaryColor: primaryColor.value,
          secondaryColor: secondaryColor.value,
        }
      })
      return updated
    } catch (err: any) {
      if (err.response) {
        try {
          const body = await err.response.json()
          if (body && body.message) {
            throw new Error(body.message)
          }
        } catch (_) {}
      }
      throw err
    }
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["stores"] })
    refetchStores()
    activeConfigStore.value = data
    registrationStep.value = 2
    posTypeInput.value = "NONE"
    squareLocationIdInput.value = ""
    shopifyShopInput.value = ""
    
    // Initialize default rules
    earningTypeInput.value = "ITEM_PURCHASE"
    amountPerStampInput.value = 10
    skuPrefixInput.value = ""
    milestonesInput.value = [
      { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), stampsRequired: 10, rewardType: "FREE_ITEM", description: "Free Coffee" }
    ]
  },
  onError: (err: any) => {
    registerError.value = err.message || "Failed to create store."
  }
})

// Store update mutation
const updateStoreMutation = useMutation({
  mutationFn: async () => {
    if (!activeConfigStore.value) return
    const currentConfig = activeConfigStore.value.posConfig || {}
    
    const updates: any = {
      posType: posTypeInput.value,
      posConfig: {
        ...currentConfig,
        squareLocationId: posTypeInput.value === "SQUARE" ? squareLocationIdInput.value : currentConfig.squareLocationId,
        shopifyShop: posTypeInput.value === "SHOPIFY" ? shopifyShopInput.value : currentConfig.shopifyShop,
      },
      rewardRules: {
        earningRule: {
          type: earningTypeInput.value,
          amountPerStamp: earningTypeInput.value === "SPEND_AMOUNT" ? Number(amountPerStampInput.value) : undefined
        },
        milestones: milestonesInput.value.map(m => ({
          id: m.id,
          stampsRequired: Number(m.stampsRequired),
          rewardType: m.rewardType,
          value: m.value ? Number(m.value) : undefined,
          description: m.description
        })),
        eligibility: {
          skuPrefix: skuPrefixInput.value.trim() ? skuPrefixInput.value.trim() : undefined
        }
      }
    }
    
    return await updateStore(activeConfigStore.value.storeName, updates)
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["stores"] })
    if (data) {
      activeConfigStore.value = data
    }
    isSuccessBannerOpen.value = true
    notificationMessage.value = "Store configurations saved successfully!"
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
})

// Disconnect Square config mutation
const disconnectSquareMutation = useMutation({
  mutationFn: async () => {
    if (!activeConfigStore.value) return
    const currentConfig = activeConfigStore.value.posConfig || {}
    
    const updates: any = {
      posType: "NONE",
      posConfig: {
        ...currentConfig,
        squareAccessToken: "",
        squareRefreshToken: "",
        squareTokenExpiresAt: "",
        squareMerchantId: "",
      }
    }
    
    return await updateStore(activeConfigStore.value.storeName, updates)
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["stores"] })
    if (data) {
      activeConfigStore.value = data
      posTypeInput.value = "NONE"
      squareLocationIdInput.value = ""
    }
    isSuccessBannerOpen.value = true
    notificationMessage.value = "Square integration disconnected successfully."
  }
})

// Disconnect Shopify config mutation
const disconnectShopifyMutation = useMutation({
  mutationFn: async () => {
    if (!activeConfigStore.value) return
    const currentConfig = activeConfigStore.value.posConfig || {}
    
    const updates: any = {
      posType: "NONE",
      posConfig: {
        ...currentConfig,
        shopifyAccessToken: "",
      }
    }
    
    return await updateStore(activeConfigStore.value.storeName, updates)
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["stores"] })
    if (data) {
      activeConfigStore.value = data
      posTypeInput.value = "NONE"
      shopifyShopInput.value = ""
    }
    isSuccessBannerOpen.value = true
    notificationMessage.value = "Shopify integration disconnected successfully."
  }
})

const handleReset = () => {
  activeConfigStore.value = null
  isStoreUnlocked.value = false
  merchantPasscodeInput.value = ""
  registrationStep.value = 1
  newStoreName.value = ""
  newLocation.value = ""
  registerError.value = ""
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground py-8 px-4 font-sans">
    <div class="max-w-2xl mx-auto space-y-6">
      
      <!-- Logo Header -->
      <div class="flex items-center gap-3 justify-center mb-4 cursor-pointer" @click="router.push('/')">
        <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
          <Sparkles class="w-5 h-5 text-primary-foreground animate-pulse" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Loyalty Wallet</h1>
        </div>
      </div>

      <!-- Success Notification Toast -->
      <div 
        v-if="isSuccessBannerOpen" 
        class="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex justify-between items-center text-emerald-700 dark:text-emerald-400 shadow-md animate-in fade-in slide-in-from-top-4"
      >
        <div class="flex items-center gap-3">
          <CheckCircle2 class="w-5 h-5 shrink-0" />
          <span class="text-sm font-medium">{{ notificationMessage }}</span>
        </div>
        <button @click="isSuccessBannerOpen = false" class="text-emerald-700 dark:text-emerald-400 hover:opacity-80 p-1.5 rounded-lg">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Tab Navigation (Only show if not currently configuring a store) -->
      <div v-if="!activeConfigStore" class="flex p-1 bg-secondary rounded-xl border border-border">
        <button 
          @click="activeTab = 'register'"
          :class="[
            'flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all',
            activeTab === 'register' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          ]"
        >
          Register New Store
        </button>
        <button 
          @click="activeTab = 'manage'"
          :class="[
            'flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all',
            activeTab === 'manage' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          ]"
        >
          Manage Existing Integration
        </button>
      </div>

      <!-- --- TABS CONTENT --- -->

      <!-- TAB A: REGISTER NEW STORE -->
      <div v-if="activeTab === 'register' && !activeConfigStore">
        <Card class="border-border">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <StoreIcon class="w-5 h-5 text-primary" />
              <span>Create Store Profile</span>
            </CardTitle>
            <CardDescription>
              Create your store profile to start issuing digital loyalty cards.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-xs font-semibold text-muted-foreground">Store Name (acts as unique identifier)</label>
              <input 
                v-model="newStoreName" 
                type="text" 
                placeholder="e.g. Espresso Oasis" 
                class="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div class="space-y-2">
              <label class="text-xs font-semibold text-muted-foreground">Location (City or Neighborhood)</label>
              <input 
                v-model="newLocation" 
                type="text" 
                placeholder="e.g. Shibuya, Tokyo" 
                class="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Paintbrush class="w-3.5 h-3.5" /> Primary Color
                </label>
                <div class="flex gap-2 items-center">
                  <input type="color" v-model="primaryColor" class="w-8 h-8 rounded border cursor-pointer bg-transparent" />
                  <input type="text" v-model="primaryColor" class="bg-secondary border border-border rounded-lg text-xs p-1.5 w-24 outline-none font-mono" />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Paintbrush class="w-3.5 h-3.5" /> Text/Accent Color
                </label>
                <div class="flex gap-2 items-center">
                  <input type="color" v-model="secondaryColor" class="w-8 h-8 rounded border cursor-pointer bg-transparent" />
                  <input type="text" v-model="secondaryColor" class="bg-secondary border border-border rounded-lg text-xs p-1.5 w-24 outline-none font-mono" />
                </div>
              </div>
            </div>
            <p v-if="registerError" class="text-xs text-destructive flex items-center gap-1.5 mt-4">
              <AlertTriangle class="w-4 h-4" />
              <span>{{ registerError }}</span>
            </p>
          </CardContent>
          <CardFooter class="flex justify-between border-t border-border pt-4 mt-6">
            <Button variant="ghost" @click="router.push('/')" class="text-muted-foreground flex items-center gap-1">
              <ArrowLeft class="w-4 h-4" /> Back to Cards
            </Button>
            <Button 
              @click="createStoreMutation.mutate()" 
              :disabled="createStoreMutation.isPending.value || !newStoreName.trim()"
              class="flex items-center gap-1.5"
            >
              <Loader2 v-if="createStoreMutation.isPending.value" class="w-4 h-4 animate-spin" />
              <span>Next: POS Setup</span>
              <ChevronRight class="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <!-- TAB B: MANAGE EXISTING STORE (UNLOCK) -->
      <div v-if="activeTab === 'manage' && !activeConfigStore">
        <Card class="border-border">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Lock class="w-5 h-5 text-primary" />
              <span>Unlock Store Settings</span>
            </CardTitle>
            <CardDescription>
              Select your store and verify ownership using your passcode.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-xs font-semibold text-muted-foreground">Select Store</label>
              <select 
                v-model="selectedManageStoreName" 
                class="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="" disabled>-- Select your store --</option>
                <option v-for="store in stores" :key="store.storeId" :value="store.storeName">
                  {{ store.storeName }}
                </option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <span>Merchant Passcode</span>
                <HelpCircle class="w-3.5 h-3.5 text-muted-foreground cursor-help" title="Default is 1234" />
              </label>
              <input 
                v-model="merchantPasscodeInput" 
                type="password" 
                placeholder="e.g. 1234" 
                class="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none tracking-widest focus:ring-1 focus:ring-primary"
              />
            </div>

            <p v-if="unlockError" class="text-xs text-destructive flex items-center gap-1.5">
              <AlertTriangle class="w-4 h-4" />
              <span>{{ unlockError }}</span>
            </p>
          </CardContent>
          <CardFooter class="flex justify-between border-t border-border pt-4 mt-6">
            <Button variant="ghost" @click="router.push('/')" class="text-muted-foreground flex items-center gap-1">
              <ArrowLeft class="w-4 h-4" /> Back to Cards
            </Button>
            <Button 
              @click="handleUnlockStore" 
              :disabled="!selectedManageStoreName || !merchantPasscodeInput"
              class="flex items-center gap-1.5"
            >
              <span>Unlock settings</span>
              <ChevronRight class="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <!-- --- STEP 2 / CONFIGURATION INTERFACE (STORE UNLOCKED / CREATED) --- -->
      <div v-if="activeConfigStore" class="space-y-6">
        
        <!-- Store Identity Badge -->
        <div class="bg-secondary/60 border border-border rounded-2xl p-5 flex justify-between items-center">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Configuring Integration for</span>
            <h2 class="text-xl font-bold">{{ activeConfigStore.storeName }}</h2>
            <p class="text-xs text-muted-foreground mt-0.5">{{ activeConfigStore.location || "No location set" }}</p>
          </div>
          <Button variant="outline" size="sm" @click="handleReset" class="text-xs flex items-center gap-1">
            <ArrowLeft class="w-3.5 h-3.5" /> Switch Store
          </Button>
        </div>

        <!-- POS Settings Form -->
        <Card class="border-border">
          <CardHeader>
            <CardTitle class="flex items-center gap-1.5">
              <Cpu class="w-5 h-5 text-primary" />
              <span>POS Integration Setup</span>
            </CardTitle>
            <CardDescription>
              Connect your POS system to automatically award digital stamps when customers complete transactions.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="space-y-2">
              <label class="text-xs font-semibold text-muted-foreground">Select Point of Sale Platform</label>
              <select 
                v-model="posTypeInput" 
                class="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="NONE">None (Manual Standalone Mode)</option>
                <option value="SHOPIFY">Shopify POS</option>
                <option value="SQUARE">Square POS</option>
              </select>
            </div>

            <!-- Shopify Configuration -->
            <div v-if="posTypeInput === 'SHOPIFY'" class="space-y-4 pt-2">
              
              <!-- Connection State Banner -->
              <div v-if="activeConfigStore.posConfig?.shopifyAccessToken" class="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-xs text-emerald-700 dark:text-emerald-400 space-y-3 shadow-sm">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="font-semibold text-sm">Shopify POS Connection Active</span>
                </div>
                <p class="text-muted-foreground text-[11px]">
                  Connected Store: <code class="font-mono bg-secondary/80 px-1 py-0.5 rounded">{{ activeConfigStore.posConfig.shopifyShop }}</code>
                </p>
                <Button 
                  variant="destructive"
                  size="sm"
                  @click="disconnectShopifyMutation.mutate()" 
                  :disabled="disconnectShopifyMutation.isPending.value"
                  class="text-xs py-1 h-8 px-3"
                >
                  <Loader2 v-if="disconnectShopifyMutation.isPending.value" class="w-3 h-3 animate-spin mr-1" />
                  Disconnect Integration
                </Button>
              </div>

              <!-- Connection Setup -->
              <div v-else class="space-y-4">
                <!-- Domain Input -->
                <div class="space-y-1.5">
                  <label class="text-xs font-semibold text-muted-foreground">Shopify Store Domain</label>
                  <input 
                    v-model="shopifyShopInput" 
                    type="text" 
                    placeholder="your-store.myshopify.com" 
                    class="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none font-mono focus:ring-1 focus:ring-primary"
                  />
                  <p class="text-[10px] text-muted-foreground">E.g., storename.myshopify.com (do not include https://).</p>
                </div>

                <!-- OAuth Connect Button -->
                <div v-if="shopifyConfig?.clientId" class="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-xs text-blue-700 dark:text-blue-400 space-y-3">
                  <p class="text-muted-foreground">
                    Connect your Shopify store to authorize Loyalty Wallet to listen for paid order webhooks.
                  </p>
                  <div class="flex items-center gap-3">
                    <a 
                      :href="shopifyShopInput.trim() ? `https://${shopifyShopInput.trim()}/admin/oauth/authorize?client_id=${shopifyConfig.clientId}&scope=read_orders,read_customers&redirect_uri=${encodeURIComponent(shopifyConfig.redirectUri)}&state=standalone:${activeConfigStore.storeName}` : '#'"
                      :class="[
                        'font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all text-xs shadow-md',
                        shopifyShopInput.trim() ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-300 text-gray-500 pointer-events-none cursor-not-allowed'
                      ]"
                    >
                      <span>Connect with Shopify</span>
                      <ExternalLink class="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <!-- Configuration Warning -->
                <div v-else class="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs text-amber-700 dark:text-amber-400 flex gap-2 items-start">
                  <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p class="font-bold text-foreground">Shopify Integration Unavailable</p>
                    <p class="text-muted-foreground mt-0.5">
                      Shopify Application Client ID is not configured in the server environment. Please set SHOPIFY_CLIENT_ID to enable connecting your Shopify account.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Square POS Configuration -->
            <div v-if="posTypeInput === 'SQUARE'" class="space-y-4 pt-2">
              
              <!-- Connection State Banner -->
              <div v-if="activeConfigStore.posConfig?.squareRefreshToken" class="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-xs text-emerald-700 dark:text-emerald-400 space-y-3 shadow-sm">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="font-semibold text-sm">Square OAuth Connection Active</span>
                </div>
                <p class="text-muted-foreground text-[11px]">
                  Connected Merchant ID: <code class="font-mono bg-secondary/80 px-1 py-0.5 rounded">{{ activeConfigStore.posConfig.squareMerchantId }}</code>
                </p>
                <Button 
                  variant="destructive"
                  size="sm"
                  @click="disconnectSquareMutation.mutate()" 
                  :disabled="disconnectSquareMutation.isPending.value"
                  class="text-xs py-1 h-8 px-3"
                >
                  <Loader2 v-if="disconnectSquareMutation.isPending.value" class="w-3 h-3 animate-spin mr-1" />
                  Disconnect Integration
                </Button>
              </div>

              <!-- Connection Setup (OAuth Required) -->
              <div v-else class="space-y-4">
                <!-- OAuth Option -->
                <div v-if="squareConfig?.clientId" class="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-xs text-blue-700 dark:text-blue-400 space-y-3">
                  <p class="text-muted-foreground">
                    Connect your Square merchant account to authorize Loyalty Wallet to manage customer loyalty files and listen for completed sales.
                  </p>
                  <div class="flex items-center gap-3">
                    <a 
                      :href="`${squareConfig.oauthBase}/oauth2/authorize?client_id=${squareConfig.clientId}&scope=CUSTOMERS_WRITE+CUSTOMERS_READ+ORDERS_READ&state=standalone:${activeConfigStore.storeName}&redirect_uri=${encodeURIComponent(squareConfig.redirectUri)}`"
                      class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all text-xs shadow-md"
                    >
                      <span>Connect with Square</span>
                      <ExternalLink class="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <!-- Configuration Warning -->
                <div v-else class="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs text-amber-700 dark:text-amber-400 flex gap-2 items-start">
                  <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p class="font-bold text-foreground">Square Integration Unavailable</p>
                    <p class="text-muted-foreground mt-0.5">
                      Square Application Client ID is not configured in the server environment. Please set SQUARE_CLIENT_ID to enable connecting your Square account.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Location ID Configuration -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-muted-foreground">Square Location ID</label>
                <input 
                  v-model="squareLocationIdInput" 
                  type="text" 
                  placeholder="L-..." 
                  class="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none font-mono focus:ring-1 focus:ring-primary"
                />
                <p class="text-[10px] text-muted-foreground">Retrieve this ID from the <b>Locations</b> tab in your Square Dashboard.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Earning & Product Rules Card -->
        <Card class="border-border">
          <CardHeader>
            <CardTitle class="flex items-center gap-1.5">
              <Settings class="w-5 h-5 text-primary" />
              <span>Earning & Product Rules</span>
            </CardTitle>
            <CardDescription>
              Configure how customers earn stamps and which products are eligible.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-xs font-semibold text-muted-foreground">Earning Rule Type</label>
              <div class="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  @click="earningTypeInput = 'ITEM_PURCHASE'"
                  :class="[
                    'py-2.5 px-4 text-xs font-semibold rounded-xl border transition-all text-center',
                    earningTypeInput === 'ITEM_PURCHASE'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                  ]"
                >
                  Per Item Purchased
                </button>
                <button 
                  type="button"
                  @click="earningTypeInput = 'SPEND_AMOUNT'"
                  :class="[
                    'py-2.5 px-4 text-xs font-semibold rounded-xl border transition-all text-center',
                    earningTypeInput === 'SPEND_AMOUNT'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                  ]"
                >
                  Per Amount Spent ($)
                </button>
              </div>
            </div>

            <!-- Spend Amount Configuration -->
            <div v-if="earningTypeInput === 'SPEND_AMOUNT'" class="space-y-2 animate-in fade-in duration-200">
              <label class="text-xs font-semibold text-muted-foreground">Amount Spent per Stamp ($)</label>
              <input 
                v-model.number="amountPerStampInput" 
                type="number" 
                min="1"
                placeholder="e.g. 10" 
                class="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <p class="text-[10px] text-muted-foreground">E.g., $10 spent = 1 stamp.</p>
            </div>

            <!-- Product Eligibility -->
            <div class="space-y-2 pt-2 border-t border-border">
              <label class="text-xs font-semibold text-muted-foreground">Product SKU Prefix (Optional)</label>
              <input 
                v-model="skuPrefixInput" 
                type="text" 
                placeholder="e.g. COF-" 
                class="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none font-mono focus:ring-1 focus:ring-primary"
              />
              <p class="text-[10px] text-muted-foreground">Only award stamps for items with SKUs starting with this prefix. Leave empty for all products.</p>
            </div>
          </CardContent>
        </Card>

        <!-- Reward Milestones Card -->
        <Card class="border-border">
          <CardHeader class="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle class="flex items-center gap-1.5">
                <Sparkles class="w-5 h-5 text-primary" />
                <span>Loyalty Reward Milestones</span>
              </CardTitle>
              <CardDescription>
                Set stamp thresholds and corresponding rewards for your customers.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" @click="addMilestone" class="text-xs flex items-center gap-1">
              <Plus class="w-3.5 h-3.5 mr-1" /> Add Milestone
            </Button>
          </CardHeader>
          <CardContent class="space-y-4">
            <div v-if="milestonesInput.length === 0" class="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
              No reward milestones configured yet. Click "Add Milestone" to configure one.
            </div>

            <div v-else class="space-y-4 divide-y divide-border">
              <div 
                v-for="(milestone, index) in milestonesInput" 
                :key="milestone.id"
                :class="['grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-4', index === 0 ? 'pt-0' : '']"
              >
                <!-- Stamps Required -->
                <div class="space-y-1.5 md:col-span-2">
                  <label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stamps</label>
                  <input 
                    v-model.number="milestone.stampsRequired" 
                    type="number" 
                    min="1"
                    class="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <!-- Reward Type -->
                <div class="space-y-1.5 md:col-span-3">
                  <label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
                  <select 
                    v-model="milestone.rewardType" 
                    class="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="FREE_ITEM">Free Item</option>
                    <option value="FIXED_DISCOUNT">Fixed Discount ($)</option>
                    <option value="PERCENTAGE_DISCOUNT">Percentage Discount (%)</option>
                    <option value="CUSTOM">Custom Reward</option>
                  </select>
                </div>

                <!-- Value -->
                <div 
                  class="space-y-1.5 md:col-span-2"
                  v-if="milestone.rewardType === 'FIXED_DISCOUNT' || milestone.rewardType === 'PERCENTAGE_DISCOUNT'"
                >
                  <label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Value</label>
                  <input 
                    v-model.number="milestone.value" 
                    type="number" 
                    min="0"
                    placeholder="e.g. 5"
                    class="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <!-- Description -->
                <div :class="['space-y-1.5', milestone.rewardType === 'FIXED_DISCOUNT' || milestone.rewardType === 'PERCENTAGE_DISCOUNT' ? 'md:col-span-4' : 'md:col-span-6']">
                  <label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                  <input 
                    v-model="milestone.description" 
                    type="text" 
                    placeholder="e.g. Free Hot Beverage" 
                    class="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <!-- Action -->
                <div class="md:col-span-1 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    @click="removeMilestone(milestone.id)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Save Actions -->
        <div class="flex justify-between items-center bg-secondary/60 border border-border p-4 rounded-2xl shadow-md">
          <Button variant="ghost" @click="handleReset" class="text-muted-foreground flex items-center gap-1">
            <ArrowLeft class="w-4 h-4" /> Cancel & Switch Store
          </Button>
          <Button 
            @click="updateStoreMutation.mutate()" 
            :disabled="updateStoreMutation.isPending.value"
            class="flex items-center gap-1.5"
          >
            <Loader2 v-if="updateStoreMutation.isPending.value" class="w-4 h-4 animate-spin" />
            <span>Save Configurations</span>
          </Button>
        </div>

        <!-- QR Code scanning instruction block for Cashier -->
        <Card class="border-border">
          <CardHeader>
            <CardTitle class="text-sm flex items-center gap-1.5">
              <Sparkles class="w-4 h-4 text-primary" />
              <span>How to Scan Cards on Square Register</span>
            </CardTitle>
          </CardHeader>
          <CardContent class="text-xs text-muted-foreground space-y-2">
            <p>
              When this integration is configured and a customer joins your loyalty program, our system creates a profile for them in your Square Customer Directory, storing their Card UUID in the <b>Reference ID</b> field.
            </p>
            <ol class="list-decimal pl-4 space-y-1">
              <li>Open your <b>Square Point of Sale</b> register.</li>
              <li>At checkout, tap the <b>Add Customer</b> field.</li>
              <li>Scan the customer's loyalty card QR code using a 2D barcode scanner.</li>
              <li>Square will instantly find and link the loyalty profile to the checkout transaction.</li>
              <li>Once payment completes, Loyalty Wallet will automatically award stamps.</li>
            </ol>
          </CardContent>
        </Card>
      </div>

    </div>
  </div>
</template>
