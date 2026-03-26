import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

type ParksListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type ParkListItem = {
  Uuid?: string
  Id?: number
  CustomerUuid?: string
  Name?: string
  BuiltTime?: string
  OperationTime?: string
  BuildArea?: string
  Contact?: string
  ContactPhone?: string
  Latitude?: string
  Longitude?: string
  Address?: string
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type ParksListResult = {
  list: ParkListItem[]
  total: number
}

export type ParkCreatePayload = {
  CustomerUuid: string
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

export type ParkCreateResult = {
  Uuid?: string
  Id?: number
  [property: string]: unknown
}

export type ParkDetailPayload = {
  Uuid?: string
}

export type ParkDetailResult = {
  Uuid?: string
  Id?: number
  CustomerUuid?: string
  Name?: string
  BuiltTime?: string
  OperationTime?: string
  CorpName?: string
  BuildArea?: string
  Contact?: string
  ContactPhone?: string
  Latitude?: string
  Longitude?: string
  Address?: string
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type ListParksPayload = {
  CustomerUuid?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const PARKS_API_URL = buildApiUrl(API_PATHS.parksList)
const PARK_CREATE_API_URL = buildApiUrl(API_PATHS.parkCreate)
const PARK_DETAIL_API_URL = buildApiUrl(API_PATHS.parkDetail)
const PARKS_LOAD_ERROR_MESSAGE = "园区列表加载失败，请稍后重试。"
const PARK_CREATE_ERROR_MESSAGE = "园区创建失败，请稍后重试。"
const PARK_DETAIL_LOAD_ERROR_MESSAGE = "园区详情加载失败，请稍后重试。"

export async function fetchParks(payload: ListParksPayload = {}): Promise<ParksListResult> {
  const normalizedPayload = {
    CustomerUuid: getOptionalString(payload.CustomerUuid),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(PARKS_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as ParksListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, PARKS_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, PARKS_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeParkListItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createPark(payload: ParkCreatePayload): Promise<ParkCreateResult> {
  const normalizedPayload = {
    CustomerUuid: getRequiredString(payload.CustomerUuid, "CustomerUuid"),
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

  const response = await fetch(PARK_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, PARK_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, PARK_CREATE_ERROR_MESSAGE)

  return extractCreateResult(responsePayload)
}

export async function fetchParkDetail(payload: ParkDetailPayload): Promise<ParkDetailResult> {
  const url = buildApiRequestUrl(API_PATHS.parkDetail)
  const uuid = getOptionalString(payload.Uuid)

  if (!uuid) {
    throw new TypeError("Uuid is required.")
  }

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, PARK_DETAIL_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, PARK_DETAIL_LOAD_ERROR_MESSAGE)

  return normalizeParkDetail(extractDetailRecord(responsePayload))
}

function extractList(payload: ParksListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as ParksListEnvelope

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

function extractTotal(payload: ParksListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as ParksListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeParkListItem(value: unknown): ParkListItem {
  if (value && typeof value === "object") {
    return value as ParkListItem
  }

  return {}
}

function extractCreateResult(value: unknown): ParkCreateResult {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>

    if (record.data && typeof record.data === "object") {
      return record.data as ParkCreateResult
    }

    return record as ParkCreateResult
  }

  return {}
}

function extractDetailRecord(value: unknown) {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>

    if (record.data && typeof record.data === "object") {
      return record.data as ParkDetailResult
    }

    return record as ParkDetailResult
  }

  return {}
}

function normalizeParkDetail(value: ParkDetailResult) {
  return value
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

function getRequiredString(value: unknown, field: string) {
  const normalized = getOptionalString(value)

  if (normalized) {
    return normalized
  }

  throw new TypeError(`${field} is required.`)
}
