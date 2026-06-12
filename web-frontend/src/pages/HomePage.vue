<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { useQuery, useMutation } from "@tanstack/vue-query"
import { getAllStores, getCardById, createCard } from "@coffee-card/shared"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  Search, 
  MapPin, 
  Trash2, 
  Loader2,
  Store
} from "lucide-vue-next"

const router = useRouter()

// Local wallet state
const myCardIds = ref<string[]>([])
const myCards = ref<any[]>([])
const isLoadingWallet = ref(false)

const loadWallet = async () => {
  const stored = localStorage.getItem("my-coffee-cards")
  if (stored) {
    try {
      myCardIds.value = JSON.parse(stored)
    } catch (e) {
      myCardIds.value = []
    }
  }
}

const loadCardDetails = async () => {
  if (myCardIds.value.length === 0) {
    myCards.value = []
    return
  }
  isLoadingWallet.value = true
  try {
    const details = await Promise.all(
      myCardIds.value.map(id => 
        getCardById(id).catch(err => {
          console.error(`Error loading card ${id}`, err)
          return null
        })
      )
    )
    myCards.value = details.filter(Boolean)
  } catch (err) {
    console.error(err)
  } finally {
    isLoadingWallet.value = false
  }
}

watch(myCardIds, loadCardDetails, { deep: true })

const removeCard = (cardId: string) => {
  myCardIds.value = myCardIds.value.filter(id => id !== cardId)
  localStorage.setItem("my-coffee-cards", JSON.stringify(myCardIds.value))
}

// Fetch stores
const { data: stores, isLoading: isLoadingStores } = useQuery({
  queryKey: ["stores"],
  queryFn: getAllStores,
})

// Geolocation
const defaultCoords = { latitude: -37.7012, longitude: 144.7678 } // Melbourne 3037
const userCoords = ref<{ latitude: number; longitude: number } | null>(null)
const geoState = ref<"idle" | "loading" | "success" | "error">("idle")

const requestLocation = () => {
  geoState.value = "loading"
  if (!navigator.geolocation) {
    geoState.value = "error"
    userCoords.value = { ...defaultCoords }
    return
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userCoords.value = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
      geoState.value = "success"
    },
    () => {
      geoState.value = "error"
      userCoords.value = { ...defaultCoords }
    }
  )
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Join program mutation
const createCardMutation = useMutation({
  mutationFn: (storeName: string) => createCard(storeName),
  onSuccess: (data) => {
    const updated = [...myCardIds.value, data.cardId]
    localStorage.setItem("my-coffee-cards", JSON.stringify(updated))
    localStorage.setItem("last-viewed-card-id", data.cardId)
    router.push(`/card/${data.cardId}`)
  },
})

const handleJoinProgram = (storeName: string) => {
  createCardMutation.mutate(storeName)
}

// Search and filter
const searchQuery = ref("")
const sortBy = ref<"distance" | "name">("distance")

const storeCardMap = computed(() => {
  const map = new Map<string, string>()
  myCards.value.forEach(card => {
    map.set(card.storeName, card.cardId)
  })
  return map
})

const filteredStores = computed(() => {
  if (!stores.value) return []
  
  const storesWithDistance = stores.value.map(store => {
    let distance: number | null = null
    if (userCoords.value && store.latitude && store.longitude) {
      distance = calculateDistance(
        userCoords.value.latitude,
        userCoords.value.longitude,
        store.latitude,
        store.longitude
      )
    }
    return { ...store, distance }
  })

  let result = storesWithDistance.filter(store => 
    store.storeName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    store.location.toLowerCase().includes(searchQuery.value.toLowerCase())
  )

  if (sortBy.value === "distance") {
    result.sort((a, b) => {
      if (a.distance === null) return 1
      if (b.distance === null) return -1
      return a.distance - b.distance
    })
  } else {
    result.sort((a, b) => a.storeName.localeCompare(b.storeName))
  }

  return result
})

const formatDistance = (dist: number | null) => {
  if (dist === null) return ""
  return dist < 1 ? `${Math.round(dist * 1000)}m away` : `${dist.toFixed(1)} km away`
}

