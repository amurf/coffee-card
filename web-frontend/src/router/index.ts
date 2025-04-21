import { createRouter, createWebHistory } from "vue-router"
import HomeView from "../pages/HomePage.vue"
import CardPage from "../pages/CardPage.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/card/:cardId",
      name: "card",
      component: CardPage,
    },
  ],
})

export default router
