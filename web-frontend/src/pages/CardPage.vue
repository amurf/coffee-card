<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { useQuery } from "@tanstack/vue-query"
import { getCardById, getStoreById } from "@coffee-card/shared"
import { useRoute } from "vue-router"
import CardDescription from "@/components/ui/card/CardDescription.vue"

import QRCode from "qrcode"
import { onMounted, useTemplateRef, computed } from "vue"

const route = useRoute()
const cardId = route.params.cardId

const canvasRef = useTemplateRef("canvas")
async function generateQRCode() {
  try {
    const canvas = canvasRef.value
    if (!canvas) {
      return ""
    }

    canvas.width = 200 // Set canvas width
    canvas.height = 200 // Set canvas height
    await QRCode.toCanvas(canvas, cardId, { errorCorrectionLevel: "H" })
  } catch (error) {
    console.error(error)
  }
}
onMounted(() => {
  generateQRCode()
  if (cardId) {
    localStorage.setItem("last-viewed-card-id", cardId as string)
  }
  console.log("Generated!")
})

const { data: card, error, isLoading } = useQuery({
  queryKey: ["card", cardId],
  queryFn: () => getCardById(cardId as string),
})

const { data: store, isLoading: isStoreLoading } = useQuery({
  queryKey: computed(() => ["store", card.value?.storeName]),
  queryFn: () => getStoreById(card.value!.storeName),
  enabled: computed(() => !!card.value?.storeName),
})

const maxStamps = computed(() => {
  if (!store.value?.rewardRules?.milestones?.length) return 10
  return Math.max(...store.value.rewardRules.milestones.map((m: any) => m.stampsRequired), 10)
})

const slots = computed(() => {
  return Array.from({ length: maxStamps.value }, (_, i) => i + 1)
})

const getMilestone = (slotNum: number) => {
  return store.value?.rewardRules?.milestones?.find((m: any) => m.stampsRequired === slotNum)
}

const isMilestoneRedeemed = (milestoneId: string) => {
  return card.value?.redeemedMilestones?.includes(milestoneId)
}

</script>

<template>
  <main class="m-2">
    <Card v-if="card" :style="{ backgroundColor: store?.themeOptions?.primaryColor, color: store?.themeOptions?.secondaryColor }">
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <span>{{ card.storeName }}</span>
          <img v-if="store?.themeOptions?.logoUrl" :src="store.themeOptions.logoUrl" alt="Store Logo" class="h-8 w-auto object-contain" />
        </CardTitle>
        <CardDescription :style="{ color: store?.themeOptions?.secondaryColor, opacity: 0.9 }">
          <!-- It's probably worth adding a city at the very least for the store -->
          Tokyo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-col items-center gap-6 mt-4">
          <div class="w-full bg-slate-50/50 p-6 rounded-2xl border">
            <h3 class="text-sm font-semibold mb-5 text-slate-800 text-center uppercase tracking-wider">Your Stamps</h3>
            <div class="grid grid-cols-[repeat(auto-fit,minmax(50px,1fr))] gap-y-4 gap-x-2">
              <div v-for="slotNum in slots" :key="slotNum" class="relative group flex justify-center">
                
                <div
                  v-if="getMilestone(slotNum)"
                  class="h-[52px] w-[52px] rounded-full flex items-center justify-center text-xl transition-all border-2 cursor-help"
                  :class="[
                    isMilestoneRedeemed(getMilestone(slotNum)!.id)
                      ? 'bg-slate-200 border-slate-300 opacity-60'
                      : slotNum <= card.coffeeCount 
                        ? 'bg-blue-100 border-blue-600 text-blue-600 shadow-sm' 
                        : 'bg-white border-dashed border-slate-300'
                  ]"
                >
                  {{ slotNum === maxStamps ? '🏆' : '🎁' }}
                </div>
                
                <div v-else class="h-[52px] w-[52px] rounded-full flex items-center justify-center text-2xl transition-all border"
                  :class="[
                    slotNum <= card.coffeeCount 
                      ? 'bg-blue-500 border-blue-600 text-white shadow-sm' 
                      : 'bg-slate-100 border-dashed border-slate-300'
                  ]">
                  <span v-if="slotNum <= card.coffeeCount">✓</span>
                </div>

                <div v-if="getMilestone(slotNum)" class="absolute bottom-full mb-3 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg w-max max-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center shadow-xl pointer-events-none">
                  <strong class="block mb-1 font-semibold">{{ slotNum }} Stamps</strong>
                  {{ getMilestone(slotNum)!.description }}
                  <div v-if="isMilestoneRedeemed(getMilestone(slotNum)!.id)" class="text-[10px] text-green-400 mt-1.5 uppercase font-bold tracking-wider">Claimed</div>
                </div>

              </div>
            </div>
          </div>
          
          <div class="mt-4 bg-white p-3 rounded-2xl shadow-sm border inline-block">
            <canvas ref="canvas" id="canvas" class="block"></canvas>
          </div>
        </div>
      </CardContent>
    </Card>
  </main>
</template>
