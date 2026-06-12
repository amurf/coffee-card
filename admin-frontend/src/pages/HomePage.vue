<script setup lang="ts">
import { ref, watch } from "vue"
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { getAllStores, getStoreCards, createCard } from "@coffee-card/shared"
import { Sparkles, Store, ShieldAlert, Cpu, QrCode, PlusCircle, Loader2, X, ExternalLink, ChevronRight, Calendar } from "lucide-vue-next"
import QRCode from "qrcode"

const queryClient = useQueryClient()
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
