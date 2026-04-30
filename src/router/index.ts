import { createRouter, createWebHistory } from "vue-router"

import { DEFAULT_SETTINGS_CATEGORY_KEY, isSettingsCategoryKey } from "@/components/settings/types"
import { beginRouteLoading, endRouteLoading, type RouteLoadingKind } from "@/composables/useRouteLoadingState"
import { rememberSettingsBackTarget } from "@/composables/useSettingsNavigation"
import { setCurrentUser } from "@/composables/useCurrentUser"
import { ApiError } from "@/lib/api-errors"
import { fetchCurrentUserInfo } from "@/lib/current-user-api"
import { getAuthState, getAuthToken, notifyAuthExpired } from "@/lib/auth"

type BreadcrumbMetaItem = {
  title: string
  to?: string
}

type RouteMetaConfig = {
  title: string
  loading: RouteLoadingKind
  breadcrumb?: BreadcrumbMetaItem[]
  useDetailBreadcrumbTitle?: boolean
  navActivePath?: string
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
      component: () => import("@/layouts/AppShellLayout.vue"),
      meta: {
        title: "宝京云维",
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
          path: "customers/:id/edit",
          name: "customer-edit",
          component: () => import("@/views/form/CustomerCreateView.vue"),
          meta: {
            title: "修改客户信息",
            loading: "form",
            breadcrumb: [
              { title: "客户", to: "customers" },
              { title: "修改客户信息" },
            ] satisfies BreadcrumbMetaItem[],
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
          path: "buildings",
          name: "buildings",
          component: () => import("@/views/list/BuildingsListView.vue"),
          meta: {
            title: "建筑",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "monitoring",
          name: "monitoring",
          component: () => import("@/views/list/MonitoringListView.vue"),
          meta: {
            title: "监控",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "customers/:id/parks/create",
          name: "customer-park-create",
          component: () => import("@/views/form/ParkCreateView.vue"),
          meta: {
            title: "添加园区",
            loading: "form",
            navActivePath: "/parks",
            breadcrumb: [
              { title: "客户", to: "customers" },
              { title: "客户详情" },
              { title: "添加园区" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "customers/:id/buildings/create",
          name: "customer-building-create",
          component: () => import("@/views/form/BuildingCreateView.vue"),
          meta: {
            title: "添加建筑",
            loading: "form",
            navActivePath: "/buildings",
            breadcrumb: [
              { title: "客户", to: "customers" },
              { title: "客户详情" },
              { title: "添加建筑" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "parks/create",
          name: "park-create",
          component: () => import("@/views/form/ParkCreateView.vue"),
          meta: {
            title: "添加园区",
            loading: "form",
            navActivePath: "/parks",
            breadcrumb: [
              { title: "园区", to: "parks" },
              { title: "添加园区" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "buildings/create",
          name: "building-create",
          component: () => import("@/views/form/BuildingCreateView.vue"),
          meta: {
            title: "添加建筑",
            loading: "form",
            navActivePath: "/buildings",
            breadcrumb: [
              { title: "建筑", to: "buildings" },
              { title: "添加建筑" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "customers/:id/sub-accounts/create",
          name: "customer-sub-account-create",
          component: () => import("@/views/form/CustomerSubAccountCreateView.vue"),
          meta: {
            title: "添加子账号",
            loading: "form",
            breadcrumb: [
              { title: "客户", to: "customers" },
              { title: "客户详情" },
              { title: "添加子账号" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "customers/:id/work-orders/create",
          name: "customer-work-order-create",
          component: () => import("@/views/form/WorkOrderCreateView.vue"),
          props: { kind: "inspection" },
          meta: {
            title: "添加检测工单",
            loading: "form",
            breadcrumb: [
              { title: "客户", to: "customers" },
              { title: "客户详情" },
              { title: "添加检测工单" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "buildings/:id/edit",
          name: "building-edit",
          component: () => import("@/views/form/BuildingCreateView.vue"),
          meta: {
            title: "编辑建筑",
            loading: "form",
            navActivePath: "/buildings",
            breadcrumb: [
              { title: "客户", to: "customers" },
              { title: "客户详情" },
              { title: "编辑建筑" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "parks/:id/edit",
          name: "park-edit",
          component: () => import("@/views/form/ParkCreateView.vue"),
          meta: {
            title: "编辑园区",
            loading: "form",
            navActivePath: "/parks",
            breadcrumb: [
              { title: "客户", to: "customers" },
              { title: "客户详情" },
              { title: "编辑园区" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "inspection-services",
          name: "inspection-services",
          component: () => import("@/views/list/InspectionServicesListView.vue"),
          meta: {
            title: "检测服务",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "inspection-services/create",
          name: "inspection-service-create",
          component: () => import("@/views/form/InspectionServiceCreateView.vue"),
          meta: {
            title: "添加检测服务",
            loading: "form",
            breadcrumb: [
              { title: "检测服务", to: "inspection-services" },
              { title: "添加检测服务" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "inspection-services/:id/edit",
          name: "inspection-service-edit",
          component: () => import("@/views/form/InspectionServiceCreateView.vue"),
          meta: {
            title: "编辑检测服务",
            loading: "form",
            breadcrumb: [
              { title: "检测服务", to: "inspection-services" },
              { title: "详情" },
              { title: "编辑检测服务" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "inspection-plans",
          name: "inspection-plans",
          component: () => import("@/views/list/InspectionPlansListView.vue"),
          meta: {
            title: "检测计划",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "inspection-plans/create",
          name: "inspection-plan-create",
          component: () => import("@/views/form/InspectionPlanCreateView.vue"),
          meta: {
            title: "添加检测计划",
            loading: "form",
            breadcrumb: [
              { title: "检测计划", to: "inspection-plans" },
              { title: "添加检测计划" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "inspection-plans/:id",
          name: "inspection-plan-detail",
          component: () => import("@/views/detail/InspectionPlanDetailView.vue"),
          meta: {
            title: "检测计划详情",
            loading: "detail",
            useDetailBreadcrumbTitle: true,
            breadcrumb: [
              { title: "检测计划", to: "inspection-plans" },
              { title: "详情" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "inspection-plans/:id/edit",
          name: "inspection-plan-edit",
          component: () => import("@/views/form/InspectionPlanCreateView.vue"),
          meta: {
            title: "编辑检测计划",
            loading: "form",
            breadcrumb: [
              { title: "检测计划", to: "inspection-plans" },
              { title: "详情" },
              { title: "编辑检测计划" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "media-library",
          name: "media-library",
          component: () => import("@/views/list/MediaLibraryListView.vue"),
          meta: {
            title: "媒体库",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "app-home",
          name: "app-home",
          component: () => import("@/views/app-home/AppHomeConfigView.vue"),
          meta: {
            title: "App 首页",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "inspection-services/:id",
          name: "inspection-service-detail",
          component: () => import("@/views/detail/InspectionServiceDetailView.vue"),
          meta: {
            title: "检测服务详情",
            loading: "detail",
            useDetailBreadcrumbTitle: true,
            breadcrumb: [
              { title: "检测服务", to: "inspection-services" },
              { title: "详情" },
            ] satisfies BreadcrumbMetaItem[],
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
            navActivePath: "/parks",
            breadcrumb: [
              { title: "园区", to: "parks" },
              { title: "园区详情" },
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
            navActivePath: "/buildings",
            breadcrumb: [
              { title: "建筑", to: "buildings" },
              { title: "建筑详情" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "work-orders",
          redirect: { name: "inspection-work-orders" },
        },
        {
          path: "work-orders/inspection",
          name: "inspection-work-orders",
          component: () => import("@/views/list/WorkOrdersListView.vue"),
          props: { kind: "inspection" },
          meta: {
            title: "检测工单",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "work-orders/inspection/create",
          name: "inspection-work-order-create",
          component: () => import("@/views/form/WorkOrderCreateView.vue"),
          props: { kind: "inspection" },
          meta: {
            title: "添加检测工单",
            loading: "form",
            breadcrumb: [
              { title: "工单", to: "inspection-work-orders" },
              { title: "添加检测工单" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "work-orders/inspection/:id",
          name: "inspection-work-order-detail",
          component: () => import("@/views/detail/WorkOrderDetailView.vue"),
          props: { kind: "inspection" },
          meta: {
            title: "检测工单详情",
            loading: "detail",
            useDetailBreadcrumbTitle: true,
            breadcrumb: [
              { title: "工单", to: "inspection-work-orders" },
              { title: "详情" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "work-orders/inspection/:id/edit",
          name: "inspection-work-order-edit",
          component: () => import("@/views/form/WorkOrderCreateView.vue"),
          props: { kind: "inspection" },
          meta: {
            title: "编辑检测工单",
            loading: "form",
            breadcrumb: [
              { title: "工单", to: "inspection-work-orders" },
              { title: "编辑检测工单" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "work-orders/repair",
          name: "repair-work-orders",
          component: () => import("@/views/list/WorkOrdersListView.vue"),
          props: { kind: "repair" },
          meta: {
            title: "报修工单",
            loading: "table",
          } satisfies RouteMetaConfig,
        },
        {
          path: "work-orders/repair/create",
          name: "repair-work-order-create",
          component: () => import("@/views/form/WorkOrderCreateView.vue"),
          props: { kind: "repair" },
          meta: {
            title: "添加报修工单",
            loading: "form",
            breadcrumb: [
              { title: "工单", to: "repair-work-orders" },
              { title: "添加报修工单" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "work-orders/repair/:id/edit",
          name: "repair-work-order-edit",
          component: () => import("@/views/form/WorkOrderCreateView.vue"),
          props: { kind: "repair" },
          meta: {
            title: "编辑报修工单",
            loading: "form",
            breadcrumb: [
              { title: "工单", to: "repair-work-orders" },
              { title: "编辑报修工单" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "work-orders/repair/:id",
          name: "repair-work-order-detail",
          component: () => import("@/views/detail/WorkOrderDetailView.vue"),
          props: { kind: "repair" },
          meta: {
            title: "报修工单详情",
            loading: "detail",
            useDetailBreadcrumbTitle: true,
            breadcrumb: [
              { title: "工单", to: "repair-work-orders" },
              { title: "详情" },
            ] satisfies BreadcrumbMetaItem[],
          } satisfies RouteMetaConfig,
        },
        {
          path: "settings/:category?",
          name: "settings",
          component: () => import("@/views/settings/SettingsView.vue"),
          beforeEnter: (to) => {
            const category = typeof to.params.category === "string"
              ? to.params.category
              : ""

            if (isSettingsCategoryKey(category)) {
              return true
            }

            return {
              name: "settings",
              params: { category: DEFAULT_SETTINGS_CATEGORY_KEY },
              query: to.query,
              hash: to.hash,
              replace: true,
            }
          },
          meta: {
            title: "设置",
            loading: "table",
            breadcrumb: [
              { title: "设置" },
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

let validatedAuthToken = ""
let pendingSessionValidation: Promise<"valid" | "invalid" | "unknown"> | null = null

router.beforeEach(async (to, from) => {
  const isAuthRoute = to.name === "login" || to.name === "signup" || to.name === "otp"
  const authState = getAuthState()
  const token = getAuthToken()
  const authenticated = authState === "authenticated" && Boolean(token)

  if (authState === "expired") {
    validatedAuthToken = ""
    notifyAuthExpired()

    if (!isAuthRoute) {
      return {
        name: "login",
        query: {
          redirect: to.fullPath,
        },
      }
    }
  }

  if (!authenticated && !isAuthRoute) {
    validatedAuthToken = ""
    return {
      name: "login",
      query: {
        redirect: to.fullPath,
      },
    }
  }

  if (authenticated) {
    const sessionState = await validateSession(token)

    if (sessionState === "invalid") {
      validatedAuthToken = ""

      if (!isAuthRoute) {
        return {
          name: "login",
          query: {
            redirect: to.fullPath,
          },
        }
      }
    }
  } else {
    validatedAuthToken = ""
  }

  if (authenticated && isAuthRoute && validatedAuthToken === token) {
    const redirect = typeof to.query.redirect === "string" && to.query.redirect.trim()
      ? to.query.redirect
      : "/"

    return redirect
  }

  if (to.name === "settings" && from.name) {
    rememberSettingsBackTarget(from)
  }

  beginRouteLoading(resolveRouteLoadingKind(to.meta.loading))
})

router.afterEach(() => {
  endRouteLoading()
})

router.onError(() => {
  endRouteLoading()
})

export default router

async function validateSession(token: string) {
  if (!token) {
    validatedAuthToken = ""
    return "invalid" as const
  }

  if (validatedAuthToken === token) {
    return "valid" as const
  }

  if (pendingSessionValidation) {
    return pendingSessionValidation
  }

  pendingSessionValidation = (async () => {
    try {
      const profile = await fetchCurrentUserInfo()
      setCurrentUser(profile)
      validatedAuthToken = token
      return "valid" as const
    } catch (error) {
      if (isAuthError(error)) {
        validatedAuthToken = ""
        return "invalid" as const
      }

      return "unknown" as const
    } finally {
      pendingSessionValidation = null
    }
  })()

  return pendingSessionValidation
}

function isAuthError(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 401
      || error.status === 403
      || error.code === "401"
      || error.code === "403"
      || error.code === "1001"
      || /(鉴权|身份信息|未登录|登录失效|token|请先登录|请先登陆)/i.test(error.message)
  }

  if (error instanceof Error) {
    return /(鉴权|身份信息|未登录|登录失效|token|请先登录|请先登陆)/i.test(error.message)
  }

  return false
}
