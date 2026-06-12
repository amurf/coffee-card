import { createRouter, createWebHistory } from "vue-router"
import CardPage from "../pages/CardPage.vue"
import CreateCardPage from "../pages/CreateCardPage.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../pages/HomePage.vue"),
    },
    {
      path: "/create-card/:storeId",
      name: "create-card",
      component: CreateCardPage,
    },
    {
      path: "/card/:cardId",
      name: "card",
      component: CardPage,
    },
  ],
})

export default router
