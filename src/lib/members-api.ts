import { ApiError, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

type MembersListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type MembersListResult = {
  list: unknown[]
  total: number
}

export type ListMembersPayload = {
  DepartmentUuid?: string
  Name?: string
  PageNum?: number
  PageSize?: number
  Phone?: string
  Position?: string
  RoleUuids?: string[]
  Status?: number
  [property: string]: unknown
}

export type CreateMemberPayload = {
  DepartmentUuid?: string
  Name?: string
  Phone?: string
  Position?: string
  RoleUuids?: string[]
  [property: string]: unknown
}

export type CreateMemberResult = {
  Id?: number
  Uuid?: string
  Name?: string
  [property: string]: unknown
}

export type MemberDetailPayload = {
  Uuid?: string
  Remark?: string
  [property: string]: unknown
}

export type MemberDetailRole = {
  RoleId?: number
  RoleName?: string
  RoleUuid?: string
  [property: string]: unknown
}

export type MemberDetailResult = {
  DepartmentId?: number
  DepartmentName?: string
  DepartmentUuid?: string
  Id?: number
  Name?: string
  Phone?: string
  Position?: string
  Roles?: MemberDetailRole[]
  Status?: number
  Uuid?: string
  [property: string]: unknown
}

export type UpdateMemberPayload = {
  Uuid?: string
  DepartmentUuid?: string
  Name: string
  Phone: string
  Position: string
  Status: number
  RoleUuids: string[]
}

export type BindMemberRolesPayload = {
  Uuid?: string
  RoleUuids?: string[]
  [property: string]: unknown
}

export type UpdateMemberStatusPayload = {
  Uuid?: string
  Status?: number
  [property: string]: unknown
}

export type DeleteMemberPayload = {
  Uuid?: string
  Remark?: string
  [property: string]: unknown
}

const MEMBERS_API_URL = buildApiUrl(API_PATHS.membersList)
const MEMBER_CREATE_API_URL = buildApiUrl(API_PATHS.memberCreate)
const MEMBER_DETAIL_API_URL = buildApiUrl(API_PATHS.memberDetail)
const MEMBER_STATUS_UPDATE_API_URL = buildApiUrl(API_PATHS.memberStatusUpdate)
const MEMBER_UPDATE_API_URL = buildApiUrl(API_PATHS.memberUpdate)
const MEMBER_ROLE_BIND_API_URL = buildApiUrl(API_PATHS.memberRoleBind)
const MEMBER_DELETE_API_URL = buildApiUrl(API_PATHS.memberDelete)

const MEMBERS_LOAD_ERROR_MESSAGE = "成员列表加载失败，请稍后重试。"
const MEMBER_CREATE_ERROR_MESSAGE = "成员创建失败，请稍后重试。"
const MEMBER_DETAIL_ERROR_MESSAGE = "成员详情加载失败，请稍后重试。"
const MEMBER_STATUS_UPDATE_ERROR_MESSAGE = "成员状态更新失败，请稍后重试。"
const MEMBER_UPDATE_ERROR_MESSAGE = "成员信息更新失败，请稍后重试。"
const MEMBER_ROLE_BIND_ERROR_MESSAGE = "成员角色绑定失败，请稍后重试。"
const MEMBER_DELETE_ERROR_MESSAGE = "成员删除失败，请稍后重试。"

export async function fetchMembers(payload: ListMembersPayload = {}): Promise<MembersListResult> {
  const normalizedPayload = {
    DepartmentUuid: getOptionalString(payload.DepartmentUuid),
    Name: getOptionalString(payload.Name),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
    Phone: getOptionalString(payload.Phone),
    Position: getOptionalString(payload.Position),
    RoleUuids: getOptionalStringArray(payload.RoleUuids, "RoleUuids"),
    Status: getOptionalStatus(payload.Status, "Status"),
  }

  const response = await fetch(MEMBERS_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as MembersListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, MEMBERS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createMember(payload: CreateMemberPayload): Promise<CreateMemberResult> {
  const normalizedPayload = {
    DepartmentUuid: getOptionalString(payload.DepartmentUuid),
    Name: getRequiredString(payload.Name, "Name"),
    Phone: getOptionalString(payload.Phone),
    Position: getOptionalString(payload.Position),
    RoleUuids: getOptionalStringArray(payload.RoleUuids, "RoleUuids"),
  }

  const response = await fetch(MEMBER_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEMBER_CREATE_ERROR_MESSAGE)
  }

  return extractCreateResult(responseBody)
}

export async function getMemberDetail(payload: MemberDetailPayload): Promise<MemberDetailResult> {
  const url = buildApiRequestUrl(API_PATHS.memberDetail)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const remark = getOptionalString(payload.Remark)

  if (remark) {
    url.searchParams.set("Remark", remark)
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEMBER_DETAIL_ERROR_MESSAGE)
  }

  return extractDetailRecord(responseBody)
}

export async function updateMember(payload: UpdateMemberPayload) {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    DepartmentUuid: getOptionalString(payload.DepartmentUuid),
    Name: getRequiredString(payload.Name, "Name"),
    Phone: getOptionalString(payload.Phone) ?? "",
    Position: getOptionalString(payload.Position) ?? "",
    Status: getRequiredNumber(payload.Status, "Status"),
    RoleUuids: getStringArray(payload.RoleUuids, "RoleUuids"),
  }

  const response = await fetch(MEMBER_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEMBER_UPDATE_ERROR_MESSAGE)
  }
}

