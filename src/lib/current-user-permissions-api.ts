import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl } from "@/lib/api"

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
const NODE_ARRAY_KEYS = ["Nodes", "nodes", "List", "list"] as const
const NESTED_PAYLOAD_KEYS = ["data", "Data", "result", "Result"] as const

export async function fetchUserPermissionTree(payload: UserPermissionTreePayload): Promise<UserPermissionTreeResult> {
  const uuid = getRequiredString(payload.Uuid, "Uuid")
  const url = buildApiRequestUrl(API_PATHS.userPermissionTree)

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
    Nodes: extractPermissionNodes(responsePayload),
  }
}

function extractPermissionNodes(payload: unknown, depth = 0): PermissionTreeNode[] {
  if (depth > 4) {
    return []
  }

  if (Array.isArray(payload)) {
    return payload as PermissionTreeNode[]
  }

  const record = asRecord(payload)

  if (!record) {
    return []
  }

  for (const key of NODE_ARRAY_KEYS) {
    if (Array.isArray(record[key])) {
      return record[key] as PermissionTreeNode[]
    }
  }

  for (const key of NESTED_PAYLOAD_KEYS) {
    const nestedNodes = extractPermissionNodes(record[key], depth + 1)

    if (nestedNodes.length > 0) {
      return nestedNodes
    }
  }

  return []
}

function getRequiredString(value: unknown, field: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  throw new ApiError(`请求参数校验失败：${field} 不能为空。`)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}
