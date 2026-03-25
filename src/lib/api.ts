const DEFAULT_API_BASE_URL = "http://127.0.0.1:4523/m1/7931435-7683186-default"

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
