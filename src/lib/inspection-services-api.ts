import { createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

type InspectionServicesListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

type InspectionServiceBuildItem = {
  BuildUuid?: string
  BuildId?: number
  BuildName?: string
  ParkUuid?: string
  ParkId?: number
  ParkName?: string
  [property: string]: unknown
}

export type InspectionServiceListItem = {
  Uuid?: string
  Id?: number
  Name?: string
  CustomerId?: number
  CustomerName?: string
  CustomerUuid?: string
  Level?: string
  ManagerName?: string
  ManagerPhone?: string
  TemplateId?: number
  TemplateUuid?: string
  TemplateName?: string
  Builds?: InspectionServiceBuildItem[]
  Remark?: string
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type InspectionServicesListResult = {
  list: InspectionServiceListItem[]
  total: number
}

export type ListInspectionServicesPayload = {
  Name?: string
  CustomerUuid?: string
  TemplateUuid?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const INSPECTION_SERVICES_API_URL = buildApiUrl(API_PATHS.inspectionServicesList)
const INSPECTION_SERVICES_LOAD_ERROR_MESSAGE = "检测服务列表加载失败，请稍后重试。"

export async function fetchInspectionServices(
  payload: ListInspectionServicesPayload = {},
): Promise<InspectionServicesListResult> {
  const normalizedPayload = {
    Name: getOptionalString(payload.Name),
    CustomerUuid: getOptionalString(payload.CustomerUuid),
    TemplateUuid: getOptionalString(payload.TemplateUuid),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(INSPECTION_SERVICES_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as InspectionServicesListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, INSPECTION_SERVICES_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeInspectionServiceListItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

function extractList(payload: InspectionServicesListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionServicesListEnvelope

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

function extractTotal(payload: InspectionServicesListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionServicesListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeInspectionServiceListItem(value: unknown): InspectionServiceListItem {
  if (!value || typeof value !== "object") {
    return {}
  }

  const record = value as InspectionServiceListItem

  return {
    ...record,
    Builds: Array.isArray(record.Builds)
      ? record.Builds.filter(item => item && typeof item === "object") as InspectionServiceBuildItem[]
      : [],
  }
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
