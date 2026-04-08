import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

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
  DictTypeUuid: string
  DictTypeName: string
  Name: string
  ParentName: string
  ParentUuid: string
  Remark: string
  Sort: number | null
}

export type DictEntryListResult = {
  list: DictEntryItem[]
  total: number
}

export type DictTypeCreatePayload = {
  Code?: string
  Name?: string
  Remark?: string
}

export type DictTypeUpdatePayload = {
  Uuid?: string
  Code?: string
  Name?: string
  Remark?: string
}

export type DictTypeDeletePayload = {
  Uuid?: string
  Code?: string
}

export type DictTypeDetailPayload = {
  Uuid?: string
}

export type DictEntryCreatePayload = {
  DictTypeUuid?: string
  Name?: string
  ParentUuid?: string
  Remark?: string
  Sort?: number
}

export type DictEntryListPayload = {
  DictTypeUuid?: string
  Name?: string
  PageNum?: number
  PageSize?: number
  ParentUuid?: string
}

export type DictEntryDetailPayload = {
  Uuid?: string
}

export type DictEntryUpdatePayload = {
  Uuid?: string
  DictTypeUuid?: string
  Name?: string
  ParentUuid?: string
  Remark?: string
  Sort?: number
}

export type DictEntryDeletePayload = {
  Uuid?: string
}

type DictCreateResult = {
  Id?: number
  Uuid?: string
  [property: string]: unknown
}

const DICT_TYPE_LIST_API_URL = buildApiUrl(API_PATHS.dictTypeList)
const DICT_TYPE_CREATE_API_URL = buildApiUrl(API_PATHS.dictTypeCreate)
const DICT_TYPE_UPDATE_API_URL = buildApiUrl(API_PATHS.dictTypeUpdate)
const DICT_TYPE_DELETE_API_URL = buildApiUrl(API_PATHS.dictTypeDelete)
const DICT_ENTRY_LIST_API_URL = buildApiUrl(API_PATHS.dictEntryList)
const DICT_ENTRY_CREATE_API_URL = buildApiUrl(API_PATHS.dictEntryCreate)
const DICT_ENTRY_DETAIL_API_URL = buildApiUrl(API_PATHS.dictEntryDetail)
const DICT_ENTRY_UPDATE_API_URL = buildApiUrl(API_PATHS.dictEntryUpdate)
const DICT_ENTRY_DELETE_API_URL = buildApiUrl(API_PATHS.dictEntryDelete)

const DICT_TYPE_LIST_ERROR_MESSAGE = "字典类型加载失败，请稍后重试。"
const DICT_TYPE_CREATE_ERROR_MESSAGE = "字典类型创建失败，请稍后重试。"
const DICT_TYPE_DETAIL_ERROR_MESSAGE = "字典类型详情加载失败，请稍后重试。"
const DICT_TYPE_UPDATE_ERROR_MESSAGE = "字典类型更新失败，请稍后重试。"
const DICT_TYPE_DELETE_ERROR_MESSAGE = "字典类型删除失败，请稍后重试。"
const DICT_ENTRY_LIST_ERROR_MESSAGE = "字典条目加载失败，请稍后重试。"
const DICT_ENTRY_CREATE_ERROR_MESSAGE = "字典条目创建失败，请稍后重试。"
const DICT_ENTRY_DETAIL_ERROR_MESSAGE = "字典条目详情加载失败，请稍后重试。"
const DICT_ENTRY_UPDATE_ERROR_MESSAGE = "字典条目更新失败，请稍后重试。"
const DICT_ENTRY_DELETE_ERROR_MESSAGE = "字典条目删除失败，请稍后重试。"

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

export async function fetchDictTypeDetail(payload: DictTypeDetailPayload) {
  const url = buildApiRequestUrl(API_PATHS.dictTypeDetail)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_TYPE_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_TYPE_DETAIL_ERROR_MESSAGE)

  return normalizeDictType(extractDetailRecord(responseBody))
}

export async function updateDictType(payload: DictTypeUpdatePayload) {
  const normalizedPayload = {
    Uuid: getOptionalString(payload.Uuid),
    Code: getOptionalString(payload.Code),
    Name: getOptionalString(payload.Name),
    Remark: getOptionalString(payload.Remark),
  }

  const response = await fetch(DICT_TYPE_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_TYPE_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_TYPE_UPDATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function deleteDictType(payload: DictTypeDeletePayload) {
  const normalizedPayload = {
    Uuid: getOptionalString(payload.Uuid),
    Code: getOptionalString(payload.Code),
  }

  const response = await fetch(DICT_TYPE_DELETE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_TYPE_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_TYPE_DELETE_ERROR_MESSAGE)
}

export async function fetchDictEntries(payload: DictEntryListPayload = {}) {
  const result = await fetchDictEntriesResult(payload)
  return result.list
}

export async function fetchDictEntriesResult(payload: DictEntryListPayload = {}): Promise<DictEntryListResult> {
  const response = await fetch(DICT_ENTRY_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      DictTypeUuid: getOptionalString(payload.DictTypeUuid),
      Name: getOptionalString(payload.Name),
      PageNum: getOptionalNumber(payload.PageNum),
      PageSize: getOptionalNumber(payload.PageSize),
      ParentUuid: getOptionalString(payload.ParentUuid),
    }),
  })
  const responseBody = await readResponseBody(response) as ListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_ENTRY_LIST_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_ENTRY_LIST_ERROR_MESSAGE)

  const list = extractList(responseBody).map(normalizeDictEntry)

  return {
    list,
    total: extractTotal(responseBody, list.length),
  }
}

