import "./assets/main.css"

import { createApp } from "vue"
import App from "./App.vue"
import router from "./router"

import { VueQueryPlugin } from "@tanstack/vue-query"

import { configureApi } from "@coffee-card/shared"

const app = createApp(App)

configureApi(import.meta.env.VITE_API_URL)

app.use(router)
app.use(VueQueryPlugin)

app.mount("#app")
