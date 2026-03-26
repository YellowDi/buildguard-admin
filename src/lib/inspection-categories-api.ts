import { createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

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
  [property: string]: unknown
}

export type InspectionCategoriesListResult = {
  list: InspectionCategoryRecord[]
  total: number
}

const INSPECTION_CATEGORIES_API_URL = buildApiUrl(API_PATHS.inspectionCategoriesList)
const INSPECTION_CATEGORIES_LOAD_ERROR_MESSAGE = "检测项分类列表加载失败，请稍后重试。"

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

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
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
