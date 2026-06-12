<script setup lang="ts">
import { ref, watch, onMounted } from "vue"
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { getAllStores, getStoreCards, createCard, updateStore, getSquareConfig, getShopifyConfig } from "@coffee-card/shared"
import { Sparkles, Store, ShieldAlert, Cpu, QrCode, PlusCircle, Loader2, X, ExternalLink, ChevronRight, Calendar, CheckCircle2 } from "lucide-vue-next"
import { useRoute, useRouter } from "vue-router"
import QRCode from "qrcode"

const queryClient = useQueryClient()
const route = useRoute()
const router = useRouter()
const selectedStoreName = ref<string | null>(null)

// 1. Fetch all stores
const { data: stores, isLoading: isLoadingStores, error: storesError } = useQuery({
  queryKey: ["stores"],
  queryFn: getAllStores,
})

// Auto-select first store when loaded
watch(stores, (newStores) => {
  if (newStores && newStores.length > 0 && !selectedStoreName.value) {
    selectedStoreName.value = newStores[0].storeName
  }
})

// 2. Fetch cards for the selected store
const { data: cards, isLoading: isLoadingCards, error: cardsError } = useQuery({
  queryKey: ["cards", selectedStoreName],
  queryFn: () => selectedStoreName.value ? getStoreCards(selectedStoreName.value) : Promise.resolve([]),
  enabled: () => !!selectedStoreName.value,
})

// Modal states for newly created card
const isModalOpen = ref(false)
const createdCardData = ref<{ cardId: string; storeName: string; url: string; qrCodeDataUrl: string } | null>(null)

const customerOrigin = (import.meta.env.VITE_CUSTOMER_URL as string) || "http://localhost:5173"

// 3. Create card mutation
const createCardMutation = useMutation({
  mutationFn: (storeName: string) => createCard(storeName),
  onSuccess: async (data) => {
    // Invalidate queries so the list of cards updates automatically
    queryClient.invalidateQueries({ queryKey: ["cards", selectedStoreName] })

    const cardUrl = `${customerOrigin}/card/${data.cardId}`
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(cardUrl, {
        margin: 1,
        width: 180,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
      createdCardData.value = {
        cardId: data.cardId,
        storeName: data.storeName,
        url: cardUrl,
        qrCodeDataUrl,
      }
      isModalOpen.value = true
    } catch (err) {
      console.error("Failed to generate QR code", err)
    }
  },
})

const handleCreateCard = () => {
  if (selectedStoreName.value) {
    createCardMutation.mutate(selectedStoreName.value)
  }
}

const closeModal = () => {
  isModalOpen.value = false
  createdCardData.value = null
}

// POS Integration settings state
const squareConfig = ref<{ clientId: string; redirectUri: string; oauthBase: string } | null>(null)
const shopifyConfig = ref<{ clientId: string; redirectUri: string } | null>(null)
const isSuccessBannerOpen = ref(false)

const posTypeInput = ref<string>("NONE")
const squareLocationIdInput = ref<string>("")
const shopifyShopInput = ref<string>("")

onMounted(async () => {
  if (route.query.success === "true") {
    isSuccessBannerOpen.value = true
    if (route.query.store) {
      selectedStoreName.value = route.query.store as string
    }
    router.replace({ path: route.path })
  }

  try {
    squareConfig.value = await getSquareConfig()
  } catch (err) {
    console.error("Failed to load Square config", err)
  }

  try {
    shopifyConfig.value = await getShopifyConfig()
  } catch (err) {
    console.error("Failed to load Shopify config", err)
  }
})

// Sync form values when the selected store profile changes
watch(
  [stores, selectedStoreName],
  () => {
    const store = stores.value?.find(s => s.storeName === selectedStoreName.value)
    if (store) {
      posTypeInput.value = store.posType || "NONE"
      squareLocationIdInput.value = store.posConfig?.squareLocationId || ""
      shopifyShopInput.value = store.posConfig?.shopifyShop || ""
    }
  },
  { immediate: true }
)

const updateStoreMutation = useMutation({
  mutationFn: ({ storeName, updates }: { storeName: string; updates: any }) => updateStore(storeName, updates),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["stores"] })
  }
})

