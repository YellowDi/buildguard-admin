import { createRouter, createWebHistory } from "vue-router"

import AdminLayout from "@/layouts/AdminLayout.vue"
import AlarmArchivesView from "@/views/AlarmArchivesView.vue"
import LoginView from "@/views/auth/LoginView.vue"
import OtpView from "@/views/auth/OtpView.vue"
import SignupView from "@/views/auth/SignupView.vue"
import AlarmQueriesView from "@/views/AlarmQueriesView.vue"
import CompaniesView from "@/views/CompaniesView.vue"
import CompanyDetailView from "@/views/detail/CompanyDetailView.vue"
import DashboardView from "@/views/dashboard/DashboardView.vue"
import CompanyCreateView from "@/views/form/CompanyCreateView.vue"
import UserCreateView from "@/views/form/UserCreateView.vue"
import VehicleCreateView from "@/views/form/VehicleCreateView.vue"
import UsersView from "@/views/UsersView.vue"
import VehiclesView from "@/views/VehiclesView.vue"

type BreadcrumbMetaItem = {
  title: string
  to?: string
}

type RouteMetaConfig = {
  title: string
  breadcrumb?: BreadcrumbMetaItem[]
  useDetailBreadcrumbTitle?: boolean
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: {
        title: "登录",
      } satisfies RouteMetaConfig,
    },
    {
      path: "/signup",
      name: "signup",
      component: SignupView,
      meta: {
        title: "注册",
      } satisfies RouteMetaConfig,
    },
    {
      path: "/otp",
      name: "otp",
      component: OtpView,
      meta: {
        title: "验证码登录",
      } satisfies RouteMetaConfig,
    },
    {
      path: "/",
      component: AdminLayout,
      meta: {
        title: "BuildGuard",
      } satisfies RouteMetaConfig,
      children: [
        {
          path: "",
          name: "dashboard",
          component: DashboardView,
          meta: {
            title: "工作台",
          } satisfies RouteMetaConfig,
        },
        {
          path: "companies",
          name: "companies",
          component: CompaniesView,
          meta: {
            title: "企业",
          } satisfies RouteMetaConfig,
        },
        {
          path: "companies/:id",
          name: "company-detail",
          component: CompanyDetailView,
          meta: {
            title: "企业详情",
            useDetailBreadcrumbTitle: true,
            breadcrumb: [
              { title: "企业", to: "companies" },
              { title: "详情" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "companies/create",
          name: "company-create",
          component: CompanyCreateView,
          meta: {
            title: "添加企业",
            breadcrumb: [
              { title: "企业", to: "companies" },
              { title: "添加企业" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "vehicles",
          name: "vehicles",
          component: VehiclesView,
          meta: {
            title: "车辆",
          } satisfies RouteMetaConfig,
        },
        {
          path: "vehicles/create",
          name: "vehicle-create",
          component: VehicleCreateView,
          meta: {
            title: "添加车辆",
            breadcrumb: [
              { title: "车辆", to: "vehicles" },
              { title: "添加车辆" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "users",
          name: "users",
          component: UsersView,
          meta: {
            title: "从业人员",
          } satisfies RouteMetaConfig,
        },
        {
          path: "alarm-queries",
          name: "alarm-queries",
          component: AlarmQueriesView,
          meta: {
            title: "报警查询",
          } satisfies RouteMetaConfig,
        },
        {
          path: "alarm-archives",
          name: "alarm-archives",
          component: AlarmArchivesView,
          meta: {
            title: "历史归档",
          } satisfies RouteMetaConfig,
        },
        {
          path: "users/create",
          name: "user-create",
          component: UserCreateView,
          meta: {
            title: "添加从业人员",
            breadcrumb: [
              { title: "从业人员", to: "users" },
              { title: "添加从业人员" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
      ],
    },
  ],
})

export default router
