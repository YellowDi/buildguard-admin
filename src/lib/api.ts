const DEFAULT_API_BASE_URL = "http://127.0.0.1:4523/m1/7931435-7683186-default"
const DEFAULT_API_DEVICE = "background"
const TOKEN_STORAGE_KEYS = ["token", "access_token", "auth_token", "Authorization", "authorization"] as const
const DEVICE_STORAGE_KEYS = ["X-Device", "x-device", "device", "device_id"] as const

export const API_PATHS = {
  customersList: "/bqi/customer/list",
  customerCreate: "/bqi/customer/new",
  customerDetail: "/bqi/customer/detail",
  parksList: "/bqi/park/list",
  buildingsList: "/bqi/build/list",
  workOrdersList: "/bqi/work-order/list",
  membersList: "/bqi/user/list",
  memberCreate: "/bqi/user/new",
  memberDetail: "/bqi/user/detail",
  memberStatusUpdate: "/bqi/user/status/update",
  memberUpdate: "/bqi/user/update",
  memberDelete: "/bqi/user/del",
  currentUserInfo: "/bqi/user/info",
  inspectionItemsList: "/bqi/inspection/list",
  inspectionItemCreate: "/bqi/inspection/new",
  inspectionItemDetail: "/bqi/inspection/detail",
  inspectionItemUpdate: "/bqi/inspection/update",
  inspectionItemDelete: "/bqi/inspection/del",
} as const

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).trim()
}

export function buildApiUrl(path: string) {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

export function getApiDevice() {
  return import.meta.env.VITE_API_DEVICE?.trim()
    || readStorageValue(DEVICE_STORAGE_KEYS)
    || DEFAULT_API_DEVICE
}

export function getApiToken() {
  return import.meta.env.VITE_API_TOKEN?.trim() || readStorageValue(TOKEN_STORAGE_KEYS)
}

export function buildApiHeaders(headers: HeadersInit = {}) {
  const resolvedHeaders = new Headers(headers)
  const token = getApiToken()
  const authHeaderName = (import.meta.env.VITE_API_TOKEN_HEADER ?? "Authorization").trim()
  const authTokenPrefix = import.meta.env.VITE_API_TOKEN_PREFIX?.trim() ?? "Bearer"

  resolvedHeaders.set("X-Device", getApiDevice())

  if (token) {
    const authHeaderValue = authTokenPrefix && !token.startsWith(`${authTokenPrefix} `)
      ? `${authTokenPrefix} ${token}`
      : token

    resolvedHeaders.set(authHeaderName, authHeaderValue)
  }

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
