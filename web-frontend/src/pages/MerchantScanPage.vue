<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue"
import {
  getStoreById,
  verifyQrToken,
  addStamps,
  claimReward,
  type LoyaltyCardDto,
  type StoreProfileDto,
} from "@coffee-card/shared"
import { Html5QrcodeScanner } from "html5-qrcode"
import {
  Store,
  Lock,
  QrCode,
  LogOut,
  Gift,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-vue-next"

// Auth State
const isLoggedIn = ref(false)
const storeNameInput = ref("")
const passcodeInput = ref("")
const authError = ref("")
const isLoggingIn = ref(false)

const storeProfile = ref<StoreProfileDto | null>(null)
const savedStoreName = ref("")
const savedPasscode = ref("")

// Scanner State
const scanner = ref<Html5QrcodeScanner | null>(null)
const scanError = ref("")
const manualToken = ref("")
const isVerifying = ref(false)

// Scanned Card State
const activeCard = ref<LoyaltyCardDto | null>(null)
const stampsToAdd = ref(1)
const isActioning = ref(false)
const actionSuccessMsg = ref("")
const actionErrorMsg = ref("")

// Initial Auth Check
onMounted(() => {
  const shop = localStorage.getItem("merchant-store-name")
  const code = localStorage.getItem("merchant-passcode")

  if (shop && code) {
    savedStoreName.value = shop
    savedPasscode.value = code
    loginStore(shop, code)
  }
})

onUnmounted(() => {
  stopScanner()
})

async function loginStore(shopName: string, code: string) {
  isLoggingIn.value = true
  authError.value = ""
  try {
    const store = await getStoreById(shopName)
    if (!store) {
      throw new Error("Store profile not found")
    }

    if (store.merchantPasscode && store.merchantPasscode !== code) {
      throw new Error("Invalid store passcode")
    }

    // Success
    storeProfile.value = store
    savedStoreName.value = shopName
    savedPasscode.value = code
    localStorage.setItem("merchant-store-name", shopName)
    localStorage.setItem("merchant-passcode", code)
    isLoggedIn.value = true
    nextTick(() => {
      startScanner()
    })
  } catch (err: any) {
    authError.value = err.message || "Failed to authenticate store"
    logoutStore()
  } finally {
    isLoggingIn.value = false
  }
}

function handleLoginSubmit() {
  if (!storeNameInput.value || !passcodeInput.value) {
    authError.value = "Please fill in all fields"
    return
  }
  loginStore(storeNameInput.value.trim(), passcodeInput.value.trim())
}

function logoutStore() {
  stopScanner()
  isLoggedIn.value = false
  storeProfile.value = null
  savedStoreName.value = ""
  savedPasscode.value = ""
  localStorage.removeItem("merchant-store-name")
  localStorage.removeItem("merchant-passcode")
  activeCard.value = null
}

// Scanner Functions
function startScanner() {
  stopScanner()
  scanError.value = ""

  // Wait for the DOM element to render
  setTimeout(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false,
    )

    html5QrcodeScanner.render(
      async (decodedText) => {
        html5QrcodeScanner.clear()
        verifyScannedToken(decodedText)
      },
      (error) => {
        // Quietly fail scanning ticks
      },
    )

    scanner.value = html5QrcodeScanner
  }, 100)
}

function stopScanner() {
  if (scanner.value) {
    try {
      scanner.value.clear()
    } catch (e) {
      // Ignore
    }
    scanner.value = null
  }
}

async function verifyScannedToken(token: string) {
  isVerifying.value = true
  scanError.value = ""
  actionErrorMsg.value = ""
  actionSuccessMsg.value = ""

  try {
    const result = await verifyQrToken(token)

    // Enforce tenant isolation
    if (result.card.storeName.toLowerCase() !== storeProfile.value?.storeName.toLowerCase()) {
      throw new Error("This card belongs to a different store.")
    }

    activeCard.value = result.card
    stopScanner()
  } catch (err: any) {
    scanError.value = err.response ? (await err.response.json()).error : err.message || "Invalid card token"
    // Restart scanner on error
    startScanner()
  } finally {
    isVerifying.value = false
  }
}

function handleManualVerify() {
  if (!manualToken.value) return
  verifyScannedToken(manualToken.value.trim())
  manualToken.value = ""
}

// Action Functions
async function handleAddStamps() {
  if (!activeCard.value || stampsToAdd.value <= 0) return
  isActioning.value = true
  actionErrorMsg.value = ""
  actionSuccessMsg.value = ""

  try {
    const updated = await addStamps(
      activeCard.value.cardId,
      stampsToAdd.value,
      savedPasscode.value,
    )
    activeCard.value = updated
    actionSuccessMsg.value = `Successfully awarded ${stampsToAdd.value} stamp(s)!`
    stampsToAdd.value = 1
  } catch (err: any) {
    actionErrorMsg.value = err.message || "Failed to award stamps"
  } finally {
    isActioning.value = false
  }
}

