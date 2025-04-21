<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"
import { apiBaseUrl } from "@/api"
import type { StoreProfile } from "@coffee-card/shared"
// TODO: sort out how to get api url into app
const apiUrl = `${apiBaseUrl}/stores/COFFEELADS`
const fetchData = async () => {
  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error("Network response was not ok")
  }
  return response.json()
}

const { data, error, isLoading } = useQuery<StoreProfile>({
  queryKey: ["data"],
  queryFn: fetchData,
})
</script>

<template>
  <main>
    <h1>Home page</h1>
    <pre>{{ data }}</pre>
    <p v-if="error">{{ error }}</p>
  </main>
</template>
