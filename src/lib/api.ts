const DEFAULT_API_BASE_URL = "http://127.0.0.1:4523/m1/7931435-7683186-default"

export const API_PATHS = {
  membersList: "/bqi/user/list",
  memberStatusUpdate: "/bqi/user/status/update",
  memberUpdate: "/bqi/user/update",
} as const

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).trim()
}

export function buildApiUrl(path: string) {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
