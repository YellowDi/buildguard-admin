import { ApiError, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

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

export type CreateRolePayload = {
  Name: string
  Remark?: string
}

export type CreateRoleResult = {
  Id?: number
  Uuid?: string
  [property: string]: unknown
}

const ROLES_API_URL = buildApiUrl(API_PATHS.rolesList)
const ROLE_CREATE_API_URL = buildApiUrl(API_PATHS.roleCreate)
const ROLES_LOAD_ERROR_MESSAGE = "角色列表加载失败，请稍后重试。"
const ROLE_CREATE_ERROR_MESSAGE = "角色创建失败，请稍后重试。"

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

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
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
