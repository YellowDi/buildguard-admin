import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

type ListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
  [property: string]: unknown
}

export type DictTypeItem = {
  Id: number
  Uuid: string
  Code: string
  Name: string
  Remark: string
}

export type DictEntryItem = {
  Id: number
  Uuid: string
  Code: string
  Name: string
  Remark: string
  Sort: number | null
}

export type DictTypeCreatePayload = {
  Code?: string
  Name?: string
  Remark?: string
}

export type DictEntryCreatePayload = {
  Code?: string
  Name?: string
  Remark?: string
  Sort?: number
}

type DictCreateResult = {
  Id?: number
  Uuid?: string
  [property: string]: unknown
}

const DICT_TYPE_LIST_API_URL = buildApiUrl(API_PATHS.dictTypeList)
const DICT_TYPE_CREATE_API_URL = buildApiUrl(API_PATHS.dictTypeCreate)
const DICT_ENTRY_LIST_API_URL = buildApiUrl(API_PATHS.dictEntryList)
const DICT_ENTRY_CREATE_API_URL = buildApiUrl(API_PATHS.dictEntryCreate)

const DICT_TYPE_LIST_ERROR_MESSAGE = "字典类型加载失败，请稍后重试。"
const DICT_TYPE_CREATE_ERROR_MESSAGE = "字典类型创建失败，请稍后重试。"
const DICT_ENTRY_LIST_ERROR_MESSAGE = "字典条目加载失败，请稍后重试。"
const DICT_ENTRY_CREATE_ERROR_MESSAGE = "字典条目创建失败，请稍后重试。"

export async function fetchDictTypes() {
  const response = await fetch(DICT_TYPE_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({}),
  })
  const responseBody = await readResponseBody(response) as ListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_TYPE_LIST_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_TYPE_LIST_ERROR_MESSAGE)

  return extractList(responseBody).map(normalizeDictType)
}

export async function createDictType(payload: DictTypeCreatePayload) {
  const normalizedPayload = {
    Code: getOptionalString(payload.Code),
    Name: getOptionalString(payload.Name),
    Remark: getOptionalString(payload.Remark),
  }

  const response = await fetch(DICT_TYPE_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_TYPE_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_TYPE_CREATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function fetchDictEntries(code?: string) {
  const response = await fetch(DICT_ENTRY_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Code: getOptionalString(code),
    }),
  })
  const responseBody = await readResponseBody(response) as ListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_ENTRY_LIST_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_ENTRY_LIST_ERROR_MESSAGE)

  return extractList(responseBody).map(normalizeDictEntry)
}

export async function createDictEntry(payload: DictEntryCreatePayload) {
  const normalizedPayload = {
    Code: getOptionalString(payload.Code),
    Name: getOptionalString(payload.Name),
    Remark: getOptionalString(payload.Remark),
    Sort: getOptionalNumber(payload.Sort),
  }

  const response = await fetch(DICT_ENTRY_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_ENTRY_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_ENTRY_CREATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

function extractList(payload: ListEnvelope | unknown[]) {
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

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

function extractCreateResult(payload: unknown): DictCreateResult {
  if (!payload || typeof payload !== "object") {
    return {}
  }

  if ("data" in payload && payload.data && typeof payload.data === "object") {
    return payload.data as DictCreateResult
  }

  return payload as DictCreateResult
}

function normalizeDictType(raw: unknown): DictTypeItem {
  const item = asRecord(raw)

  return {
    Id: getNumber(item.Id ?? item.id),
    Uuid: getString(item.Uuid ?? item.uuid),
    Code: getString(item.Code ?? item.code),
    Name: getString(item.Name ?? item.name),
    Remark: getString(item.Remark ?? item.remark),
  }
}

function normalizeDictEntry(raw: unknown): DictEntryItem {
  const item = asRecord(raw)

  return {
    Id: getNumber(item.Id ?? item.id),
    Uuid: getString(item.Uuid ?? item.uuid),
    Code: getString(item.Code ?? item.code),
    Name: getString(item.Name ?? item.name),
    Remark: getString(item.Remark ?? item.remark),
    Sort: getNullableNumber(item.Sort ?? item.sort),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function getOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getOptionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getNullableNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
