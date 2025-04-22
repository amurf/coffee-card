<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query"
import { apiBaseUrl } from "@/api"
import type { StoreProfile } from "@coffee-card/shared"
import { useRoute, useRouter } from "vue-router"
import { onMounted, ref } from "vue"
// TODO: sort out how to get api url into app
const apiUrl = `${apiBaseUrl}/stores/hadoubrew`
const route = useRoute()
const router = useRouter()
const createCardUrl = `${apiBaseUrl}/stores/${route.params.storeId}/cards`

const creating = ref(true)

const { mutate: createCard, error } = useMutation({
  mutationFn: async () => {
    const response = await fetch(createCardUrl, {
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
    creating.value = false
    setTimeout(() => {
      router.push(`/card/${newData.cardId}`)
    }, 1000)
  },
})

onMounted(() => {
  createCard()
})
</script>

<template>
  <main>
    <h1 v-if="creating">Creating card..</h1>
    <h1 v-else>Card created!</h1>
    <p v-if="error">Error creating card: {{ error }}</p>
  </main>
</template>
