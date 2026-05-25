import { getAuthDevice, getAuthState, getAuthToken, notifyAuthExpired, setAuthDevice } from "@/lib/auth"

const DEFAULT_API_DEVICE = "background"

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ApiConfigurationError"
  }
}

export const API_PATHS = {
  customersList: "/bqi/customer/list",
  customerCreate: "/bqi/customer/new",
  customerDetail: "/bqi/customer/detail",
  customerUpdate: "/bqi/customer/update",
  customerStatusUpdate: "/bqi/customer/status/update",
  customerDelete: "/bqi/customer/del",
  customerSubAccountsList: "/bqi/customer/account/list",
  customerSubAccountCreate: "/bqi/customer/account/new",
  customerSubAccountUpdate: "/bqi/customer/account/update",
  customerSubAccountPasswordResetOld: "/bqi/customer/account/passwd/reset",
  parksList: "/bqi/park/list",
  parkCreate: "/bqi/park/new",
  parkUpdate: "/bqi/park/update",
  parkDetail: "/bqi/park/detail",
  parkDelete: "/bqi/park/del",
  buildingsList: "/bqi/build/list",
  buildingCreate: "/bqi/build/new",
  buildingUpdate: "/bqi/build/update",
  buildingDelete: "/bqi/build/del",
  workOrdersList: "/bqi/work-order/list",
  workOrderRepairList: "/bqi/work-order/repair/list",
  workOrderRepairDetail: "/bqi/work-order/repair/detail",
  workOrderRepairCreate: "/bqi/work-order/repair/new",
  workOrderRepairUpdate: "/bqi/work-order/repair/update",
  workOrderRepairDelete: "/bqi/work-order/repair/del",
  workOrderReportUpload: "/bqi/work-order/report/upload",
  workOrderCreate: "/bqi/work-order/new",
  workOrderDetail: "/bqi/work-order/detail",
  workOrderInspectionHistoryDetail: "/bqi/work-order/inspection/history/detail",
  workOrderUpdate: "/bqi/work-order/update",
  workOrderDispatch: "/bqi/work-order/dispatch",
  workOrderRepairDispatch: "/bqi/work-order/repair/dispatch",
  workOrderGnReport: "/bqi/work-order/report/gn",
  membersList: "/bqi/user/list",
  memberCreate: "/bqi/user/new",
  memberDetail: "/bqi/user/detail",
  memberTypeUpdate: "/bqi/user/type/update",
  memberStatusUpdate: "/bqi/user/status/update",
  memberUpdate: "/bqi/user/update",
  memberRoleBind: "/bqi/user/role/bind",
  memberDelete: "/bqi/user/del",
  rolesList: "/bqi/sys/role/list",
  roleDetail: "/bqi/sys/role/detail",
  roleCreate: "/bqi/sys/role/new",
  roleUpdate: "/bqi/sys/role/update",
  roleDelete: "/bqi/sys/role/del",
  roleMenuBind: "/bqi/sys/role/menu/bind",
  roleMenuButtonList: "/bqi/sys/role/menu/button/list",
  userPermissionTree: "/bqi/sys/permission/user/tree",
  menusList: "/bqi/sys/menu/list",
  menuDetail: "/bqi/sys/menu/detail",
  menuCreate: "/bqi/sys/menu/new",
  menuUpdate: "/bqi/sys/menu/update",
  menuDelete: "/bqi/sys/menu/del",
  systemButtonsList: "/bqi/sys/button/list",
  systemButtonDetail: "/bqi/sys/button/detail",
  systemButtonCreate: "/bqi/sys/button/new",
  systemButtonUpdate: "/bqi/sys/button/update",
  systemButtonDelete: "/bqi/sys/button/del",
  systemApisList: "/bqi/sys/api/list",
  systemApisImport: "/bqi/sys/api/import",
  currentUserInfo: "/bqi/user/info",
  inspectionItemsList: "/bqi/inspection/list",
  inspectionCategoriesList: "/bqi/sys/category/list",
  inspectionCategoryCreate: "/bqi/sys/category/new",
  inspectionCategoryDetail: "/bqi/sys/category/detail",
  inspectionCategoryUpdate: "/bqi/sys/category/update",
  inspectionCategoryDelete: "/bqi/sys/category/del",
  inspectionPlansList: "/bqi/inspection/plan/list",
  inspectionPlanCreate: "/bqi/inspection/plan/new",
  inspectionPlanDetail: "/bqi/inspection/plan/detail",
  inspectionPlanUpdate: "/bqi/inspection/plan/update",
  inspectionPlanDelete: "/bqi/inspection/plan/del",
  inspectionServicesList: "/bqi/inspection/service/list",
  inspectionServiceTemplatesList: "/bqi/inspection/service/template/list",
  inspectionServiceTemplateCreate: "/bqi/inspection/service/template/new",
  inspectionServiceTemplateDetail: "/bqi/inspection/service/template/detail",
  inspectionServiceTemplateUpdate: "/bqi/inspection/service/template/update",
  inspectionServiceTemplateDelete: "/bqi/inspection/service/template/del",
  inspectionServiceCreate: "/bqi/inspection/service/new",
  inspectionServiceDetail: "/bqi/inspection/service/detail",
  inspectionServiceUpdate: "/bqi/inspection/service/update",
  inspectionServiceDelete: "/bqi/inspection/service/del",
  inspectionServiceContractUpdate: "/bqi/inspection/service/contract/update",
  inspectionItemCreate: "/bqi/inspection/new",
  inspectionItemDetail: "/bqi/inspection/detail",
  inspectionItemUpdate: "/bqi/inspection/update",
  inspectionItemDelete: "/bqi/inspection/del",
  mediaTypeList: "/bqi/media/type/list",
  mediaTypeCreate: "/bqi/media/type/new",
  mediaTypeDetail: "/bqi/media/type/detail",
  mediaTypeUpdate: "/bqi/media/type/update",
  mediaTypeDelete: "/bqi/media/type/del",
  mediaVideoList: "/bqi/media/video/list",
  mediaVideoCreate: "/bqi/media/video/new",
  mediaVideoDetail: "/bqi/media/video/detail",
  mediaVideoUpdate: "/bqi/media/video/update",
  mediaVideoDelete: "/bqi/media/video/del",
  mediaArticleList: "/bqi/media/article/list",
  mediaArticleCreate: "/bqi/media/article/new",
  mediaArticleDetail: "/bqi/media/article/detail",
  mediaArticleUpdate: "/bqi/media/article/update",
  mediaArticleDelete: "/bqi/media/article/del",
  mediaContentList: "/bqi/media/content/list",
  mediaContentCreate: "/bqi/media/content/new",
  mediaContentDetail: "/bqi/media/content/detail",
  mediaContentUpdate: "/bqi/media/content/update",
  mediaContentDelete: "/bqi/media/content/del",
  mediaContentSortUpdate: "/bqi/media/content/sort/update",
  mediaContentStatusUpdate: "/bqi/media/content/status/update",
  customerFeedbackList: "/bqi/customer/feedback/list",
  appVersionList: "/bqi/sys/app-version/list",
  appVersionDetail: "/bqi/sys/app-version/detail",
  appVersionCreate: "/bqi/sys/app-version/new",
  appVersionUpdate: "/bqi/sys/app-version/update",
  appVersionDelete: "/bqi/sys/app-version/del",
  dictTypeList: "/bqi/sys/dict/type/list",
  dictTypeCreate: "/bqi/sys/dict/type/new",
  dictTypeDetail: "/bqi/sys/dict/type/detail",
  dictTypeUpdate: "/bqi/sys/dict/type/update",
  dictTypeDelete: "/bqi/sys/dict/type/delete",
  dictEntryList: "/bqi/sys/dict/data/list",
  dictEntryCreate: "/bqi/sys/dict/data/new",
  dictEntryDetail: "/bqi/sys/dict/data/detail",
  dictEntryUpdate: "/bqi/sys/dict/data/update",
  dictEntryDelete: "/bqi/sys/dict/data/delete",
  tencentCosSts: "/bqi/public/tencent/cos/sts",
} as const

