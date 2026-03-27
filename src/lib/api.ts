// Previous mock API base URL: http://127.0.0.1:4523/m1/7931435-7683186-default
const DEFAULT_API_BASE_URL = "http://192.168.2.4:8000"
const DEFAULT_API_DEVICE = "background"
const TOKEN_STORAGE_KEYS = ["token", "access_token", "auth_token", "Authorization", "authorization"] as const
const DEVICE_STORAGE_KEYS = ["X-Device", "x-device", "device", "device_id"] as const

export const API_PATHS = {
  customersList: "/bqi/customer/list",
  customerCreate: "/bqi/customer/new",
  customerDetail: "/bqi/customer/detail",
  customerUpdate: "/bqi/customer/update",
  customerDelete: "/bqi/customer/del",
  customerSubAccountCreate: "/bqi/customer/account/new",
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
  workOrderCreate: "/bqi/work-order/new",
  membersList: "/bqi/user/list",
  memberCreate: "/bqi/user/new",
  memberDetail: "/bqi/user/detail",
  memberStatusUpdate: "/bqi/user/status/update",
  memberUpdate: "/bqi/user/update",
  memberDelete: "/bqi/user/del",
  menusList: "/bqi/sys/menu/list",
  menuCreate: "/bqi/sys/menu/new",
  systemButtonsList: "/bqi/sys/button/list",
  systemApisList: "/bqi/sys/api/list",
  systemApisImport: "/bqi/sys/api/import",
  currentUserInfo: "/bqi/user/info",
  inspectionItemsList: "/bqi/inspection/list",
  inspectionCategoriesList: "/bqi/sys/category/list",
  inspectionPlansList: "/bqi/inspection/plan/list",
  inspectionServicesList: "/bqi/inspection/service/list",
  inspectionServiceDetail: "/bqi/inspection/service/detail",
  inspectionItemCreate: "/bqi/inspection/new",
  inspectionItemDetail: "/bqi/inspection/detail",
  inspectionItemUpdate: "/bqi/inspection/update",
  inspectionItemDelete: "/bqi/inspection/del",
} as const

export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (configuredBaseUrl) {
    return configuredBaseUrl
  }

  // In Vite dev, prefer same-origin requests and let the dev server proxy `/bqi`.
  if (import.meta.env.DEV) {
    return ""
  }

  return DEFAULT_API_BASE_URL
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

  return new URL(normalizedPath, `${DEFAULT_API_BASE_URL}/`)
}

export function getApiDevice() {
  return import.meta.env.VITE_API_DEVICE?.trim()
    || readStorageValue(DEVICE_STORAGE_KEYS)
    || DEFAULT_API_DEVICE
}

export function getApiToken() {
  return normalizeAuthToken(import.meta.env.VITE_API_TOKEN?.trim() || readStorageValue(TOKEN_STORAGE_KEYS))
}

export function buildApiHeaders(headers: HeadersInit = {}) {
  const resolvedHeaders = new Headers(headers)
  const token = getApiToken()
  const authHeaderName = (import.meta.env.VITE_API_TOKEN_HEADER ?? "Authorization").trim()
  const authTokenPrefix = import.meta.env.VITE_API_TOKEN_PREFIX?.trim() ?? ""

  resolvedHeaders.set("X-Device", getApiDevice())

  if (token) {
    const authHeaderValue = authTokenPrefix
      ? `${authTokenPrefix} ${token}`
      : token

    resolvedHeaders.set(authHeaderName, authHeaderValue)
  }

  return resolvedHeaders
}

export function buildApiHeadersWithoutAuth(headers: HeadersInit = {}) {
  const resolvedHeaders = new Headers(headers)

  resolvedHeaders.set("X-Device", getApiDevice())

  return resolvedHeaders
}

function readStorageValue(keys: readonly string[]) {
  if (typeof window === "undefined") {
    return ""
  }

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key)?.trim()

      if (value) {
        return value
      }
    }
  }

  return ""
}

function normalizeAuthToken(value: string) {
  return value.replace(/^Bearer\s+/i, "").trim()
}
