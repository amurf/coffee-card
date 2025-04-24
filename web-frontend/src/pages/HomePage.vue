<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"
import { getStoreById } from "@coffee-card/shared"

const { data, error, isLoading } = useQuery({
  queryKey: ["data"],
  queryFn: () => getStoreById("hadoubrew"),
})
</script>

<template>
  <main>
    <h1>Home page</h1>
    <p>Probably a list of available stores + basic search goes here</p>
    <pre>{{ data }}</pre>
    <p v-if="error">{{ error }}</p>
  </main>
</template>