export async function bindMemberRoles(payload: BindMemberRolesPayload) {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    RoleUuids: getStringArray(payload.RoleUuids, "RoleUuids"),
  }

  const response = await fetch(MEMBER_ROLE_BIND_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEMBER_ROLE_BIND_ERROR_MESSAGE)
  }
}

export async function updateMemberStatus(payload: UpdateMemberStatusPayload) {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    Status: getOptionalStatus(payload.Status, "Status"),
  }

  const response = await fetch(MEMBER_STATUS_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEMBER_STATUS_UPDATE_ERROR_MESSAGE)
  }
}

export async function deleteMember(payload: DeleteMemberPayload) {
  const url = buildApiRequestUrl(API_PATHS.memberDelete)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const remark = getOptionalString(payload.Remark)

  if (remark) {
    url.searchParams.set("Remark", remark)
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEMBER_DELETE_ERROR_MESSAGE)
  }
}

function extractList(payload: MembersListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MembersListEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List
    }

    if (Array.isArray(nested.list)) {
      return nested.list
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows
  }

  return []
}

function extractTotal(payload: MembersListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MembersListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function extractDetailRecord(payload: unknown) {
  const directRecord = asRecord(payload)

  if (!directRecord) {
    return {}
  }

  const nestedRecord = asRecord(directRecord.data)

  if (nestedRecord) {
    return nestedRecord as MemberDetailResult
  }

  return directRecord as MemberDetailResult
}

function extractCreateResult(payload: unknown): CreateMemberResult {
  const directRecord = asRecord(payload)

  if (!directRecord) {
    return {}
  }

  const nestedRecord = asRecord(directRecord.data)

  if (nestedRecord) {
    return nestedRecord as CreateMemberResult
  }

  return directRecord as CreateMemberResult
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

function getRequiredNumber(value: unknown, field: string) {
  const parsed = Number(value)

  if (Number.isFinite(parsed)) {
    return parsed
  }

  throw new ApiError(`请求参数校验失败：${field} 必须是有效数字。`)
}

function getOptionalNumber(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return undefined
  }

  return getRequiredNumber(value, field)
}

function getStringArray(value: unknown, field: string) {
  if (!Array.isArray(value)) {
    throw new ApiError(`请求参数校验失败：${field} 必须是数组。`)
  }

  const normalized = value.map((item) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new ApiError(`请求参数校验失败：${field} 中存在无效值。`)
    }

    return item.trim()
  })

  return normalized
}

function getOptionalStringArray(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return undefined
  }

  return getStringArray(value, field)
}

function getOptionalStatus(value: unknown, field: string) {
  const normalized = getOptionalNumber(value, field)

  if (normalized === undefined) {
    return undefined
  }

  if (normalized === 1 || normalized === 2) {
    return normalized
  }

  throw new ApiError(`请求参数校验失败：${field} 仅支持 1 或 2。`)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}
