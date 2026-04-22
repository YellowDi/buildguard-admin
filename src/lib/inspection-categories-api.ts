import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

type InspectionCategoriesListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type InspectionCategoryRecord = {
  Uuid?: string
  Id?: number
  Name?: string
  Content?: string
  Score?: number
  Total?: number
  [property: string]: unknown
}

export type InspectionCategoriesListResult = {
  list: InspectionCategoryRecord[]
  total: number
}

export type CreateInspectionCategoryPayload = {
  Name: string
  Content?: string
  Score?: number
  [property: string]: unknown
}

export type InspectionCategoryDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type UpdateInspectionCategoryPayload = {
  Uuid: string
  Name: string
  Content?: string
  Score?: number
  [property: string]: unknown
}

export type DeleteInspectionCategoryPayload = {
  Uuid: string
  [property: string]: unknown
}

const INSPECTION_CATEGORIES_API_URL = buildApiUrl(API_PATHS.inspectionCategoriesList)
const INSPECTION_CATEGORY_CREATE_API_URL = buildApiUrl(API_PATHS.inspectionCategoryCreate)
const INSPECTION_CATEGORY_UPDATE_API_URL = buildApiUrl(API_PATHS.inspectionCategoryUpdate)
const INSPECTION_CATEGORIES_LOAD_ERROR_MESSAGE = "检测项分类列表加载失败，请稍后重试。"
const INSPECTION_CATEGORY_CREATE_ERROR_MESSAGE = "检测项分类创建失败，请稍后重试。"
const INSPECTION_CATEGORY_DETAIL_ERROR_MESSAGE = "检测项分类详情加载失败，请稍后重试。"
const INSPECTION_CATEGORY_UPDATE_ERROR_MESSAGE = "检测项分类更新失败，请稍后重试。"
const INSPECTION_CATEGORY_DELETE_ERROR_MESSAGE = "检测项分类删除失败，请稍后重试。"

export async function fetchInspectionCategories(): Promise<InspectionCategoriesListResult> {
  const response = await fetch(INSPECTION_CATEGORIES_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({}),
  })
  const responsePayload = await readResponseBody(response) as InspectionCategoriesListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, INSPECTION_CATEGORIES_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, INSPECTION_CATEGORIES_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createInspectionCategory(payload: CreateInspectionCategoryPayload) {
  const response = await fetch(INSPECTION_CATEGORY_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Name: getRequiredString(payload.Name, "Name"),
      Content: getOptionalString(payload.Content) ?? "",
      ...resolveOptionalScorePayload(payload.Score),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_CATEGORY_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_CATEGORY_CREATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function getInspectionCategoryDetail(
  payload: InspectionCategoryDetailPayload,
): Promise<InspectionCategoryRecord> {
  const url = buildApiRequestUrl(API_PATHS.inspectionCategoryDetail)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_CATEGORY_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_CATEGORY_DETAIL_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function updateInspectionCategory(payload: UpdateInspectionCategoryPayload) {
  const response = await fetch(INSPECTION_CATEGORY_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
      Name: getRequiredString(payload.Name, "Name"),
      Content: getOptionalString(payload.Content) ?? "",
      ...resolveOptionalScorePayload(payload.Score),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_CATEGORY_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_CATEGORY_UPDATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function deleteInspectionCategory(payload: DeleteInspectionCategoryPayload) {
  const url = buildApiRequestUrl(API_PATHS.inspectionCategoryDelete)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_CATEGORY_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_CATEGORY_DELETE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

function extractList(payload: InspectionCategoriesListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload as InspectionCategoryRecord[]
  }

  if (Array.isArray(payload.List)) {
    return payload.List as InspectionCategoryRecord[]
  }

  if (Array.isArray(payload.data)) {
    return payload.data as InspectionCategoryRecord[]
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionCategoriesListEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List as InspectionCategoryRecord[]
    }

    if (Array.isArray(nested.list)) {
      return nested.list as InspectionCategoryRecord[]
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows as InspectionCategoryRecord[]
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list as InspectionCategoryRecord[]
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows as InspectionCategoryRecord[]
  }

  return []
}

function extractTotal(payload: InspectionCategoriesListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionCategoriesListEnvelope

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
      return envelope.data as InspectionCategoryRecord
    }

    return envelope as InspectionCategoryRecord
  }

  return {} as InspectionCategoryRecord
}

function getRequiredString(value: unknown, fieldName: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  throw new TypeError(`${fieldName} is required`)
}

function getOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized || undefined
  }

  throw new TypeError("String value is invalid")
}

function getRequiredNonNegativeInteger(value: unknown, fieldName: string) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)

    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed
    }
  }

  throw new TypeError(`${fieldName} must be a non-negative integer`)
}

function getOptionalNonNegativeInteger(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  return getRequiredNonNegativeInteger(value, fieldName)
}

function resolveOptionalScorePayload(value: unknown) {
  const score = getOptionalNonNegativeInteger(value, "Score")

  return score === undefined
    ? {}
    : { Score: score }
}