const handleSavePOS = () => {
  if (!selectedStoreName.value) return
  const currentStore = stores.value?.find(s => s.storeName === selectedStoreName.value)
  if (!currentStore) return

  const updates: any = {
    posType: posTypeInput.value,
    posConfig: {
      ...currentStore.posConfig,
      squareLocationId: posTypeInput.value === "SQUARE" ? squareLocationIdInput.value : currentStore.posConfig?.squareLocationId,
      shopifyShop: posTypeInput.value === "SHOPIFY" ? shopifyShopInput.value : currentStore.posConfig?.shopifyShop,
    }
  }

  updateStoreMutation.mutate({ storeName: selectedStoreName.value, updates })
}

const handleDisconnectSquare = () => {
  if (!selectedStoreName.value) return
  const currentStore = stores.value?.find(s => s.storeName === selectedStoreName.value)
  if (!currentStore) return

  const updates: any = {
    posType: "NONE",
    posConfig: {
      ...currentStore.posConfig,
      squareAccessToken: "",
      squareRefreshToken: "",
      squareTokenExpiresAt: "",
      squareMerchantId: "",
    }
  }

  updateStoreMutation.mutate({ storeName: selectedStoreName.value, updates })
}

const handleDisconnectShopify = () => {
  if (!selectedStoreName.value) return
  const currentStore = stores.value?.find(s => s.storeName === selectedStoreName.value)
  if (!currentStore) return

  const updates: any = {
    posType: "NONE",
    posConfig: {
      ...currentStore.posConfig,
      shopifyAccessToken: "",
    }
  }

  updateStoreMutation.mutate({ storeName: selectedStoreName.value, updates })
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans pb-12">
    <!-- Clean Header -->
    <header class="bg-card border-b border-border px-8 py-5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Sparkles class="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 class="text-xl font-bold">Loyalty Wallet Admin Portal</h1>
          <p class="text-xs text-muted-foreground">Manage stores, issue cards, and inspect loyalty balances</p>
        </div>
      </div>
      <div class="flex items-center gap-2 bg-secondary border border-border px-3 py-1.5 rounded-lg text-xs text-muted-foreground">
        <Cpu class="w-4 h-4 text-primary" />
        <span>Local Dev | Bun | Turso</span>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-6 pt-8">
      <!-- Success Banner -->
      <div v-if="isSuccessBannerOpen" class="mb-8 bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-xl flex justify-between items-start text-emerald-600 dark:text-emerald-400">
        <div class="flex gap-3 items-start">
          <CheckCircle2 class="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 class="font-bold">Square Connected Successfully</h3>
            <p class="text-xs mt-1">Your Square store has been linked to Coffee Card.</p>
          </div>
        </div>
        <button @click="isSuccessBannerOpen = false" class="text-muted-foreground hover:text-foreground">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Error Banner -->
      <div v-if="storesError" class="mb-8 bg-destructive/10 border border-destructive/20 p-5 rounded-xl flex gap-3 items-start text-destructive">
        <ShieldAlert class="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h3 class="font-bold">Database Connection Failed</h3>
          <p class="text-xs mt-1">Make sure you ran <code class="bg-secondary px-1 py-0.5 rounded text-destructive">bun run db:push</code> and seeded local tables.</p>
        </div>
      </div>

      <!-- Master-Detail Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        <!-- Left Column: Store List (Master) -->
        <div class="lg:col-span-1 bg-card border border-border rounded-2xl p-4">
          <h2 class="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-3">Store Directory</h2>
          
          <div v-if="isLoadingStores" class="flex items-center justify-center py-6 gap-2 text-sm text-stone-500">
            <Loader2 class="w-4 h-4 animate-spin text-primary" />
            <span>Loading stores...</span>
          </div>
          
          <div v-else class="space-y-1">
            <button
              v-for="store in stores"
              :key="store.storeId"
              @click="selectedStoreName = store.storeName"
              :class="[
                'w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between text-sm transition-all',
                selectedStoreName === store.storeName
                  ? 'bg-primary text-primary-foreground font-semibold shadow-md'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              ]"
            >
              <div class="flex items-center gap-2 truncate">
                <Store class="w-4 h-4 shrink-0" />
                <span class="truncate">{{ store.storeName }}</span>
              </div>
              <ChevronRight class="w-4 h-4 shrink-0 opacity-60" />
            </button>
          </div>
        </div>

        <!-- Right Column: Detail View -->
        <div class="lg:col-span-3 space-y-6">
          <div v-if="selectedStoreName" class="space-y-6">
            
            <!-- Store Configuration Summary -->
            <div 
              v-for="store in stores?.filter(s => s.storeName === selectedStoreName)" 
              :key="store.storeId"
              class="bg-card border border-border rounded-2xl p-6"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 mb-5">
                <div>
                  <h2 class="text-2xl font-bold">{{ store.storeName }}</h2>
                  <p class="text-xs text-muted-foreground mt-1">
                    Location: <span class="text-foreground font-medium">{{ store.location || "Local Dev Cafe" }}</span>
                  </p>
                </div>
                
                <div class="flex gap-2">
                  <span class="text-xs bg-secondary border border-border text-secondary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono">
                    Type: {{ store.posType }}
                  </span>
                </div>
              </div>

              <!-- Issue Card Trigger -->
              <div class="flex items-center justify-between bg-secondary/50 border border-border p-4 rounded-xl">
                <div>
                  <h3 class="text-sm font-semibold">Generate loyalty card</h3>
                  <p class="text-xs text-muted-foreground mt-0.5">Issues a fresh digital stamp card for this store profile.</p>
                </div>
                <button
                  @click="handleCreateCard"
                  :disabled="createCardMutation.isPending.value"
                  class="bg-primary hover:bg-primary/95 text-primary-foreground disabled:opacity-50 text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Loader2 v-if="createCardMutation.isPending.value" class="w-3.5 h-3.5 animate-spin" />
                  <PlusCircle v-else class="w-3.5 h-3.5" />
                  <span>Issue Card</span>
                </button>
              </div>

              <!-- POS Integration Section -->
              <div class="mt-6 pt-6 border-t border-border space-y-4">
                <h3 class="text-sm font-semibold flex items-center gap-1.5">
                  <Cpu class="w-4 h-4 text-primary" />
                  <span>POS Integration Settings</span>
                </h3>
                
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs text-muted-foreground mb-1">Select POS Platform</label>
                    <select 
                      v-model="posTypeInput" 
                      class="bg-secondary text-foreground border border-border text-sm rounded-lg block w-full p-2.5 outline-none"
                    >
                      <option value="NONE">None (Standalone)</option>
                      <option value="SHOPIFY">Shopify POS</option>
                      <option value="SQUARE">Square POS</option>
                    </select>
                  </div>

                  <!-- Shopify Configuration -->
                  <div v-if="posTypeInput === 'SHOPIFY'" class="space-y-4 pt-2">
                    <div v-if="store.posConfig?.shopifyAccessToken" class="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 flex flex-col gap-2">
                      <div class="flex items-center gap-1.5 font-semibold">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Shopify POS Connected</span>
                      </div>
                      <p class="text-muted-foreground">
                        Connected Store: <code class="font-mono bg-secondary/80 px-1 py-0.5 rounded">{{ store.posConfig.shopifyShop }}</code>
                      </p>
                      <button 
                        @click="handleDisconnectShopify" 
                        class="w-fit border border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2.5 py-1.5 rounded-md mt-1 transition-all"
                      >
                        Disconnect Shopify
                      </button>
                    </div>

                    <div v-else class="space-y-3">
                      <!-- Domain Input -->
                      <div>
                        <label class="block text-xs text-muted-foreground mb-1">Shopify Store Domain</label>
                        <input 
                          v-model="shopifyShopInput" 
                          type="text" 
                          placeholder="your-shop.myshopify.com" 
                          class="bg-secondary text-foreground border border-border text-xs rounded-lg block w-full p-2 outline-none font-mono"
                        />
                        <p class="text-[10px] text-muted-foreground mt-1">E.g., storename.myshopify.com (do not include https://).</p>
                      </div>

                      <!-- OAuth Connect Button -->
                      <div v-if="shopifyConfig?.clientId" class="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-lg text-xs text-blue-600 dark:text-blue-400 space-y-3">
                        <p class="text-muted-foreground">
                          Connect your Shopify store to authorize Coffee Card to listen for paid order webhooks.
                        </p>
                        <div class="flex items-center gap-2">
                          <a 
                            :href="shopifyShopInput.trim() ? `https://${shopifyShopInput.trim()}/admin/oauth/authorize?client_id=${shopifyConfig.clientId}&scope=read_orders,read_customers&redirect_uri=${encodeURIComponent(shopifyConfig.redirectUri)}&state=admin:${store.storeName}` : '#'"
                            :class="[
                              'font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs',
                              shopifyShopInput.trim() ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-300 text-gray-500 pointer-events-none cursor-not-allowed'
                            ]"
                          >
                            <span>Connect with Shopify</span>
                            <ExternalLink class="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      <!-- Configuration Warning -->
                      <div v-else class="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-lg text-xs text-amber-600 dark:text-amber-400 flex gap-2 items-start">
                        <ShieldAlert class="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p class="font-semibold">Shopify Integration Unavailable</p>
                          <p class="text-muted-foreground mt-0.5">
                            Shopify App Client ID is not configured in the server environment. Please configure SHOPIFY_CLIENT_ID to connect your Shopify account.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Square Configuration -->
                  <div v-if="posTypeInput === 'SQUARE'" class="space-y-4 pt-2">
                    <div v-if="store.posConfig?.squareRefreshToken" class="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 flex flex-col gap-2">
                      <div class="flex items-center gap-1.5 font-semibold">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Square OAuth Connected</span>
                      </div>
                      <p class="text-muted-foreground">
                        Connected Merchant ID: <code class="font-mono bg-secondary/80 px-1 py-0.5 rounded">{{ store.posConfig.squareMerchantId }}</code>
                      </p>
                      <button 
                        @click="handleDisconnectSquare" 
                        class="w-fit border border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2.5 py-1.5 rounded-md mt-1 transition-all"
                      >
                        Disconnect Square
                      </button>
                    </div>

                    <div v-else class="space-y-3">
                      <!-- OAuth Connect Button -->
                      <div v-if="squareConfig?.clientId" class="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-lg text-xs text-blue-600 dark:text-blue-400 space-y-3">
                        <p class="text-muted-foreground">
                          Connect your Square account to authorize Coffee Card to sync customer profiles and receive webhook transaction events.
                        </p>
                        <div class="flex items-center gap-2">
                          <a 
                            :href="`${squareConfig.oauthBase}/oauth2/authorize?client_id=${squareConfig.clientId}&scope=CUSTOMERS_WRITE+CUSTOMERS_READ+ORDERS_READ&state=admin:${store.storeName}&redirect_uri=${encodeURIComponent(squareConfig.redirectUri)}`"
                            class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs"
                          >
                            <span>Connect with Square</span>
                            <ExternalLink class="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      <!-- Configuration Warning -->
                      <div v-else class="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-lg text-xs text-amber-600 dark:text-amber-400 flex gap-2 items-start">
                        <ShieldAlert class="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p class="font-semibold">Square Integration Unavailable</p>
                          <p class="text-muted-foreground mt-0.5">
                            Square App Client ID is not configured in the server environment. Please configure SQUARE_CLIENT_ID to connect your Square account.
                          </p>
                        </div>
                      </div>
                    </div>

                    <!-- Location ID field, needed for both OAuth and manual -->
                    <div>
                      <label class="block text-xs text-muted-foreground mb-1">Square Location ID</label>
                      <input 
                        v-model="squareLocationIdInput" 
                        type="text" 
                        placeholder="L-..." 
                        class="bg-secondary text-foreground border border-border text-xs rounded-lg block w-full p-2 outline-none font-mono"
                      />
                      <p class="text-[10px] text-muted-foreground mt-1">Retrieve this from your Square Developer Console under Locations.</p>
                    </div>
                  </div>

                  <!-- Save Button -->
                  <div class="pt-2 flex justify-end">
                    <button 
                      @click="handleSavePOS" 
                      :disabled="updateStoreMutation.isPending.value"
                      class="bg-primary hover:bg-primary/95 text-primary-foreground disabled:opacity-50 text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Loader2 v-if="updateStoreMutation.isPending.value" class="w-3.5 h-3.5 animate-spin" />
                      <span>Save POS Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Issued Cards List -->
            <div class="bg-card border border-border rounded-2xl p-6">
              <h3 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                Issued Loyalty Cards
              </h3>

              <div v-if="isLoadingCards" class="flex items-center justify-center py-12 gap-2 text-stone-500 text-sm">
                <Loader2 class="w-5 h-5 animate-spin text-primary" />
                <span>Fetching loyalty cards...</span>
              </div>

              <div v-else-if="cardsError" class="text-xs text-destructive py-6">
                Failed to load loyalty cards: {{ cardsError }}
              </div>

              <div v-else-if="!cards || cards.length === 0" class="text-center py-12 text-muted-foreground text-sm">
                <QrCode class="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p>No loyalty cards issued for this store yet.</p>
                <button @click="handleCreateCard" class="text-primary hover:underline text-xs font-semibold mt-2">
                  Create first card
                </button>
              </div>

              <!-- Cards Table -->
              <div v-else class="overflow-x-auto border border-border rounded-xl">
                <table class="w-full text-left text-sm">
                  <thead class="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                    <tr>
                      <th class="py-3 px-4">Card ID</th>
                      <th class="py-3 px-4">Stamps</th>
                      <th class="py-3 px-4">Total Earned</th>
                      <th class="py-3 px-4">Date Issued</th>
                      <th class="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    <tr 
                      v-for="card in cards" 
                      :key="card.cardId" 
                      class="hover:bg-muted/30 transition-colors"
                    >
                      <td class="py-3 px-4 font-mono text-xs text-primary max-w-[180px] truncate">
                        {{ card.cardId }}
                      </td>
                      <td class="py-3 px-4 font-semibold">
                        {{ card.stampCount }}
                      </td>
                      <td class="py-3 px-4 text-xs text-muted-foreground">
                        {{ card.totalStampsEarned }}
                      </td>
                      <td class="py-3 px-4 text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Calendar class="w-3.5 h-3.5 opacity-60" />
                        <span>{{ new Date(card.issueDate).toLocaleDateString() }}</span>
                      </td>
                      <td class="py-3 px-4 text-right">
                        <a 
                          :href="`${customerOrigin}/card/${card.cardId}`" 
                          target="_blank"
                          class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-secondary border border-border px-2.5 py-1 rounded-md transition-all font-medium"
                        >
                          <span>View</span>
                          <ExternalLink class="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
          
          <div v-else class="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
            <Store class="w-12 h-12 text-stone-300 mb-2" />
            <p class="text-sm">Select a store from the directory to inspect loyalty cards.</p>
          </div>
        </div>

      </div>
    </div>

    <!-- Simple QR Card Issue Modal -->
    <div 
      v-if="isModalOpen && createdCardData" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <div class="relative bg-card border border-border max-w-sm w-full rounded-2xl p-6 shadow-xl">
        <button 
          @click="closeModal"
          class="absolute top-4 right-4 text-muted-foreground hover:text-foreground bg-secondary border border-border p-1 rounded-md transition-all cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>

        <h3 class="text-md font-bold mb-4 flex items-center gap-2">
          <QrCode class="w-5 h-5 text-primary" />
          <span>Card Issued Successfully!</span>
        </h3>

        <!-- QR Display -->
        <div class="flex flex-col items-center bg-white p-4 rounded-xl border border-border mb-4 mx-auto w-44 h-44 justify-center">
          <img :src="createdCardData.qrCodeDataUrl" alt="Card QR Code" class="w-full h-full" />
        </div>

        <div class="space-y-2.5 bg-secondary/50 border border-border p-3.5 rounded-lg text-xs mb-5">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Store:</span>
            <span class="font-medium">{{ createdCardData.storeName }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-muted-foreground">Card ID:</span>
            <code class="bg-card p-1.5 rounded text-primary select-all border border-border truncate font-mono text-center">
              {{ createdCardData.cardId }}
            </code>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <a 
            :href="createdCardData.url" 
            target="_blank"
            class="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground py-2 rounded-lg font-semibold text-xs transition-all"
          >
            <span>Launch Customer Page</span>
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
          <button 
            @click="closeModal"
            class="border border-border hover:bg-muted text-muted-foreground py-2 rounded-lg font-medium text-xs transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
