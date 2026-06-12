<script setup lang="ts">
import { ref, watch } from "vue"
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { getAllStores, getStoreCards, createCard } from "@coffee-card/shared"
import { Coffee, Store, ShieldAlert, Cpu, QrCode, PlusCircle, Loader2, X, ExternalLink, ChevronRight, Calendar } from "lucide-vue-next"
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

// 3. Create card mutation
const createCardMutation = useMutation({
  mutationFn: (storeName: string) => createCard(storeName),
  onSuccess: async (data) => {
    // Invalidate queries so the list of cards updates automatically
    queryClient.invalidateQueries({ queryKey: ["cards", selectedStoreName] })

    const cardUrl = `${window.location.origin}/card/${data.cardId}`
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
  <div class="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
    <!-- Clean Header -->
    <header class="bg-slate-900 border-b border-slate-800 px-8 py-5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Coffee class="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-white">Coffee Card Admin Portal</h1>
          <p class="text-xs text-slate-400">Manage stores, issue cards, and inspect loyalty balances</p>
        </div>
      </div>
      <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-400">
        <Cpu class="w-4 h-4 text-indigo-500" />
        <span>Local Dev | Bun | Turso</span>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-6 pt-8">
      <!-- Error Banner -->
      <div v-if="storesError" class="mb-8 bg-red-950/40 border border-red-900/50 p-5 rounded-xl flex gap-3 items-start">
        <ShieldAlert class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h3 class="font-bold text-red-200">Database Connection Failed</h3>
          <p class="text-xs text-slate-400 mt-1">Make sure you ran <code class="bg-slate-900 px-1 py-0.5 rounded text-red-400">bun run db:push</code> and seeded local tables.</p>
        </div>
      </div>

      <!-- Master-Detail Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        <!-- Left Column: Store List (Master) -->
        <div class="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-3">Store Directory</h2>
          
          <div v-if="isLoadingStores" class="flex items-center justify-center py-6 gap-2 text-sm text-slate-500">
            <Loader2 class="w-4 h-4 animate-spin" />
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
                  ? 'bg-indigo-600 text-white font-semibold shadow-md'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
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
              class="bg-slate-900 border border-slate-800 rounded-2xl p-6"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
                <div>
                  <h2 class="text-2xl font-bold text-white">{{ store.storeName }}</h2>
                  <p class="text-xs text-slate-400 mt-1">
                    Location: <span class="text-slate-300">{{ store.location || "Local Dev Cafe" }}</span>
                  </p>
                </div>
                
                <div class="flex gap-2">
                  <span class="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono">
                    Type: {{ store.posType }}
                  </span>
                </div>
              </div>

              <!-- Issue Card Trigger -->
              <div class="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
                <div>
                  <h3 class="text-sm font-semibold text-white">Generate loyalty card</h3>
                  <p class="text-xs text-slate-400 mt-0.5">Issues a fresh digital stamp card for this store profile.</p>
                </div>
                <button
                  @click="handleCreateCard"
                  :disabled="createCardMutation.isPending.value"
                  class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-all"
                >
                  <Loader2 v-if="createCardMutation.isPending.value" class="w-3.5 h-3.5 animate-spin" />
                  <PlusCircle v-else class="w-3.5 h-3.5" />
                  <span>Issue Card</span>
                </button>
              </div>
            </div>

            <!-- Issued Cards List -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                Issued Loyalty Cards
              </h3>

              <div v-if="isLoadingCards" class="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                <Loader2 class="w-5 h-5 animate-spin" />
                <span>Fetching loyalty cards...</span>
              </div>

              <div v-else-if="cardsError" class="text-xs text-red-400 py-6">
                Failed to load loyalty cards: {{ cardsError }}
              </div>

              <div v-else-if="!cards || cards.length === 0" class="text-center py-12 text-slate-500 text-sm">
                <QrCode class="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>No loyalty cards issued for this store yet.</p>
                <button @click="handleCreateCard" class="text-indigo-400 hover:text-indigo-300 text-xs font-semibold mt-2">
                  Create first card
                </button>
              </div>

              <!-- Cards Table -->
              <div v-else class="overflow-x-auto">
                <table class="w-full text-left text-sm text-slate-300">
                  <thead class="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
                    <tr>
                      <th class="py-3 px-4">Card ID</th>
                      <th class="py-3 px-4">Stamps</th>
                      <th class="py-3 px-4">Total Earned</th>
                      <th class="py-3 px-4">Date Issued</th>
                      <th class="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/60">
                    <tr 
                      v-for="card in cards" 
                      :key="card.cardId" 
                      class="hover:bg-slate-800/30 transition-colors"
                    >
                      <td class="py-3 px-4 font-mono text-xs text-indigo-300 max-w-[180px] truncate">
                        {{ card.cardId }}
                      </td>
                      <td class="py-3 px-4 font-semibold text-white">
                        {{ card.stampCount }}
                      </td>
                      <td class="py-3 px-4 text-xs text-slate-400">
                        {{ card.totalStampsEarned }}
                      </td>
                      <td class="py-3 px-4 text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                        <Calendar class="w-3.5 h-3.5 opacity-60" />
                        <span>{{ new Date(card.issueDate).toLocaleDateString() }}</span>
                      </td>
                      <td class="py-3 px-4 text-right">
                        <a 
                          :href="`/card/${card.cardId}`" 
                          target="_blank"
                          class="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white font-medium bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md transition-all"
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
          
          <div v-else class="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            <Store class="w-12 h-12 text-slate-700 mb-2" />
            <p class="text-sm">Select a store from the directory to inspect loyalty cards.</p>
          </div>
        </div>

      </div>
    </div>

    <!-- Simple QR Card Issue Modal -->
    <div 
      v-if="isModalOpen && createdCardData" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
    >
      <div class="relative bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-xl">
        <button 
          @click="closeModal"
          class="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 p-1 rounded-md transition-all"
        >
          <X class="w-4 h-4" />
        </button>

        <h3 class="text-md font-bold text-white mb-4 flex items-center gap-2">
          <QrCode class="w-5 h-5 text-indigo-400" />
          <span>Card Issued Successfully!</span>
        </h3>

        <!-- QR Display -->
        <div class="flex flex-col items-center bg-white p-4 rounded-xl shadow-inner mb-4 mx-auto w-44 h-44 justify-center">
          <img :src="createdCardData.qrCodeDataUrl" alt="Card QR Code" class="w-full h-full" />
        </div>

        <div class="space-y-2.5 bg-slate-950/50 border border-slate-950 p-3.5 rounded-lg text-xs mb-5">
          <div class="flex justify-between">
            <span class="text-slate-400">Store:</span>
            <span class="text-white font-medium">{{ createdCardData.storeName }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-slate-400">Card ID:</span>
            <code class="bg-slate-950 p-1.5 rounded text-indigo-400 select-all border border-slate-900 truncate font-mono text-center">
              {{ createdCardData.cardId }}
            </code>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <a 
            :href="createdCardData.url" 
            target="_blank"
            class="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold text-xs transition-all"
          >
            <span>Launch Customer Page</span>
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
          <button 
            @click="closeModal"
            class="border border-slate-800 hover:border-slate-700 text-slate-300 py-2 rounded-lg font-medium text-xs transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
