import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl } from "@/lib/api"

type PermissionTreeEnvelope = {
  List?: unknown
  Nodes?: unknown
  Data?: unknown
  data?: unknown
  list?: unknown
  nodes?: unknown
  result?: unknown
  Result?: unknown
}

export type PermissionTreeNode = {
  Children?: PermissionTreeNode[]
  Name?: string
  Path?: string
  Type?: string
  Uuid?: string
  [property: string]: unknown
}

export type UserPermissionTreePayload = {
  Uuid?: string
  [property: string]: unknown
}

export type UserPermissionTreeResult = {
  Nodes: PermissionTreeNode[]
}

const USER_PERMISSION_TREE_ERROR_MESSAGE = "用户权限加载失败，请稍后重试。"

export async function fetchUserPermissionTree(payload: UserPermissionTreePayload): Promise<UserPermissionTreeResult> {
  const url = buildApiRequestUrl(API_PATHS.userPermissionTree)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, USER_PERMISSION_TREE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, USER_PERMISSION_TREE_ERROR_MESSAGE)

  return {
    Nodes: extractNodes(responsePayload),
  }
}

function extractNodes(payload: unknown): PermissionTreeNode[] {
  if (Array.isArray(payload)) {
    return payload as PermissionTreeNode[]
  }

  const directNodes = findNodeArray(payload)

  if (directNodes) {
    return directNodes
  }

  return []
}

function findNodeArray(payload: unknown, depth = 0): PermissionTreeNode[] | null {
  if (depth > 4) {
    return null
  }

  if (Array.isArray(payload)) {
    return payload as PermissionTreeNode[]
  }

  const record = asRecord(payload)

  if (!record) {
    return null
  }

  for (const key of ["Nodes", "nodes", "List", "list"] as const) {
    if (Array.isArray(record[key])) {
      return record[key] as PermissionTreeNode[]
    }
  }

  for (const key of ["data", "Data", "result", "Result"] as const) {
    const nested = findNodeArray((record as PermissionTreeEnvelope)[key], depth + 1)

    if (nested) {
      return nested
    }
  }

  return null
}

function getRequiredString(value: unknown, field: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  throw new Error(`请求参数校验失败：${field} 不能为空。`)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}
