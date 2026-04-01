import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

type InspectionPlansEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type InspectionPlanListItem = {
  Code?: string
  ContractCode?: string
  Id?: number
  CorpName?: string
  CreatedAt?: string
  Creator?: string
  CustomerUuid?: string
  ServiceName?: string
  CycleType?: string
  Duration?: number
  FirstTime?: string
  LastestOrderNo?: string
  NextTime?: string
  LastestTime?: string
  Name?: string
  PlanStatus?: string
  ServiceUuid?: string
  Status?: number
  Uuid?: string
  [property: string]: unknown
}

export type InspectionPlansResult = {
  list: InspectionPlanListItem[]
  total: number
}

export type InspectionPlanCreatePayload = {
  CustomerUuid: string
  CycleType: number
  Duration: number
  EndTime?: string
  FirstTime: string
  Name: string
  ServiceUuid: string
}

export type InspectionPlanCreateResult = {
  Id?: number
  Uuid?: string
  [property: string]: unknown
}

export type ListInspectionPlansPayload = {
  CustomerUuid?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const INSPECTION_PLANS_API_URL = buildApiUrl(API_PATHS.inspectionPlansList)
const INSPECTION_PLAN_CREATE_API_URL = buildApiUrl(API_PATHS.inspectionPlanCreate)
const INSPECTION_PLANS_LOAD_ERROR_MESSAGE = "检测计划列表加载失败，请稍后重试。"
const INSPECTION_PLAN_CREATE_ERROR_MESSAGE = "检测计划创建失败，请稍后重试。"

export async function fetchInspectionPlans(
  payload: ListInspectionPlansPayload = {},
): Promise<InspectionPlansResult> {
  const normalizedPayload = {
    CustomerUuid: getOptionalString(payload.CustomerUuid),
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

  assertApiSuccess(responsePayload, INSPECTION_PLANS_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeInspectionPlan(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createInspectionPlan(
  payload: InspectionPlanCreatePayload,
): Promise<InspectionPlanCreateResult> {
  const normalizedPayload = {
    CustomerUuid: getRequiredString(payload.CustomerUuid, "CustomerUuid"),
    CycleType: getRequiredString(payload.CycleType, "CycleType"),
    Duration: getRequiredNumber(payload.Duration, "Duration"),
    EndTime: getOptionalString(payload.EndTime),
    FirstTime: getRequiredString(payload.FirstTime, "FirstTime"),
    Name: getRequiredString(payload.Name, "Name"),
    ServiceUuid: getRequiredString(payload.ServiceUuid, "ServiceUuid"),
  }

  const response = await fetch(INSPECTION_PLAN_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_PLAN_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_PLAN_CREATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
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

function extractCreateResult(value: unknown) {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>

    if (record.data && typeof record.data === "object") {
      return record.data as InspectionPlanCreateResult
    }

    return record as InspectionPlanCreateResult
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

function getRequiredNumber(value: unknown, fieldName: string) {
  const normalized = getOptionalNumber(value, fieldName)

  if (normalized === undefined) {
    throw new TypeError(`${fieldName} is required.`)
  }

  return normalized
}

function getOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized || undefined
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  throw new TypeError("String field must be a string or number.")
}

function getRequiredString(value: unknown, fieldName: string) {
  const normalized = getOptionalString(value)

  if (!normalized) {
    throw new TypeError(`${fieldName} is required.`)
  }

  return normalized
}