async function handleClaimReward(milestoneId: string) {
  if (!activeCard.value) return
  isActioning.value = true
  actionErrorMsg.value = ""
  actionSuccessMsg.value = ""

  try {
    const updated = await claimReward(
      activeCard.value.cardId,
      milestoneId,
      savedPasscode.value,
    )
    activeCard.value = updated
    actionSuccessMsg.value = "Reward successfully claimed!"
  } catch (err: any) {
    actionErrorMsg.value = err.message || "Failed to claim reward"
  } finally {
    isActioning.value = false
  }
}

function resetActiveCard() {
  activeCard.value = null
  actionSuccessMsg.value = ""
  actionErrorMsg.value = ""
  startScanner()
}

// Render slots helper
const maxStamps = (milestones: any[]) => {
  if (!milestones || !milestones.length) return 10
  return Math.max(...milestones.map((m) => m.stampsRequired), 10)
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center p-4">
    
    <!-- HEADER -->
    <header class="w-full max-w-md flex items-center justify-between py-4 mb-6 border-b border-slate-200">
      <div class="flex items-center gap-2">
        <div class="bg-primary text-white p-2 rounded-xl">
          <Store class="h-6 w-6" />
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight">Merchant Portal</h1>
          <p v-if="isLoggedIn && storeProfile" class="text-xs text-slate-500 font-semibold uppercase">
            {{ storeProfile.storeName }}
          </p>
        </div>
      </div>

      <button
        v-if="isLoggedIn"
        @click="logoutStore"
        class="text-xs text-red-500 font-medium hover:text-red-700 transition flex items-center gap-1 border border-red-200 bg-red-50 px-2.5 py-1.5 rounded-lg"
      >
        <LogOut class="h-3.5 w-3.5" />
        Sign Out
      </button>
    </header>

    <!-- CONTENT BODY -->
    <main class="w-full max-w-md">

      <!-- 1. LOGIN SCREEN -->
      <div v-if="!isLoggedIn" class="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div class="text-center mb-6">
          <div class="inline-flex bg-slate-100 p-3 rounded-full mb-3 text-slate-600">
            <Lock class="h-6 w-6" />
          </div>
          <h2 class="text-xl font-bold">Access Terminal</h2>
          <p class="text-sm text-slate-500 mt-1">Authenticate to begin scanning cards</p>
        </div>

        <form @submit.prevent="handleLoginSubmit" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Store ID / Name</label>
            <input
              type="text"
              v-model="storeNameInput"
              placeholder="e.g. Hadoubrew"
              class="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              :disabled="isLoggingIn"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Passcode</label>
            <input
              type="password"
              v-model="passcodeInput"
              placeholder="••••"
              class="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition tracking-widest text-center text-lg"
              maxlength="10"
              :disabled="isLoggingIn"
            />
          </div>

          <div v-if="authError" class="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-start gap-2 border border-red-100">
            <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
            <span>{{ authError }}</span>
          </div>

          <button
            type="submit"
            class="w-full bg-primary hover:opacity-90 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            :disabled="isLoggingIn"
          >
            <RefreshCw v-if="isLoggingIn" class="h-4 w-4 animate-spin" />
            <span>{{ isLoggingIn ? 'Verifying...' : 'Sign In' }}</span>
          </button>
        </form>
      </div>

      <!-- 2. ACTIVE SCANNER SCREEN -->
      <div v-else-if="!activeCard" class="space-y-4 animate-in fade-in duration-300">
        <div class="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col items-center">
          <h2 class="text-md font-bold mb-4 flex items-center gap-2 self-start">
            <QrCode class="h-5 w-5 text-primary" />
            Scan Customer Card
          </h2>

          <div class="w-full aspect-square max-w-[300px] overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 relative mb-4 bg-slate-50 flex items-center justify-center">
            <div id="qr-reader" class="w-full h-full"></div>
            <div v-if="isVerifying" class="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white gap-3 rounded-2xl backdrop-blur-xs">
              <RefreshCw class="h-8 w-8 animate-spin" />
              <span class="text-sm font-semibold">Verifying scan...</span>
            </div>
          </div>

          <div v-if="scanError" class="w-full p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-start gap-2 border border-red-100 mb-4">
            <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
            <span>{{ scanError }}</span>
          </div>

          <div class="w-full border-t border-slate-100 pt-4 mt-2">
            <p class="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Or enter scan token manually</p>
            <div class="flex gap-2">
              <input
                type="text"
                v-model="manualToken"
                placeholder="Paste code token..."
                class="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
              <button
                @click="handleManualVerify"
                class="bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-700 transition"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. CARD VIEW & ACTIONS SCREEN -->
      <div v-else class="space-y-5 animate-in fade-in duration-300">
        
        <!-- CARD INFO -->
        <div class="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
          <div class="flex items-center justify-between mb-4">
            <button
              @click="resetActiveCard"
              class="text-xs text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
            >
              <ArrowLeft class="h-4 w-4" />
              Scan Code
            </button>
            <span class="text-xs bg-blue-50 text-blue-600 font-bold px-2.5 py-1 rounded-full border border-blue-100">Card Active</span>
          </div>

          <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Loyalty Account UUID</p>
          <p class="text-xs font-mono bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-600 break-all mb-4">
            {{ activeCard.cardId }}
          </p>

          <div class="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Stamp Progress</h3>
            
            <div class="grid grid-cols-[repeat(auto-fit,minmax(42px,1fr))] gap-2 w-full max-w-[320px]">
              <div
                v-for="slotNum in Array.from({ length: maxStamps(storeProfile?.rewardRules?.milestones || []) }, (_, i) => i + 1)"
                :key="slotNum"
                class="aspect-square rounded-full border flex items-center justify-center transition-all text-sm"
                :class="[
                  slotNum <= activeCard.stampCount
                    ? 'bg-blue-500 border-blue-600 text-white shadow-xs font-bold'
                    : 'bg-white border-dashed border-slate-200 text-slate-300'
                ]"
              >
                <span v-if="slotNum <= activeCard.stampCount">✓</span>
                <span v-else class="text-xs font-semibold">{{ slotNum }}</span>
              </div>
            </div>

            <p class="text-sm font-bold text-slate-700 mt-4">{{ activeCard.stampCount }} stamps collected</p>
          </div>
        </div>

        <!-- NOTIFICATIONS -->
        <div v-if="actionSuccessMsg" class="p-4 bg-green-50 text-green-700 rounded-2xl text-sm flex items-start gap-2.5 border border-green-100 animate-in zoom-in-95 duration-200">
          <CheckCircle class="h-5 w-5 shrink-0 mt-0.5 text-green-600" />
          <span class="font-medium">{{ actionSuccessMsg }}</span>
        </div>
        
        <div v-if="actionErrorMsg" class="p-4 bg-red-50 text-red-700 rounded-2xl text-sm flex items-start gap-2.5 border border-red-100">
          <AlertCircle class="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
          <span class="font-medium">{{ actionErrorMsg }}</span>
        </div>

        <!-- ACTIONS PANEL -->
        <div class="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
          
          <!-- ADD STAMPS SECTION -->
          <div class="space-y-3">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500">Award Stamps</h3>
            
            <div class="flex items-center gap-4">
              <div class="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shrink-0">
                <button
                  type="button"
                  @click="stampsToAdd = Math.max(1, stampsToAdd - 1)"
                  class="p-3 hover:bg-slate-200 transition text-slate-600"
                  :disabled="isActioning"
                >
                  <Minus class="h-4 w-4" />
                </button>
                <span class="px-5 font-bold text-lg text-slate-800 min-w-[40px] text-center">
                  {{ stampsToAdd }}
                </span>
                <button
                  type="button"
                  @click="stampsToAdd = stampsToAdd + 1"
                  class="p-3 hover:bg-slate-200 transition text-slate-600"
                  :disabled="isActioning"
                >
                  <Plus class="h-4 w-4" />
                </button>
              </div>

              <button
                @click="handleAddStamps"
                class="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                :disabled="isActioning"
              >
                <RefreshCw v-if="isActioning" class="h-4 w-4 animate-spin" />
                <span>Grant {{ stampsToAdd }} Stamps</span>
              </button>
            </div>
          </div>

          <hr class="border-slate-100" />

          <!-- REDEEM PERKS SECTION -->
          <div class="space-y-4">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500">Available Perks</h3>

            <div v-if="!storeProfile?.rewardRules?.milestones?.length" class="text-slate-400 text-xs py-2">
              No loyalty milestones configured for this store.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="milestone in storeProfile.rewardRules.milestones"
                :key="milestone.id"
                class="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl flex items-center justify-between gap-3"
              >
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-500 uppercase bg-slate-200 px-2 py-0.5 rounded-sm">
                      {{ milestone.stampsRequired }} stamps
                    </span>
                    <span
                      v-if="activeCard.redeemedMilestones?.includes(milestone.id)"
                      class="text-[10px] font-bold text-green-600 uppercase bg-green-50 px-1.5 py-0.5 rounded-sm border border-green-100"
                    >
                      Redeemed
                    </span>
                    <span
                      v-else-if="activeCard.stampCount < milestone.stampsRequired"
                      class="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded-sm"
                    >
                      Locked
                    </span>
                  </div>
                  <h4 class="text-sm font-bold text-slate-800">{{ milestone.description }}</h4>
                </div>

                <button
                  @click="handleClaimReward(milestone.id)"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                  :disabled="isActioning || activeCard.redeemedMilestones?.includes(milestone.id) || activeCard.stampCount < milestone.stampsRequired"
                >
                  <Gift class="h-4 w-4" />
                  <span>Claim</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          @click="resetActiveCard"
          class="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-700 transition flex items-center justify-center gap-2"
        >
          <QrCode class="h-4 w-4" />
          <span>Scan Another Card</span>
        </button>

      </div>
    </main>
  </div>
</template>
