import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

type MediaTypesListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type MediaTypeKind = 1 | 2

export type MediaTypeRecord = {
  Children?: MediaTypeRecord[]
  Id?: number
  IsDefault?: number
  Name?: string
  ParentName?: string
  ParentUuid?: string
  SortNum?: number
  Uuid?: string
  [property: string]: unknown
}

export type MediaTypesListResult = {
  list: MediaTypeRecord[]
  total: number
}

export type ListMediaTypesPayload = {
  PageNum?: number
  PageSize?: number
  Type?: MediaTypeKind
  [property: string]: unknown
}

export type CreateMediaTypePayload = {
  Type: MediaTypeKind
  Name: string
  ParentUuid?: string
  SortNum?: number
  [property: string]: unknown
}

export type MediaTypeDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type UpdateMediaTypePayload = {
  Uuid?: string
  Name?: string
  SortNum?: number
  [property: string]: unknown
}

export type DeleteMediaTypePayload = {
  Uuid?: string
  [property: string]: unknown
}

const MEDIA_TYPE_LIST_API_URL = buildApiUrl(API_PATHS.mediaTypeList)
const MEDIA_TYPE_CREATE_API_URL = buildApiUrl(API_PATHS.mediaTypeCreate)
const MEDIA_TYPE_UPDATE_API_URL = buildApiUrl(API_PATHS.mediaTypeUpdate)

const MEDIA_TYPES_LOAD_ERROR_MESSAGE = "媒体分类列表加载失败，请稍后重试。"
const MEDIA_TYPE_CREATE_ERROR_MESSAGE = "媒体分类创建失败，请稍后重试。"
const MEDIA_TYPE_DETAIL_ERROR_MESSAGE = "媒体分类详情加载失败，请稍后重试。"
const MEDIA_TYPE_UPDATE_ERROR_MESSAGE = "媒体分类更新失败，请稍后重试。"
const MEDIA_TYPE_DELETE_ERROR_MESSAGE = "媒体分类删除失败，请稍后重试。"

export async function fetchMediaTypes(
  payload: ListMediaTypesPayload = {},
): Promise<MediaTypesListResult> {
  const response = await fetch(MEDIA_TYPE_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
      PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
      Type: getOptionalNumber(payload.Type, "Type"),
    }),
  })
  const responsePayload = await readResponseBody(response) as MediaTypesListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, MEDIA_TYPES_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, MEDIA_TYPES_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createMediaType(payload: CreateMediaTypePayload) {
  const response = await fetch(MEDIA_TYPE_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Type: getRequiredNumber(payload.Type, "Type"),
      Name: getRequiredString(payload.Name, "Name"),
      ParentUuid: getStringOrEmpty(payload.ParentUuid),
      SortNum: getOptionalNumber(payload.SortNum, "SortNum") ?? 0,
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_TYPE_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_TYPE_CREATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function getMediaTypeDetail(
  payload: MediaTypeDetailPayload,
): Promise<MediaTypeRecord> {
  const url = buildApiRequestUrl(API_PATHS.mediaTypeDetail)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_TYPE_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_TYPE_DETAIL_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function updateMediaType(payload: UpdateMediaTypePayload) {
  const response = await fetch(MEDIA_TYPE_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
      Name: getRequiredString(payload.Name, "Name"),
      SortNum: getOptionalNumber(payload.SortNum, "SortNum") ?? 0,
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_TYPE_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_TYPE_UPDATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function deleteMediaType(payload: DeleteMediaTypePayload) {
  const url = buildApiRequestUrl(API_PATHS.mediaTypeDelete)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_TYPE_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_TYPE_DELETE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

function extractList(payload: MediaTypesListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload as MediaTypeRecord[]
  }

  if (Array.isArray(payload.List)) {
    return payload.List as MediaTypeRecord[]
  }

  if (Array.isArray(payload.data)) {
    return payload.data as MediaTypeRecord[]
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MediaTypesListEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List as MediaTypeRecord[]
    }

    if (Array.isArray(nested.list)) {
      return nested.list as MediaTypeRecord[]
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows as MediaTypeRecord[]
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list as MediaTypeRecord[]
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows as MediaTypeRecord[]
  }

  return []
}

function extractTotal(payload: MediaTypesListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MediaTypesListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function extractDetailRecord(payload: unknown) {
  const directRecord = asRecord(payload)

  if (!directRecord) {
    return {}
  }

  const nestedRecord = asRecord(directRecord.data)
  return (nestedRecord ?? directRecord) as MediaTypeRecord
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

  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  return normalized || undefined
}

function getStringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getRequiredNumber(value: unknown, fieldName: string) {
  const parsed = toFiniteNumber(value)

  if (parsed === undefined) {
    throw new TypeError(`${fieldName} is required`)
  }

  return parsed
}

function getOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const parsed = toFiniteNumber(value)

  if (parsed === undefined) {
    throw new TypeError(`${fieldName} must be a number`)
  }

  return parsed
}

function toFiniteNumber(value: unknown) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.trim())
      : NaN

  return Number.isFinite(parsed) ? parsed : undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}