export async function createDictEntry(payload: DictEntryCreatePayload) {
  const normalizedPayload = {
    DictTypeUuid: getOptionalString(payload.DictTypeUuid),
    Name: getOptionalString(payload.Name),
    ParentUuid: getOptionalString(payload.ParentUuid),
    Remark: getOptionalString(payload.Remark),
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

export async function fetchDictEntryDetail(payload: DictEntryDetailPayload) {
  const url = buildApiRequestUrl(API_PATHS.dictEntryDetail)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_ENTRY_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_ENTRY_DETAIL_ERROR_MESSAGE)

  return normalizeDictEntry(extractDetailRecord(responseBody))
}

export async function updateDictEntry(payload: DictEntryUpdatePayload) {
  const normalizedPayload = {
    Uuid: getOptionalString(payload.Uuid),
    DictTypeUuid: getOptionalString(payload.DictTypeUuid),
    Name: getOptionalString(payload.Name),
    ParentUuid: getOptionalString(payload.ParentUuid),
    Remark: getOptionalString(payload.Remark),
  }

  const response = await fetch(DICT_ENTRY_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_ENTRY_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_ENTRY_UPDATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function deleteDictEntry(payload: DictEntryDeletePayload) {
  const response = await fetch(DICT_ENTRY_DELETE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, DICT_ENTRY_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, DICT_ENTRY_DELETE_ERROR_MESSAGE)
}

function extractList(payload: ListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as ListEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List
    }

    if (Array.isArray(nested.list)) {
      return nested.list
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows
    }

    if (Array.isArray(nested.data)) {
      return nested.data
    }
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

function extractTotal(payload: ListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as ListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
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

function extractDetailRecord(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {}
  }

  const record = payload as Record<string, unknown>

  if (record.data && typeof record.data === "object") {
    return record.data as Record<string, unknown>
  }

  if (record.Data && typeof record.Data === "object") {
    return record.Data as Record<string, unknown>
  }

  return record
}

function normalizeDictType(raw: unknown): DictTypeItem {
  const item = asRecord(raw)

  return {
    Id: getFirstNumber(item, ["Id", "id", "DictTypeId", "dictTypeId", "TypeId", "typeId"]),
    Uuid: getFirstText(item, ["Uuid", "uuid", "DictTypeUuid", "dictTypeUuid", "TypeUuid", "typeUuid"]),
    Code: getFirstText(item, ["Code", "code", "DictTypeCode", "dictTypeCode", "TypeCode", "typeCode"]),
    Name: getFirstText(item, ["Name", "name", "DictTypeName", "dictTypeName", "TypeName", "typeName"]),
    Remark: getFirstText(item, ["Remark", "remark", "DictTypeRemark", "dictTypeRemark", "TypeRemark", "typeRemark"]),
  }
}

function normalizeDictEntry(raw: unknown): DictEntryItem {
  const item = asRecord(raw)

  return {
    Id: getFirstNumber(item, ["Id", "id", "DictDataId", "dictDataId", "EntryId", "entryId"]),
    Uuid: getFirstText(item, ["Uuid", "uuid", "DictDataUuid", "dictDataUuid", "EntryUuid", "entryUuid"]),
    DictTypeUuid: getFirstText(item, ["DictTypeUuid", "dictTypeUuid", "TypeUuid", "typeUuid"]),
    DictTypeName: getFirstText(item, ["DictTypeName", "dictTypeName", "TypeName", "typeName"]),
    Name: getFirstText(item, ["Name", "name", "DictDataName", "dictDataName", "EntryName", "entryName"]),
    ParentName: getFirstText(item, ["ParentName", "parentName", "ParentDictName", "parentDictName"]),
    ParentUuid: getFirstText(item, ["ParentUuid", "parentUuid", "ParentDictUuid", "parentDictUuid"]),
    Remark: getFirstText(item, ["Remark", "remark", "Description", "description"]),
    Sort: getFirstNullableNumber(item, ["Sort", "sort", "SortNum", "sortNum", "SortNo", "sortNo"]),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function getOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getFirstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number") {
      return String(value)
    }
  }

  return ""
}

function getFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    const parsed = typeof value === "string" ? Number(value.trim()) : value

    if (typeof parsed === "number" && Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function getFirstNullableNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    const parsed = typeof value === "string" ? Number(value.trim()) : value

    if (typeof parsed === "number" && Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function getOptionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getRequiredString(value: unknown, fieldName: string) {
  const normalized = getOptionalString(value)
  if (!normalized) {
    throw new TypeError(`${fieldName} is required`)
  }
  return normalized
}
