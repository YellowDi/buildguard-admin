import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

type RolesListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type RoleRecord = {
  Uuid?: string
  Id?: number
  Name?: string
  Remark?: string
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type RolesListResult = {
  list: RoleRecord[]
  total: number
}

export type RoleDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type RoleDetailResult = RoleRecord

export type CreateRolePayload = {
  Name: string
  Remark?: string
}

export type CreateRoleResult = {
  Id?: number
  Name?: string
  Remark?: string
  CreatedAt?: string
  UpdatedAt?: string
  Uuid?: string
  [property: string]: unknown
}

export type UpdateRolePayload = {
  Uuid: string
  Name: string
  Remark?: string
}

export type DeleteRolePayload = {
  Uuid: string
}

export type BindRoleMenusPayload = {
  RoleUuid: string
  MenuUuids?: string[]
}

const ROLES_API_URL = buildApiUrl(API_PATHS.rolesList)
const ROLE_CREATE_API_URL = buildApiUrl(API_PATHS.roleCreate)
const ROLE_UPDATE_API_URL = buildApiUrl(API_PATHS.roleUpdate)
const ROLE_DELETE_API_URL = buildApiUrl(API_PATHS.roleDelete)
const ROLE_MENU_BIND_API_URL = buildApiUrl(API_PATHS.roleMenuBind)
const ROLES_LOAD_ERROR_MESSAGE = "角色列表加载失败，请稍后重试。"
const ROLE_DETAIL_ERROR_MESSAGE = "角色详情加载失败，请稍后重试。"
const ROLE_CREATE_ERROR_MESSAGE = "角色创建失败，请稍后重试。"
const ROLE_UPDATE_ERROR_MESSAGE = "角色更新失败，请稍后重试。"
const ROLE_DELETE_ERROR_MESSAGE = "角色删除失败，请稍后重试。"
const ROLE_MENU_BIND_ERROR_MESSAGE = "角色菜单权限保存失败，请稍后重试。"

export async function fetchRoles(): Promise<RolesListResult> {
  const response = await fetch(ROLES_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({}),
  })
  const responsePayload = await readResponseBody(response) as RolesListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, ROLES_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, ROLES_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload).map(item => normalizeRoleRecord(item))

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

export async function getRoleDetail(payload: RoleDetailPayload): Promise<RoleDetailResult> {
  const url = buildApiRequestUrl(API_PATHS.roleDetail)

  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, ROLE_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, ROLE_DETAIL_ERROR_MESSAGE)

  return normalizeRoleRecord(extractDetailRecord(responsePayload))
}

export async function createRole(payload: CreateRolePayload): Promise<CreateRoleResult> {
  const normalizedPayload = {
    Name: getRequiredString(payload.Name, "Name"),
    Remark: getOptionalString(payload.Remark) ?? "",
  }

  const response = await fetch(ROLE_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as CreateRoleResult

  if (!response.ok) {
    throw createHttpError(response, responsePayload, ROLE_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, ROLE_CREATE_ERROR_MESSAGE)

  return extractCreateResult(responsePayload)
}

export async function updateRole(payload: UpdateRolePayload): Promise<CreateRoleResult> {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    Name: getRequiredString(payload.Name, "Name"),
    Remark: getOptionalString(payload.Remark) ?? "",
  }

  const response = await fetch(ROLE_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as CreateRoleResult

  if (!response.ok) {
    throw createHttpError(response, responsePayload, ROLE_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, ROLE_UPDATE_ERROR_MESSAGE)

  return extractCreateResult(responsePayload)
}

export async function deleteRole(payload: DeleteRolePayload) {
  const response = await fetch(ROLE_DELETE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
    }),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, ROLE_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, ROLE_DELETE_ERROR_MESSAGE)

  return responsePayload
}

export async function bindRoleMenus(payload: BindRoleMenusPayload) {
  const normalizedPayload = {
    RoleUuid: getRequiredString(payload.RoleUuid, "RoleUuid"),
    MenuUuids: getStringArray(payload.MenuUuids, "MenuUuids"),
  }

  const response = await fetch(ROLE_MENU_BIND_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, ROLE_MENU_BIND_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, ROLE_MENU_BIND_ERROR_MESSAGE)

  return responsePayload
}

function extractList(payload: RolesListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload as RoleRecord[]
  }

  if (Array.isArray(payload.List)) {
    return payload.List as RoleRecord[]
  }

  if (Array.isArray(payload.data)) {
    return payload.data as RoleRecord[]
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as RolesListEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List as RoleRecord[]
    }

    if (Array.isArray(nested.list)) {
      return nested.list as RoleRecord[]
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows as RoleRecord[]
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list as RoleRecord[]
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows as RoleRecord[]
  }

  return []
}

function extractTotal(payload: RolesListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as RolesListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeRoleRecord(value: unknown): RoleRecord {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>

    return {
      ...record,
      Uuid: getFirstText(record, ["Uuid", "uuid", "RoleUuid", "roleUuid"]),
      Id: getFirstNumber(record, ["Id", "id", "RoleId", "roleId"]),
      Name: getFirstText(record, ["Name", "name", "RoleName", "roleName"]),
      Remark: getFirstText(record, ["Remark", "remark"]),
      CreatedAt: getFirstText(record, ["CreatedAt", "createdAt"]),
      UpdatedAt: getFirstText(record, ["UpdatedAt", "updatedAt"]),
    }
  }

  return {}
}

function extractCreateResult(payload: unknown): CreateRoleResult {
  const directRecord = asRecord(payload)

  if (!directRecord) {
    return {}
  }

  const nestedRecord = asRecord(directRecord.data)

  if (nestedRecord) {
    return nestedRecord as CreateRoleResult
  }

  return directRecord as CreateRoleResult
}

function extractDetailRecord(payload: unknown): RoleDetailResult {
  const directRecord = asRecord(payload)

  if (!directRecord) {
    return {}
  }

  const nestedRecord = asRecord(directRecord.data)

  if (nestedRecord) {
    return nestedRecord as RoleDetailResult
  }

  return directRecord as RoleDetailResult
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}

function getFirstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number") {
      return String(value)
    }
  }

  return undefined
}

function getFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    const parsed = typeof value === "string" ? Number(value.trim()) : value

    if (typeof parsed === "number" && Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function getRequiredString(value: unknown, field: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  throw new ApiError(`请求参数校验失败：${field} 不能为空。`)
}

function getOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized || undefined
  }

  throw new ApiError("请求参数校验失败：字符串参数格式不正确。")
}

function getStringArray(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new ApiError(`请求参数校验失败：${field} 必须是字符串数组。`)
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new ApiError(`请求参数校验失败：${field}[${index}] 不能为空。`)
    }

    return item.trim()
  })
}
