import { ApiError, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiUrl } from "@/lib/api"

type InspectionItemsListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type InspectionItemRecord = {
  Uuid?: string
  Id?: number
  Name?: string
  CategoryId?: number
  CategoryUuid?: string
  CategoryName?: string
  Content?: string
  Standard?: string
  IsForcePhoto?: number
  IsMeasureRecord?: number
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type InspectionItemsListResult = {
  list: InspectionItemRecord[]
  total: number
}

export type ListInspectionItemsPayload = {
  Name?: string
  CategoryName?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

export type InspectionItemDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type CreateInspectionItemPayload = {
  Name: string
  CategoryId?: number
  CategoryUuid?: string
  CategoryName?: string
  Content?: string
  Standard?: string
  IsForcePhoto?: number
  IsMeasureRecord?: number
  [property: string]: unknown
}

export type UpdateInspectionItemPayload = CreateInspectionItemPayload & {
  Uuid?: string
}

export type DeleteInspectionItemPayload = {
  Uuid?: string
  [property: string]: unknown
}

const INSPECTION_ITEMS_API_URL = buildApiUrl(API_PATHS.inspectionItemsList)
const INSPECTION_ITEM_CREATE_API_URL = buildApiUrl(API_PATHS.inspectionItemCreate)
const INSPECTION_ITEM_DETAIL_API_URL = buildApiUrl(API_PATHS.inspectionItemDetail)
const INSPECTION_ITEM_UPDATE_API_URL = buildApiUrl(API_PATHS.inspectionItemUpdate)
const INSPECTION_ITEM_DELETE_API_URL = buildApiUrl(API_PATHS.inspectionItemDelete)

const INSPECTION_ITEMS_LOAD_ERROR_MESSAGE = "检测项列表加载失败，请稍后重试。"
const INSPECTION_ITEM_CREATE_ERROR_MESSAGE = "检测项创建失败，请稍后重试。"
const INSPECTION_ITEM_DETAIL_ERROR_MESSAGE = "检测项详情加载失败，请稍后重试。"
const INSPECTION_ITEM_UPDATE_ERROR_MESSAGE = "检测项更新失败，请稍后重试。"
const INSPECTION_ITEM_DELETE_ERROR_MESSAGE = "检测项删除失败，请稍后重试。"

export async function fetchInspectionItems(
  payload: ListInspectionItemsPayload = {},
): Promise<InspectionItemsListResult> {
  const normalizedPayload = {
    Name: getOptionalString(payload.Name),
    CategoryName: getOptionalString(payload.CategoryName),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(INSPECTION_ITEMS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as InspectionItemsListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, INSPECTION_ITEMS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createInspectionItem(payload: CreateInspectionItemPayload) {
  const response = await fetch(INSPECTION_ITEM_CREATE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizeWritePayload(payload)),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_ITEM_CREATE_ERROR_MESSAGE)
  }

  return extractDetailRecord(responseBody)
}

export async function getInspectionItemDetail(
  payload: InspectionItemDetailPayload,
): Promise<InspectionItemRecord> {
  const url = new URL(INSPECTION_ITEM_DETAIL_API_URL)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_ITEM_DETAIL_ERROR_MESSAGE)
  }

  return extractDetailRecord(responseBody)
}

export async function updateInspectionItem(payload: UpdateInspectionItemPayload) {
  const response = await fetch(INSPECTION_ITEM_UPDATE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
      ...normalizeWritePayload(payload),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_ITEM_UPDATE_ERROR_MESSAGE)
  }
}

export async function deleteInspectionItem(payload: DeleteInspectionItemPayload) {
  const url = new URL(INSPECTION_ITEM_DELETE_API_URL)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_ITEM_DELETE_ERROR_MESSAGE)
  }
}

function normalizeWritePayload(payload: CreateInspectionItemPayload | UpdateInspectionItemPayload) {
  return {
    Name: getRequiredString(payload.Name, "Name"),
    CategoryId: getOptionalNumber(payload.CategoryId, "CategoryId"),
    CategoryUuid: getOptionalString(payload.CategoryUuid),
    CategoryName: getOptionalString(payload.CategoryName),
    Content: getOptionalString(payload.Content) ?? "",
    Standard: getOptionalString(payload.Standard) ?? "",
    IsForcePhoto: normalizeFlag(payload.IsForcePhoto, "IsForcePhoto"),
    IsMeasureRecord: normalizeFlag(payload.IsMeasureRecord, "IsMeasureRecord"),
  }
}

function extractList(payload: InspectionItemsListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload as InspectionItemRecord[]
  }

  if (Array.isArray(payload.List)) {
    return payload.List as InspectionItemRecord[]
  }

  if (Array.isArray(payload.data)) {
    return payload.data as InspectionItemRecord[]
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionItemsListEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List as InspectionItemRecord[]
    }

    if (Array.isArray(nested.list)) {
      return nested.list as InspectionItemRecord[]
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows as InspectionItemRecord[]
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list as InspectionItemRecord[]
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows as InspectionItemRecord[]
  }

  return []
}

function extractTotal(payload: InspectionItemsListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionItemsListEnvelope

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
    return nestedRecord as InspectionItemRecord
  }

  return directRecord as InspectionItemRecord
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
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  return getRequiredNumber(value, field)
}

function normalizeFlag(value: unknown, field: string) {
  const normalized = getOptionalNumber(value, field)
  return normalized !== undefined && normalized > 0 ? 1 : 0
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}
