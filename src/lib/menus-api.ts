import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

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

export type MenuDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type MenuDetailResult = MenuRecord

export type ListMenusPayload = {
  Name?: string
  Status?: number
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

export type CreateMenuPayload = {
  Name?: string
  Path?: string
  Icon?: string
  ParentUuid?: string
  Level?: number
  Sort?: number
  Status?: number
  [property: string]: unknown
}

export type UpdateMenuPayload = CreateMenuPayload & {
  Uuid: string
}

export type DeleteMenuPayload = {
  Uuid: string
  [property: string]: unknown
}

export type CreateMenuResult = {
  Id?: number
  Uuid?: string
  [property: string]: unknown
}

const MENUS_API_URL = buildApiUrl(API_PATHS.menusList)
const MENU_DETAIL_API_URL = API_PATHS.menuDetail
const MENU_CREATE_API_URL = buildApiUrl(API_PATHS.menuCreate)
const MENU_UPDATE_API_URL = buildApiUrl(API_PATHS.menuUpdate)
const MENU_DELETE_API_URL = buildApiUrl(API_PATHS.menuDelete)
const MENUS_LOAD_ERROR_MESSAGE = "菜单列表加载失败，请稍后重试。"
const MENU_DETAIL_ERROR_MESSAGE = "菜单详情加载失败，请稍后重试。"
const MENU_CREATE_ERROR_MESSAGE = "菜单创建失败，请稍后重试。"
const MENU_UPDATE_ERROR_MESSAGE = "菜单更新失败，请稍后重试。"
const MENU_DELETE_ERROR_MESSAGE = "菜单删除失败，请稍后重试。"

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

  assertApiSuccess(responsePayload, MENUS_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload).map(item => normalizeMenuRecord(item))

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

export async function fetchMenuDetail(payload: MenuDetailPayload): Promise<MenuDetailResult> {
  const url = buildApiRequestUrl(MENU_DETAIL_API_URL)

  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, MENU_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, MENU_DETAIL_ERROR_MESSAGE)

  return normalizeMenuRecord(extractDetailRecord(responsePayload))
}

export async function createMenu(payload: CreateMenuPayload): Promise<CreateMenuResult> {
  const response = await fetch(MENU_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizeWritePayload(payload)),
  })
  const responsePayload = await readResponseBody(response) as CreateMenuResult

  if (!response.ok) {
    throw createHttpError(response, responsePayload, MENU_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, MENU_CREATE_ERROR_MESSAGE)
  return extractDetailRecord(responsePayload)
}

export async function updateMenu(payload: UpdateMenuPayload): Promise<CreateMenuResult> {
  const response = await fetch(MENU_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
      ...normalizeWritePayload(payload),
    }),
  })
  const responsePayload = await readResponseBody(response) as CreateMenuResult

  if (!response.ok) {
    throw createHttpError(response, responsePayload, MENU_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, MENU_UPDATE_ERROR_MESSAGE)
  return extractDetailRecord(responsePayload)
}

function normalizeWritePayload(payload: CreateMenuPayload | UpdateMenuPayload) {
  const normalized: Record<string, unknown> = {
    Name: normalizeOptionalText(payload.Name),
    Path: normalizeOptionalText(payload.Path),
    Icon: normalizeOptionalText(payload.Icon),
    ParentUuid: normalizeOptionalText(payload.ParentUuid),
  }

  const level = getOptionalNumber(payload.Level, "Level")
  const sort = getOptionalNumber(payload.Sort, "Sort")
  const status = getOptionalNumber(payload.Status, "Status")

  if (level !== undefined) {
    normalized.Level = level
  }

  if (sort !== undefined) {
    normalized.Sort = sort
  }

  if (status !== undefined) {
    normalized.Status = status
  }

  return normalized
}

export async function deleteMenu(payload: DeleteMenuPayload) {
  const url = buildApiRequestUrl(API_PATHS.menuDelete)

  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, MENU_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, MENU_DELETE_ERROR_MESSAGE)
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

function extractDetailRecord(payload: unknown) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const envelope = payload as Record<string, unknown>

    if (envelope.data && typeof envelope.data === "object" && !Array.isArray(envelope.data)) {
      return envelope.data as CreateMenuResult
    }

    return envelope as CreateMenuResult
  }

  return {} as CreateMenuResult
}

function normalizeMenuRecord(value: unknown): MenuRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>

    return {
      ...record,
      Uuid: getFirstText(record, ["Uuid", "uuid", "MenuUuid", "menuUuid"]),
      Id: getFirstNumber(record, ["Id", "id", "MenuId", "menuId"]),
      Name: getFirstText(record, ["Name", "name", "MenuName", "menuName"]),
      Path: getFirstText(record, ["Path", "path", "RoutePath", "routePath"]),
      Icon: getFirstText(record, ["Icon", "icon"]),
      ParentUuid: getFirstText(record, ["ParentUuid", "parentUuid", "PUuid", "pUuid"]),
      ParentName: getFirstText(record, ["ParentName", "parentName", "PName", "pName"]),
      Level: getFirstNumber(record, ["Level", "level"]),
      Sort: getFirstNumber(record, ["Sort", "sort"]),
      Status: getFirstNumber(record, ["Status", "status"]),
      CreatedAt: getFirstText(record, ["CreatedAt", "createdAt", "CreateTime", "createTime"]),
      UpdatedAt: getFirstText(record, ["UpdatedAt", "updatedAt", "UpdateTime", "updateTime"]),
    }
  }

  return {}
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

function normalizeOptionalText(value: unknown) {
  if (value === undefined || value === null) {
    return ""
  }

  if (typeof value === "string") {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  throw new ApiError("请求参数校验失败：字符串字段格式无效。")
}

function getRequiredString(value: unknown, field: string) {
  const result = getOptionalString(value)

  if (result !== undefined) {
    return result
  }

  throw new ApiError(`请求参数校验失败：${field} 不能为空。`)
}

function getFirstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return undefined
}

function getFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return undefined
}
