import { ApiError, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiUrl } from "@/lib/api"

type BuildingsListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type BuildingListItem = {
  Uuid?: string
  Id?: number
  ParkUuid?: string
  ParkName?: string
  Name?: string
  BuiltTime?: string
  OperationTime?: string
  BuildingArea?: string
  ContactPerson?: string
  ContactPhone?: string
  Latitude?: string
  Longitude?: string
  Address?: string
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type BuildingsListResult = {
  list: BuildingListItem[]
  total: number
}

export type ListBuildingsPayload = {
  ParkUuid?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const BUILDINGS_API_URL = buildApiUrl(API_PATHS.buildingsList)
const BUILDINGS_LOAD_ERROR_MESSAGE = "建筑列表加载失败，请稍后重试。"

export async function fetchBuildings(payload: ListBuildingsPayload = {}): Promise<BuildingsListResult> {
  const normalizedPayload = {
    ParkUuid: getOptionalString(payload.ParkUuid),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(BUILDINGS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as BuildingsListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, BUILDINGS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeBuildingListItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

function extractList(payload: BuildingsListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as BuildingsListEnvelope

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

function extractTotal(payload: BuildingsListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as BuildingsListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeBuildingListItem(value: unknown): BuildingListItem {
  if (value && typeof value === "object") {
    return value as BuildingListItem
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

  throw new ApiError("请求参数校验失败：ParkUuid 必须是有效字符串。")
}
