import { createRouter, createWebHistory } from "vue-router"

import AdminLayout from "@/layouts/AdminLayout.vue"
import LoginView from "@/views/auth/LoginView.vue"
import OtpView from "@/views/auth/OtpView.vue"
import SignupView from "@/views/auth/SignupView.vue"
import DashboardView from "@/views/dashboard/DashboardView.vue"
import SettingsView from "@/views/settings/SettingsView.vue"
import UsersView from "@/views/users/UsersView.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: {
        title: "登录",
      },
    },
    {
      path: "/signup",
      name: "signup",
      component: SignupView,
      meta: {
        title: "注册",
      },
    },
    {
      path: "/otp",
      name: "otp",
      component: OtpView,
      meta: {
        title: "验证码登录",
      },
    },
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
            title: "工作台",
          },
        },
        {
          path: "users",
          name: "users",
          component: UsersView,
          meta: {
            title: "报警查询",
          },
        },
        {
          path: "settings",
          name: "settings",
          component: SettingsView,
          meta: {
            title: "总报表",
          },
        },
      ],
    },
  ],
})

export default router
