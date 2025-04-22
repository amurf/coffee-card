<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { useQuery, useQueryClient, useMutation } from "@tanstack/vue-query"
import { apiBaseUrl } from "@/api"
import type { LoyaltyCard } from "@coffee-card/shared"
import { useRoute } from "vue-router"
import CardDescription from "@/components/ui/card/CardDescription.vue"
// TODO: sort out how to get api url into app
const route = useRoute()
const cardId = route.params.cardId
const apiUrl = `${apiBaseUrl}/cards/${cardId}`
const fetchData = async () => {
  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error("Network response was not ok")
  }
  return response.json()
}

const { data, error, isLoading } = useQuery<LoyaltyCard>({
  queryKey: ["data"],
  queryFn: fetchData,
})

// Redeem mutation
const queryClient = useQueryClient() // Initialize query client
const redeemUrl = `${apiBaseUrl}/cards/${cardId}/redeem?coffeeCount=7`
const { mutate: redeem } = useMutation<LoyaltyCard>({
  mutationFn: async () => {
    const response = await fetch(redeemUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) {
      throw new Error("Network response was not ok")
    }
    return response.json()
  },
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
        Count: {{ data.coffeeCount }} Freebies: {{ data.coffeesEarned }} Redeemed:
        {{ data.coffeesRedeemed }}
      </CardContent>
      <CardFooter class="gap-1">
        <!-- TODO: redeem is probably need the right word here. -->
        <Button @click="() => redeem()">Redeem</Button>
        <Button v-if="data.coffeesEarned" @click="() => console.log('Claim via QR code?')">
          Claim up to {{ data.coffeesEarned }} free coffees!
        </Button>
      </CardFooter>
    </Card>
  </main>
</template>
