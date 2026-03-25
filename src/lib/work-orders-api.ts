import { createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

type WorkOrdersListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type WorkOrderListItem = {
  Uuid?: string
  Id?: number
  OrderNo?: string
  PlanUuid?: string
  PlanName?: string
  PackageName?: string
  CustomerUuid?: string
  CustomerName?: string
  Deadline?: string
  Executor?: string
  Status?: number
  Score?: number
  Result?: number
  Remark?: string
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type WorkOrdersListResult = {
  list: WorkOrderListItem[]
  total: number
}

export type ListWorkOrdersPayload = {
  PackageName?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const WORK_ORDERS_API_URL = buildApiUrl(API_PATHS.workOrdersList)
const WORK_ORDERS_LOAD_ERROR_MESSAGE = "工单列表加载失败，请稍后重试。"

export async function fetchWorkOrders(payload: ListWorkOrdersPayload = {}): Promise<WorkOrdersListResult> {
  const normalizedPayload = {
    PackageName: getOptionalString(payload.PackageName),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(WORK_ORDERS_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as WorkOrdersListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, WORK_ORDERS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeWorkOrderListItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

function extractList(payload: WorkOrdersListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as WorkOrdersListEnvelope

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

function extractTotal(payload: WorkOrdersListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as WorkOrdersListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeWorkOrderListItem(value: unknown): WorkOrderListItem {
  if (value && typeof value === "object") {
    return value as WorkOrderListItem
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
