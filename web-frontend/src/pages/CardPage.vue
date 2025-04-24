<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { useQuery, useQueryClient, useMutation } from "@tanstack/vue-query"
import { redeemPurchase, getCardById } from "@coffee-card/shared"
import { useRoute } from "vue-router"
import CardDescription from "@/components/ui/card/CardDescription.vue"

// TODO: move this to BE and remove from FE eventually
import QRCode from "qrcode"
import { onMounted, useTemplateRef } from "vue"
// TODO: sort out how to get api url into app
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
  console.log("Generated!")
})

const { data, error, isLoading } = useQuery({
  queryKey: ["data"],
  queryFn: () => getCardById(cardId as string),
})

// Redeem mutation
const queryClient = useQueryClient() // Initialize query client
const { mutate: redeem } = useMutation({
  mutationFn: () => redeemPurchase(cardId as string, 5),
  onSuccess: (newData) => {
    queryClient.setQueryData(["data"], newData)
    alert("Card redeemed successfully")
  },
})
</script>

<template>
  <main class="m-2">
    <Card v-if="data">
      <CardHeader>
        <CardTitle>
          {{ data.storeName }}
        </CardTitle>
        <CardDescription>
          <!-- It's probably worth adding a city at the very least for the store -->
          Tokyo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex align-middle justify-between">
          <ul>
            <li>Count: {{ data.coffeeCount }}</li>
            <li>Freebies: {{ data.coffeesEarned }}</li>
            <li>Redeemed: {{ data.coffeesRedeemed }}</li>
          </ul>
          <div>
            <canvas ref="canvas" id="canvas"></canvas>
          </div>
        </div>
      </CardContent>
      <CardFooter class="gap-1">
        <!-- TODO: redeem is probably need the right word here. -->
        <Button @click="() => redeem()">Redeem</Button>
        <Button v-if="data.coffeesEarned" @click="() => console.log('Claim via QR code?')">
          FREE COFFEE!
        </Button>
      </CardFooter>
    </Card>
  </main>
</template>
