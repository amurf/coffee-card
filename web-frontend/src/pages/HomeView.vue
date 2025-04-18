<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"
// TODO: sort out how to get api url into app
const apiUrl =
  "https://8tlauhpjtf.execute-api.ap-southeast-2.amazonaws.com/dev/card/f47ac10b-58cc-4372-a567-0e02b2c3d479"
const fetchData = async () => {
  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error("Network response was not ok")
  }
  return response.json()
}

const { data, error, isLoading } = useQuery({
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
