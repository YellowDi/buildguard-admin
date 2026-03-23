import { createRouter, createWebHistory } from "vue-router"

import { beginRouteLoading, endRouteLoading, type RouteLoadingKind } from "@/composables/useRouteLoadingState"
import AppShellLayout from "@/layouts/AppShellLayout.vue"

type BreadcrumbMetaItem = {
  title: string
  to?: string
}

type RouteMetaConfig = {
  title: string
  loading: RouteLoadingKind
  breadcrumb?: BreadcrumbMetaItem[]
  useDetailBreadcrumbTitle?: boolean
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/auth/LoginView.vue"),
      meta: {
        title: "登录",
        loading: "auth",
      } satisfies RouteMetaConfig,
    },
    {
      path: "/signup",
      name: "signup",
      component: () => import("@/views/auth/SignupView.vue"),
      meta: {
        title: "注册",
        loading: "auth",
      } satisfies RouteMetaConfig,
    },
    {
      path: "/otp",
      name: "otp",
      component: () => import("@/views/auth/OtpView.vue"),
      meta: {
        title: "验证码登录",
        loading: "auth",
      } satisfies RouteMetaConfig,
    },
    {
      path: "/",
      component: AppShellLayout,
      meta: {
        title: "Workspace",
        loading: "dashboard",
      } satisfies RouteMetaConfig,
      children: [
        {
          path: "",
          name: "dashboard",
          component: () => import("@/views/dashboard/DashboardView.vue"),
          meta: {
            title: "工作台",
            loading: "dashboard",
          } satisfies RouteMetaConfig,
        },
        {
          path: "customers",
          name: "customers",
          component: () => import("@/views/list/CustomersListView.vue"),
          meta: {
            title: "客户",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "customers/:id",
          name: "customer-detail",
          component: () => import("@/views/detail/CustomerDetailView.vue"),
          meta: {
            title: "客户详情",
            loading: "detail",
            useDetailBreadcrumbTitle: true,
            breadcrumb: [
              { title: "客户", to: "customers" },
              { title: "详情" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "customers/create",
          name: "customer-create",
          component: () => import("@/views/form/CustomerCreateView.vue"),
          meta: {
            title: "添加客户",
            loading: "form",
            breadcrumb: [
              { title: "客户", to: "customers" },
              { title: "添加客户" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "companies",
          name: "companies",
          component: () => import("@/views/list/CompaniesListView.vue"),
          meta: {
            title: "企业",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "parks",
          name: "parks",
          component: () => import("@/views/list/ParksListView.vue"),
          meta: {
            title: "园区",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "parks/:id",
          name: "park-detail",
          component: () => import("@/views/detail/ParkDetailView.vue"),
          meta: {
            title: "园区详情",
            loading: "detail",
            useDetailBreadcrumbTitle: true,
            breadcrumb: [
              { title: "园区", to: "parks" },
              { title: "详情" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "buildings/:id",
          name: "building-detail",
          component: () => import("@/views/detail/BuildingDetailView.vue"),
          meta: {
            title: "建筑详情",
            loading: "detail",
            useDetailBreadcrumbTitle: true,
            breadcrumb: [
              { title: "园区", to: "parks" },
              { title: "建筑详情" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "companies/:id",
          name: "company-detail",
          component: () => import("@/views/detail/CompanyDetailView.vue"),
          meta: {
            title: "企业详情",
            loading: "detail",
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
          component: () => import("@/views/form/CompanyCreateView.vue"),
          meta: {
            title: "添加企业",
            loading: "form",
            breadcrumb: [
              { title: "企业", to: "companies" },
              { title: "添加企业" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "vehicles",
          name: "vehicles",
          component: () => import("@/views/list/VehiclesListView.vue"),
          meta: {
            title: "车辆",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "vehicles/create",
          name: "vehicle-create",
          component: () => import("@/views/form/VehicleCreateView.vue"),
          meta: {
            title: "添加车辆",
            loading: "form",
            breadcrumb: [
              { title: "车辆", to: "vehicles" },
              { title: "添加车辆" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "users",
          name: "users",
          component: () => import("@/views/list/UsersListView.vue"),
          meta: {
            title: "从业人员",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "call-center-tasks",
          name: "call-center-tasks",
          component: () => import("@/views/list/CallCenterOutboundTasksListView.vue"),
          meta: {
            title: "外呼任务",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "alarm-queries",
          name: "alarm-queries",
          component: () => import("@/views/list/AlarmQueriesListView.vue"),
          meta: {
            title: "报警查询",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "alarm-archives",
          name: "alarm-archives",
          component: () => import("@/views/list/AlarmArchivesListView.vue"),
          meta: {
            title: "历史归档",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "users/create",
          name: "user-create",
          component: () => import("@/views/form/UserCreateView.vue"),
          meta: {
            title: "添加从业人员",
            loading: "form",
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

function resolveRouteLoadingKind(value: unknown): RouteLoadingKind {
  return value === "auth" || value === "dashboard" || value === "table" || value === "detail" || value === "form"
    ? value
    : "table"
}

router.beforeEach((to) => {
  beginRouteLoading(resolveRouteLoadingKind(to.meta.loading))
})

router.afterEach(() => {
  endRouteLoading()
})

router.onError(() => {
  endRouteLoading()
})

export default router
