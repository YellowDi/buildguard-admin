import { createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiUrl } from "@/lib/api"

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
  BuildingArea?: string
  ContactPerson?: string
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

export type ListParksPayload = {
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const PARKS_API_URL = buildApiUrl(API_PATHS.parksList)
const PARKS_LOAD_ERROR_MESSAGE = "园区列表加载失败，请稍后重试。"

export async function fetchParks(payload: ListParksPayload = {}): Promise<ParksListResult> {
  const normalizedPayload = {
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(PARKS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as ParksListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, PARKS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeParkListItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
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

function getOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number.`)
  }

  return value
}
