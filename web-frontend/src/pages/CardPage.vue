<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { useQuery, useQueryClient, useMutation } from "@tanstack/vue-query"
import { apiBaseUrl } from "@/api"
import type { LoyaltyCard } from "@coffee-card/shared"
import { useRoute } from "vue-router"
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
const redeemUrl = `${apiBaseUrl}/cards/${cardId}/redeem?coffeeCount=1`
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
      </CardHeader>
      <CardContent> Count: {{ data.coffeeCount }} </CardContent>
      <CardFooter>
        <Button @click="() => redeem()">Redeem</Button>
      </CardFooter>
    </Card>
  </main>
</template>