export function ensureApiEnvironmentSecurity() {
  const baseUrl = getApiBaseUrl()

  if (!baseUrl || !shouldRequireSecureApi()) {
    return
  }

  const parsedBaseUrl = new URL(baseUrl)

  if (parsedBaseUrl.protocol === "https:" || isLocalHostname(parsedBaseUrl.hostname)) {
    return
  }

  throw new ApiConfigurationError("当前环境要求使用 HTTPS API。请将 VITE_API_BASE_URL 配置为 https 地址。")
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.trim() ?? ""
}

export function buildApiUrl(path: string) {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

export function buildApiRequestUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "")

  if (baseUrl) {
    return new URL(normalizedPath, `${baseUrl}/`)
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(normalizedPath, window.location.origin)
  }

  throw new ApiConfigurationError("无法解析 API 地址，请确认 VITE_API_BASE_URL 是否正确配置。")
}

export function getApiDevice() {
  return import.meta.env.VITE_API_DEVICE?.trim()
    || getAuthDevice()
    || DEFAULT_API_DEVICE
}

export function setApiDevice(device: string) {
  setAuthDevice(device)
}

export function getApiToken() {
  const envToken = normalizeAuthToken(import.meta.env.VITE_API_TOKEN?.trim() ?? "")

  if (envToken) {
    return envToken
  }

  return getAuthState() === "authenticated"
    ? normalizeAuthToken(getAuthToken())
    : ""
}

