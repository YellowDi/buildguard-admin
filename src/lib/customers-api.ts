import { ApiError, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiUrl } from "@/lib/api"

type CustomerListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type CustomerListItem = {
  Business?: string
  Level?: number
  PrincipalName?: string
  PrincipalPhone?: string
  [property: string]: unknown
}

export type CustomerPrincipalPayload = {
  Name?: string
  Phone?: string
  IsMain?: number
}

export type CustomerDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type CustomerDetailPerson = {
  Name?: string
  Phone?: string
  IsMain?: number
  [property: string]: unknown
}

export type CustomerDetailResult = {
  Id?: number
  Uuid?: string
  People?: CustomerDetailPerson[]
  Business?: string
  Usci?: string
  UsciFile?: string
  CorpName?: string
  Address?: string
  Invoice?: string
  Level?: number
  [property: string]: unknown
}

export type CustomerListResult = {
  list: CustomerListItem[]
  total: number
}

export type CustomerCreatePayload = {
  People?: CustomerPrincipalPayload[]
  Business?: string
  Usci?: string
  UsciFile?: string
  CorpName?: string
  Address?: string
  Invoice?: string
  Level?: number
  [property: string]: unknown
}

export type CustomerCreateResult = {
  Id?: number
  Uuid?: string
}

export type ListCustomersPayload = {
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const CUSTOMERS_API_URL = buildApiUrl(API_PATHS.customersList)
const CUSTOMER_CREATE_API_URL = buildApiUrl(API_PATHS.customerCreate)
const CUSTOMER_DETAIL_API_URL = buildApiUrl(API_PATHS.customerDetail)
const CUSTOMERS_LOAD_ERROR_MESSAGE = "客户列表加载失败，请稍后重试。"
const CUSTOMER_CREATE_ERROR_MESSAGE = "客户创建失败，请稍后重试。"
const CUSTOMER_DETAIL_ERROR_MESSAGE = "客户详情加载失败，请稍后重试。"

export async function fetchCustomers(payload: ListCustomersPayload = {}): Promise<CustomerListResult> {
  const normalizedPayload = {
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(CUSTOMERS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as CustomerListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, CUSTOMERS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeCustomerListItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createCustomer(payload: CustomerCreatePayload): Promise<CustomerCreateResult> {
  const normalizedPayload = {
    People: getOptionalPrincipals(payload.People),
    Business: getOptionalString(payload.Business),
    Usci: getOptionalString(payload.Usci),
    UsciFile: getOptionalString(payload.UsciFile),
    CorpName: getOptionalString(payload.CorpName),
    Address: getOptionalString(payload.Address),
    Invoice: getOptionalString(payload.Invoice),
    Level: getOptionalNumber(payload.Level, "Level"),
  }

  const response = await fetch(CUSTOMER_CREATE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, CUSTOMER_CREATE_ERROR_MESSAGE)
  }

  return extractCreateResult(responseBody)
}

export async function fetchCustomerDetail(payload: CustomerDetailPayload): Promise<CustomerDetailResult> {
  const url = new URL(CUSTOMER_DETAIL_API_URL)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, CUSTOMER_DETAIL_ERROR_MESSAGE)
  }

  return extractDetailRecord(responseBody)
}

function extractList(payload: CustomerListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as CustomerListEnvelope

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

function extractTotal(payload: CustomerListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as CustomerListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeCustomerListItem(value: unknown): CustomerListItem {
  if (value && typeof value === "object") {
    return value as CustomerListItem
  }

  return {}
}

function extractCreateResult(value: unknown): CustomerCreateResult {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>

    if (record.data && typeof record.data === "object") {
      return record.data as CustomerCreateResult
    }

    return record as CustomerCreateResult
  }

  return {}
}

function extractDetailRecord(value: unknown): CustomerDetailResult {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>

    if (record.data && typeof record.data === "object") {
      return record.data as CustomerDetailResult
    }

    return record as CustomerDetailResult
  }

  return {}
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

function getRequiredString(value: unknown, field: string) {
  const normalized = getOptionalString(value)

  if (normalized) {
    return normalized
  }

  throw new ApiError(`请求参数校验失败：${field} 不能为空。`)
}

function getOptionalNumber(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return undefined
  }

  const parsed = Number(value)

  if (Number.isFinite(parsed)) {
    return parsed
  }

  throw new ApiError(`请求参数校验失败：${field} 必须是有效数字。`)
}

function getOptionalPrincipals(value: unknown) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new ApiError("请求参数校验失败：People 必须是数组。")
  }

  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new ApiError("请求参数校验失败：People 中存在无效值。")
    }

    const record = item as Record<string, unknown>

    return {
      Name: getOptionalString(record.Name),
      Phone: getOptionalString(record.Phone),
      IsMain: getOptionalNumber(record.IsMain, "People.IsMain"),
    }
  })
}
