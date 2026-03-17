import { createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiUrl } from "@/lib/api"

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

export type UpdateMemberPayload = {
  Uuid?: string
  DepartmentUuid?: string
  Name: string
  Phone: string
  Position: string
  Status: number
  RoleUuids: string[]
}

export type UpdateMemberStatusPayload = {
  id: number
  status: number
}

const MEMBERS_API_URL = buildApiUrl(API_PATHS.membersList)
const MEMBER_STATUS_UPDATE_API_URL = buildApiUrl(API_PATHS.memberStatusUpdate)
const MEMBER_UPDATE_API_URL = buildApiUrl(API_PATHS.memberUpdate)

const MEMBERS_LOAD_ERROR_MESSAGE = "成员列表加载失败，请稍后重试。"
const MEMBER_STATUS_UPDATE_ERROR_MESSAGE = "成员状态更新失败，请稍后重试。"
const MEMBER_UPDATE_ERROR_MESSAGE = "成员信息更新失败，请稍后重试。"

export async function fetchMembers(): Promise<MembersListResult> {
  const response = await fetch(MEMBERS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  })
  const payload = await readResponseBody(response) as MembersListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, payload, MEMBERS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(payload)

  return {
    list,
    total: extractTotal(payload, list.length),
  }
}

export async function updateMember(payload: UpdateMemberPayload) {
  const response = await fetch(MEMBER_UPDATE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEMBER_UPDATE_ERROR_MESSAGE)
  }
}

export async function updateMemberStatus(payload: UpdateMemberStatusPayload) {
  const response = await fetch(MEMBER_STATUS_UPDATE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEMBER_STATUS_UPDATE_ERROR_MESSAGE)
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