export function buildApiHeaders(headers: HeadersInit = {}) {
  const resolvedHeaders = new Headers(headers)
  const authHeaderName = (import.meta.env.VITE_API_TOKEN_HEADER ?? "Authorization").trim()
  const authTokenPrefix = import.meta.env.VITE_API_TOKEN_PREFIX?.trim() ?? ""
  const envToken = normalizeAuthToken(import.meta.env.VITE_API_TOKEN?.trim() ?? "")
  const authState = getAuthState()
  const token = envToken || (authState === "authenticated" ? getAuthToken() : "")

  resolvedHeaders.set("X-Device", getApiDevice())

  if (!envToken && authState === "expired") {
    notifyAuthExpired()
  }

  if (token) {
    const authHeaderValue = authTokenPrefix
      ? `${authTokenPrefix} ${token}`
      : token

    resolvedHeaders.set(authHeaderName, authHeaderValue)

    if (shouldSendLegacyTokenHeader(authHeaderName) && !resolvedHeaders.has("Token")) {
      resolvedHeaders.set("Token", token)
    }
  }

  return resolvedHeaders
}

export function buildApiHeadersWithoutAuth(headers: HeadersInit = {}) {
  const resolvedHeaders = new Headers(headers)

  resolvedHeaders.set("X-Device", getApiDevice())

  return resolvedHeaders
}

function normalizeAuthToken(value: string) {
  return value.replace(/^Bearer\s+/i, "").trim()
}

function shouldSendLegacyTokenHeader(authHeaderName: string) {
  return isTruthyEnvValue(import.meta.env.VITE_ENABLE_LEGACY_TOKEN_HEADER, true)
    && authHeaderName.toLowerCase() !== "token"
}

function shouldRequireSecureApi() {
  return isTruthyEnvValue(import.meta.env.VITE_REQUIRE_SECURE_API, true)
}

function isTruthyEnvValue(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue
  }

  return value.trim().toLowerCase() !== "false"
}

function isLocalHostname(hostname: string) {
  const normalizedHostname = hostname.trim().toLowerCase()

  return normalizedHostname === "localhost"
    || normalizedHostname === "127.0.0.1"
    || normalizedHostname === "::1"
    || normalizedHostname.endsWith(".local")
}
