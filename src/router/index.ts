import { createRouter, createWebHistory } from "vue-router"

import AdminLayout from "@/layouts/AdminLayout.vue"
import LoginView from "@/views/auth/LoginView.vue"
import OtpView from "@/views/auth/OtpView.vue"
import SignupView from "@/views/auth/SignupView.vue"
import CompaniesView from "@/views/CompaniesView.vue"
import CompanyCreateView from "@/views/companies/CompanyCreateView.vue"
import DashboardView from "@/views/dashboard/DashboardView.vue"
import SettingsView from "@/views/settings/SettingsView.vue"
import UsersView from "@/views/UsersView.vue"
import VehiclesView from "@/views/VehiclesView.vue"
import UserCreateView from "@/views/users/UserCreateView.vue"

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
          path: "companies",
          name: "companies",
          component: CompaniesView,
          meta: {
            title: "企业",
          },
        },
        {
          path: "companies/create",
          name: "company-create",
          component: CompanyCreateView,
          meta: {
            title: "添加企业",
          },
        },
        {
          path: "vehicles",
          name: "vehicles",
          component: VehiclesView,
          meta: {
            title: "车辆",
          },
        },
        {
          path: "users",
          name: "users",
          component: UsersView,
          meta: {
            title: "从业人员",
          },
        },
        {
          path: "users/create",
          name: "user-create",
          component: UserCreateView,
          meta: {
            title: "添加从业人员",
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
