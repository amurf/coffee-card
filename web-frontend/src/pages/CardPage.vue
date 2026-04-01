<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { useQuery } from "@tanstack/vue-query"
import { getCardById, getStoreById } from "@coffee-card/shared"
import { useRoute } from "vue-router"
import CardDescription from "@/components/ui/card/CardDescription.vue"

import QRCode from "qrcode"
import { onMounted, useTemplateRef } from "vue"

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
  queryKey: ["store", card.value?.storeName],
  queryFn: () => getStoreById(card.value!.storeName),
  enabled: !!card.value?.storeName,
})

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
        <div class="flex align-middle justify-between">
          <ul>
            <li>Count: {{ card.coffeeCount }} / {{ store?.rewardRules?.stampsRequired || 10 }}</li>
            <li>Freebies: {{ card.coffeesEarned }}</li>
            <li>Redeemed: {{ card.coffeesRedeemed }}</li>
          </ul>
          <div>
            <canvas ref="canvas" id="canvas"></canvas>
          </div>
        </div>
      </CardContent>
      <CardFooter class="gap-1">
        <Button v-if="card.coffeesEarned" @click="() => console.log('Claim via QR code?')">
          FREE COFFEE!
        </Button>
      </CardFooter>
    </Card>
  </main>
</template>
