<script setup lang="ts">
import { RouterView, useRoute, useRouter } from "vue-router"
import { onMounted } from "vue"

const router = useRouter()
const route = useRoute()

onMounted(() => {
  const lastCardId = localStorage.getItem("last-viewed-card-id")
  if (lastCardId && route.path === "/") {
    router.push(`/card/${lastCardId}`)
  }
})
</script>

<template>
  <RouterView />
</template>
