import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

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
  CustomerUuid?: string
  CorpName?: string
  CustomerName?: string
  Name?: string
  BuiltTime?: string
  OperationTime?: string
  BuildingArea?: string
  BuildArea?: string
  ContactPerson?: string
  Contact?: string
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

export type BuildingCreatePayload = {
  ParkUuid: string
  Name: string
  BuiltTime?: string
  OperationTime?: string
  BuildArea?: string
  Contact?: string
  ContactPhone?: string
  Latitude?: string
  Longitude?: string
  Address?: string
}

export type BuildingUpdatePayload = BuildingCreatePayload & {
  Uuid: string
}

export type BuildingCreateResult = {
  Uuid?: string
  Id?: number
  [property: string]: unknown
}

export type BuildingDeletePayload = {
  Uuid?: string
  [property: string]: unknown
}

export type ListBuildingsPayload = {
  ParkUuid?: string
  CustomerUuid?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const BUILDINGS_API_URL = buildApiUrl(API_PATHS.buildingsList)
const BUILDING_CREATE_API_URL = buildApiUrl(API_PATHS.buildingCreate ?? "/bqi/build/new")
const BUILDING_UPDATE_API_URL = buildApiUrl(API_PATHS.buildingUpdate ?? "/bqi/build/update")
const BUILDING_DELETE_API_URL = API_PATHS.buildingDelete ?? "/bqi/build/del"
const BUILDINGS_LOAD_ERROR_MESSAGE = "建筑列表加载失败，请稍后重试。"
const BUILDING_CREATE_ERROR_MESSAGE = "建筑创建失败，请稍后重试。"
const BUILDING_UPDATE_ERROR_MESSAGE = "建筑信息更新失败，请稍后重试。"
const BUILDING_DELETE_ERROR_MESSAGE = "建筑删除失败，请稍后重试。"

export async function fetchBuildings(payload: ListBuildingsPayload = {}): Promise<BuildingsListResult> {
  const normalizedPayload = {
    ParkUuid: getOptionalString(payload.ParkUuid),
    CustomerUuid: getOptionalString(payload.CustomerUuid),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(BUILDINGS_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as BuildingsListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, BUILDINGS_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, BUILDINGS_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeBuildingListItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createBuilding(payload: BuildingCreatePayload): Promise<BuildingCreateResult> {
  const normalizedPayload = {
    ParkUuid: getRequiredString(payload.ParkUuid, "ParkUuid"),
    Name: getRequiredString(payload.Name, "Name"),
    BuiltTime: getOptionalString(payload.BuiltTime),
    OperationTime: getOptionalString(payload.OperationTime),
    BuildArea: getOptionalString(payload.BuildArea),
    Contact: getOptionalString(payload.Contact),
    ContactPhone: getOptionalString(payload.ContactPhone),
    Latitude: getOptionalString(payload.Latitude),
    Longitude: getOptionalString(payload.Longitude),
    Address: getOptionalString(payload.Address),
  }

  const response = await fetch(BUILDING_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, BUILDING_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, BUILDING_CREATE_ERROR_MESSAGE)

  return extractCreateResult(responsePayload)
}

export async function updateBuilding(payload: BuildingUpdatePayload): Promise<BuildingCreateResult> {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    ParkUuid: getRequiredString(payload.ParkUuid, "ParkUuid"),
    Name: getRequiredString(payload.Name, "Name"),
    BuiltTime: getOptionalString(payload.BuiltTime),
    OperationTime: getOptionalString(payload.OperationTime),
    BuildArea: getOptionalString(payload.BuildArea),
    Contact: getOptionalString(payload.Contact),
    ContactPhone: getOptionalString(payload.ContactPhone),
    Latitude: getOptionalString(payload.Latitude),
    Longitude: getOptionalString(payload.Longitude),
    Address: getOptionalString(payload.Address),
  }

  const response = await fetch(BUILDING_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, BUILDING_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, BUILDING_UPDATE_ERROR_MESSAGE)

  return extractCreateResult(responsePayload)
}

export async function deleteBuilding(payload: BuildingDeletePayload) {
  const url = buildApiRequestUrl(BUILDING_DELETE_API_URL)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, BUILDING_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, BUILDING_DELETE_ERROR_MESSAGE)
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
    const item = value as BuildingListItem

    return {
      ...item,
      BuildingArea: getFirstNonEmptyText(item.BuildingArea, item.BuildArea),
      ContactPerson: getFirstNonEmptyText(item.ContactPerson, item.Contact),
    }
  }

  return {}
}

function extractCreateResult(value: unknown): BuildingCreateResult {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>

    if (record.data && typeof record.data === "object") {
      return record.data as BuildingCreateResult
    }

    return record as BuildingCreateResult
  }

  return {}
}

function getFirstNonEmptyText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return undefined
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

function getRequiredString(value: unknown, field: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  throw new ApiError(`请求参数校验失败：${field} 为必填项。`)
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

  throw new ApiError("请求参数校验失败：字段必须是有效字符串。")
}
