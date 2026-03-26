import { ApiError, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

type MenusListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type MenuRecord = {
  Uuid?: string
  Id?: number
  Name?: string
  Path?: string
  Icon?: string
  ParentUuid?: string
  ParentName?: string
  Level?: number
  Sort?: number
  Status?: number
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type MenusListResult = {
  list: MenuRecord[]
  total: number
}

export type ListMenusPayload = {
  Name?: string
  Status?: number
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

export type CreateMenuPayload = {
  Name: string
  Path: string
  Icon: string
  ParentUuid: string
  Level: number
  Sort: number
  Status: number
}

export type CreateMenuResult = {
  Id?: number
  Uuid?: string
  [property: string]: unknown
}

const MENUS_API_URL = buildApiUrl(API_PATHS.menusList)
const MENU_CREATE_API_URL = buildApiUrl(API_PATHS.menuCreate)
const MENUS_LOAD_ERROR_MESSAGE = "菜单列表加载失败，请稍后重试。"
const MENU_CREATE_ERROR_MESSAGE = "菜单创建失败，请稍后重试。"

export async function fetchMenus(payload: ListMenusPayload = {}): Promise<MenusListResult> {
  const normalizedPayload = {
    Name: getOptionalString(payload.Name) ?? "",
    Status: getOptionalNumber(payload.Status, "Status") ?? 0,
    PageNum: getOptionalNumber(payload.PageNum, "PageNum") ?? 0,
    PageSize: getOptionalNumber(payload.PageSize, "PageSize") ?? 0,
  }

  const response = await fetch(MENUS_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as MenusListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, MENUS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createMenu(payload: CreateMenuPayload): Promise<CreateMenuResult> {
  const response = await fetch(MENU_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Name: payload.Name.trim(),
      Path: payload.Path.trim(),
      Icon: payload.Icon.trim(),
      ParentUuid: payload.ParentUuid.trim(),
      Level: payload.Level,
      Sort: payload.Sort,
      Status: payload.Status,
    }),
  })
  const responsePayload = await readResponseBody(response) as CreateMenuResult

  if (!response.ok) {
    throw createHttpError(response, responsePayload, MENU_CREATE_ERROR_MESSAGE)
  }

  return responsePayload
}

function extractList(payload: MenusListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload as MenuRecord[]
  }

  if (Array.isArray(payload.List)) {
    return payload.List as MenuRecord[]
  }

  if (Array.isArray(payload.data)) {
    return payload.data as MenuRecord[]
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MenusListEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List as MenuRecord[]
    }

    if (Array.isArray(nested.list)) {
      return nested.list as MenuRecord[]
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows as MenuRecord[]
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list as MenuRecord[]
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows as MenuRecord[]
  }

  return []
}

function extractTotal(payload: MenusListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MenusListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function getOptionalNumber(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const parsed = Number(value)

  if (Number.isFinite(parsed)) {
    return parsed
  }

  throw new ApiError(`请求参数校验失败：${field} 必须是有效数字。`)
}

function getOptionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  throw new ApiError("请求参数校验失败：Name 必须是有效字符串。")
}
