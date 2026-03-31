import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

type InspectionServiceTemplatesListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type InspectionServiceTemplateInspectionItem = {
  CategoryName?: string
  InspectionName?: string
  InspectionUuid?: string
  [property: string]: unknown
}

export type InspectionServiceTemplateRecord = {
  Id?: number
  Inspections?: InspectionServiceTemplateInspectionItem[]
  Name?: string
  Uuid?: string
  [property: string]: unknown
}

export type InspectionServiceTemplatesListResult = {
  list: InspectionServiceTemplateRecord[]
  total: number
}

export type ListInspectionServiceTemplatesPayload = {
  Name?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const INSPECTION_SERVICE_TEMPLATES_API_URL = buildApiUrl(API_PATHS.inspectionServiceTemplatesList)
const INSPECTION_SERVICE_TEMPLATES_LOAD_ERROR_MESSAGE = "检测服务模板列表加载失败，请稍后重试。"

export async function fetchInspectionServiceTemplates(
  payload: ListInspectionServiceTemplatesPayload = {},
): Promise<InspectionServiceTemplatesListResult> {
  const normalizedPayload = {
    Name: getOptionalString(payload.Name),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(INSPECTION_SERVICE_TEMPLATES_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as InspectionServiceTemplatesListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, INSPECTION_SERVICE_TEMPLATES_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, INSPECTION_SERVICE_TEMPLATES_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload).map(item => normalizeTemplateRecord(item))

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

function extractList(payload: InspectionServiceTemplatesListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (Array.isArray(payload.list)) {
    return payload.list
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionServiceTemplatesListEnvelope

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

  return []
}

function extractTotal(payload: InspectionServiceTemplatesListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionServiceTemplatesListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeTemplateRecord(value: unknown): InspectionServiceTemplateRecord {
  const record = asRecord(value)

  if (!record) {
    return {}
  }

  return {
    ...record,
    Id: getOptionalNumber(record.Id, "Id"),
    Name: getOptionalString(record.Name),
    Uuid: getOptionalString(record.Uuid),
    Inspections: normalizeInspectionItems(record.Inspections),
  }
}

function normalizeInspectionItems(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => {
    const record = asRecord(item)

    if (!record) {
      return {}
    }

    return {
      ...record,
      CategoryName: getOptionalString(record.CategoryName),
      InspectionName: getOptionalString(record.InspectionName),
      InspectionUuid: getOptionalString(record.InspectionUuid),
    }
  })
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}

function getOptionalString(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized || undefined
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return undefined
}

function getOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const numeric = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(numeric)) {
    throw new TypeError(`${fieldName} must be a finite number`)
  }

  return numeric
}
