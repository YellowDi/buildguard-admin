import { createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

type InspectionPlansEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type InspectionPlanListItem = {
  Id?: number
  Uuid?: string
  CustomerUuid?: string
  CorpName?: string
  ServiceName?: string
  CycleType?: string
  Duration?: number
  NextTime?: string
  LastestTime?: string
  PlanStatus?: string
  Status?: number
  [property: string]: unknown
}

export type InspectionPlansResult = {
  list: InspectionPlanListItem[]
  total: number
}

export type ListInspectionPlansPayload = {
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const INSPECTION_PLANS_API_URL = buildApiUrl(API_PATHS.inspectionPlansList)
const INSPECTION_PLANS_LOAD_ERROR_MESSAGE = "检测计划列表加载失败，请稍后重试。"

export async function fetchInspectionPlans(
  payload: ListInspectionPlansPayload = {},
): Promise<InspectionPlansResult> {
  const normalizedPayload = {
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(INSPECTION_PLANS_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as InspectionPlansEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, INSPECTION_PLANS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeInspectionPlan(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

function extractList(payload: InspectionPlansEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionPlansEnvelope

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

function extractTotal(payload: InspectionPlansEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionPlansEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeInspectionPlan(value: unknown): InspectionPlanListItem {
  if (value && typeof value === "object") {
    return value as InspectionPlanListItem
  }

  return {}
}

function getOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number.`)
  }

  return value
}
