import { createRouter, createWebHistory } from "vue-router"

import AdminLayout from "@/layouts/AdminLayout.vue"
import DashboardView from "@/views/dashboard/DashboardView.vue"
import SettingsView from "@/views/settings/SettingsView.vue"
import UsersView from "@/views/users/UsersView.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: AdminLayout,
      meta: {
        title: "BuildGuard",
      },
      children: [
        {
          path: "",
          name: "dashboard",
          component: DashboardView,
          meta: {
            title: "button.vue",
          },
        },
        {
          path: "users",
          name: "users",
          component: UsersView,
          meta: {
            title: "breadcrumb.vue",
          },
        },
        {
          path: "settings",
          name: "settings",
          component: SettingsView,
          meta: {
            title: "dialog.vue",
          },
        },
      ],
    },
  ],
})

export default router
