<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query"
import { createCard } from "@coffee-card/shared"
import { useRoute, useRouter } from "vue-router"
import { onMounted, ref } from "vue"

const route = useRoute()
const router = useRouter()

const creating = ref(true)

const { mutate, error } = useMutation({
  mutationFn: () => createCard(route.params.storeId as string),
  onSuccess: (newData) => {
    creating.value = false
    localStorage.setItem("last-viewed-card-id", newData.cardId)
    
    try {
      const existing = localStorage.getItem("my-coffee-cards")
      const list: string[] = existing ? JSON.parse(existing) : []
      if (!list.includes(newData.cardId)) {
        list.push(newData.cardId)
        localStorage.setItem("my-coffee-cards", JSON.stringify(list))
      }
    } catch (err) {
      console.error("Failed to save card to wallet", err)
    }

    setTimeout(() => {
      router.push(`/card/${newData.cardId}`)
    }, 1000)
  },
})

onMounted(() => {
  mutate()
})
</script>

<template>
  <main>
    <h1 v-if="creating">Creating card..</h1>
    <h1 v-else>Card created!</h1>
    <p v-if="error">Error creating card: {{ error }}</p>
  </main>
</template>
