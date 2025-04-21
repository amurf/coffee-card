<script setup lang="ts">
import { useQuery, useQueryClient, useMutation } from "@tanstack/vue-query"
import { apiBaseUrl } from "@/api"
import type { LoyaltyCard } from "@coffee-card/shared"
// TODO: sort out how to get api url into app
const apiUrl = `${apiBaseUrl}/cards/b21c9815-82f5-4590-8330-7af6130e33ab`
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
const redeemUrl = `${apiBaseUrl}/cards/b21c9815-82f5-4590-8330-7af6130e33ab/redeem?coffeeCount=1`
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
  <main>
    <h1>Card page</h1>
    <pre>{{ data }}</pre>
    <p v-if="error">{{ error }}</p>

    <button @click="() => redeem()">Redeem</button>
  </main>
</template>