onMounted(() => {
  loadWallet()
  requestLocation()
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground pb-12">
    <!-- Navbar -->
    <header class="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Sparkles class="w-5 h-5 text-primary" />
        <span class="font-bold text-lg">Loyalty Wallet</span>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 pt-8 space-y-10">

      <!-- My Cards / Wallet Section -->
      <section class="space-y-4">
        <h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <span>My Loyalty Cards</span>
          <span class="text-xs font-normal lowercase">({{ myCards.length }})</span>
        </h3>

        <div v-if="isLoadingWallet" class="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 class="w-4 h-4 animate-spin" />
          <span>Loading your wallet...</span>
        </div>

        <div v-else-if="myCards.length === 0" class="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          You don't have any stamp cards in your wallet yet. Join a program below to get started!
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card v-for="card in myCards" :key="card.cardId" class="flex flex-col justify-between">
            <CardHeader class="pb-3 flex flex-row items-start justify-between space-y-0 gap-4">
              <div>
                <CardTitle class="text-base font-bold">{{ card.storeName }}</CardTitle>
                <CardDescription class="text-xs">
                  Joined: {{ new Date(card.issueDate).toLocaleDateString() }}
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                class="h-8 w-8 text-muted-foreground hover:text-destructive"
                @click="removeCard(card.cardId)"
                title="Remove from wallet"
              >
                <Trash2 class="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent class="pb-3">
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-muted-foreground">Stamps collected</span>
                  <span>{{ card.stampCount }} / 10</span>
                </div>
                <div class="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-primary transition-all duration-300"
                    :style="{ width: `${Math.min((card.stampCount / 10) * 100, 100)}%` }"
                  ></div>
                </div>
              </div>
            </CardContent>
            <CardFooter class="pt-0 flex justify-end">
              <Button size="sm" @click="router.push(`/card/${card.cardId}`)">
                View Card
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <!-- Store Locator Section -->
      <section class="space-y-4 border-t border-border pt-8">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Find Nearby Stores
          </h3>
          
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span v-if="geoState === 'loading'" class="flex items-center gap-1">
              <Loader2 class="w-3.5 h-3.5 animate-spin" />
              Locating...
            </span>
            <span v-else-if="geoState === 'success'" class="text-primary flex items-center gap-0.5">
              <MapPin class="w-3.5 h-3.5" />
              Using GPS location
            </span>
            <span v-else class="flex items-center gap-1">
              <span>Melbourne 3037</span>
              <button @click="requestLocation" class="text-primary hover:underline font-medium">
                (Use GPS)
              </button>
            </span>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-col sm:flex-row gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Search by store name or address..." 
              class="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <select 
            v-model="sortBy"
            class="px-3 py-2.5 bg-card border border-border rounded-lg text-xs text-muted-foreground focus:outline-none cursor-pointer"
          >
            <option value="distance">Sort by: Nearest</option>
            <option value="name">Sort by: Name</option>
          </select>
        </div>

        <!-- Stores Loading/Error -->
        <div v-if="isLoadingStores" class="text-center py-12 text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin text-primary" />
          <span>Searching for local stores...</span>
        </div>

        <!-- Stores Listing -->
        <div v-else class="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
          <div 
            v-for="store in filteredStores" 
            :key="store.storeId"
            class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-sm">{{ store.storeName }}</span>
                <span v-if="store.distance !== null" class="text-[10px] bg-secondary text-secondary-foreground font-semibold px-2 py-0.5 rounded-full">
                  {{ formatDistance(store.distance) }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground">{{ store.location }}</p>
              <div class="text-[10px] text-primary font-medium mt-1">
                Reward: {{ store.rewardRules?.milestones?.[0]?.description || "Free Reward" }}
              </div>
            </div>

            <div class="flex justify-end shrink-0">
              <Button 
                v-if="storeCardMap.has(store.storeName)"
                variant="outline" 
                size="sm"
                @click="router.push(`/card/${storeCardMap.get(store.storeName)}`)"
              >
                View Stamp Card
              </Button>
              <Button 
                v-else
                size="sm"
                :disabled="createCardMutation.isPending.value"
                @click="handleJoinProgram(store.storeName)"
              >
                <Loader2 v-if="createCardMutation.isPending.value" class="w-3.5 h-3.5 animate-spin mr-1" />
                Join Program
              </Button>
            </div>
          </div>

          <div v-if="filteredStores.length === 0" class="p-8 text-center text-sm text-muted-foreground">
            No stores found matching your search.
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
select {
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2378716c' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 14px;
  padding-right: 32px;
}
</style>
