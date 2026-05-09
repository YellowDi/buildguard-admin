import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"
import type { MediaArticleRecord } from "@/lib/media-articles-api"
import type { MediaVideoRecord } from "@/lib/media-videos-api"

type MediaContentsListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type MediaContentStatus = 1 | 2
export type MediaContentKind = 1 | 2

export type MediaContentCategoryMediaItem = {
  SortNum?: number
  Uuid?: string
  [property: string]: unknown
}

export type MediaContentCategorySaveItem = {
  MediaList?: MediaContentCategoryMediaItem[]
  SortNum?: number
  Title?: string
  Uuid?: string
  [property: string]: unknown
}

export type MediaContentCategoryRecord = {
  Id?: number
  MediaArticle?: MediaArticleRecord[]
  MediaVideo?: MediaVideoRecord[]
  SortNum?: number
  Title?: string
  Uuid?: string
  [property: string]: unknown
}

export type MediaContentRecord = {
  CategoryList?: MediaContentCategoryRecord[]
  Id?: number
  SortNum?: number
  Status?: number
  Title?: string
  Type?: number
  Uuid?: string
  [property: string]: unknown
}

export type MediaContentsListResult = {
  list: MediaContentRecord[]
  total: number
}

export type ListMediaContentsPayload = {
  PageNum?: number
  PageSize?: number
  Status?: MediaContentStatus
  Title?: string
  Type?: MediaContentKind
  [property: string]: unknown
}

export type MediaContentDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type CreateMediaContentPayload = {
  CategoryList?: MediaContentCategorySaveItem[]
  SortNum?: number
  Status?: MediaContentStatus
  Title?: string
  Type?: MediaContentKind
  [property: string]: unknown
}

export type UpdateMediaContentPayload = CreateMediaContentPayload & {
  Uuid?: string
}

export type DeleteMediaContentPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type UpdateMediaContentSortPayload = {
  List?: Array<{
    SortNum?: number
    Uuid?: string
    [property: string]: unknown
  }>
  [property: string]: unknown
}

export type UpdateMediaContentStatusPayload = {
  Status?: MediaContentStatus
  Uuid?: string
  [property: string]: unknown
}

const MEDIA_CONTENT_LIST_API_URL = buildApiUrl(API_PATHS.mediaContentList)
const MEDIA_CONTENT_CREATE_API_URL = buildApiUrl(API_PATHS.mediaContentCreate)
const MEDIA_CONTENT_UPDATE_API_URL = buildApiUrl(API_PATHS.mediaContentUpdate)
const MEDIA_CONTENT_SORT_UPDATE_API_URL = buildApiUrl(API_PATHS.mediaContentSortUpdate)
const MEDIA_CONTENT_STATUS_UPDATE_API_URL = buildApiUrl(API_PATHS.mediaContentStatusUpdate)
const MEDIA_CONTENTS_LOAD_ERROR_MESSAGE = "媒体内容列表加载失败，请稍后重试。"
const MEDIA_CONTENT_DETAIL_ERROR_MESSAGE = "媒体内容详情加载失败，请稍后重试。"
const MEDIA_CONTENT_CREATE_ERROR_MESSAGE = "媒体内容创建失败，请稍后重试。"
const MEDIA_CONTENT_UPDATE_ERROR_MESSAGE = "媒体内容更新失败，请稍后重试。"
const MEDIA_CONTENT_DELETE_ERROR_MESSAGE = "媒体内容删除失败，请稍后重试。"
const MEDIA_CONTENT_SORT_UPDATE_ERROR_MESSAGE = "媒体内容排序更新失败，请稍后重试。"
const MEDIA_CONTENT_STATUS_UPDATE_ERROR_MESSAGE = "媒体内容状态更新失败，请稍后重试。"

export async function fetchMediaContents(
  payload: ListMediaContentsPayload = {},
): Promise<MediaContentsListResult> {
  const response = await fetch(MEDIA_CONTENT_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
      PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
      Status: getOptionalNumber(payload.Status, "Status"),
      Title: getOptionalString(payload.Title),
      Type: getOptionalNumber(payload.Type, "Type"),
    }),
  })
  const responseBody = await readResponseBody(response) as MediaContentsListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_CONTENTS_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_CONTENTS_LOAD_ERROR_MESSAGE)

  const list = extractList(responseBody)

  return {
    list,
    total: extractTotal(responseBody, list.length),
  }
}

export async function getMediaContentDetail(
  payload: MediaContentDetailPayload,
): Promise<MediaContentRecord> {
  const url = buildApiRequestUrl(API_PATHS.mediaContentDetail)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_CONTENT_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_CONTENT_DETAIL_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function createMediaContent(payload: CreateMediaContentPayload) {
  const response = await fetch(MEDIA_CONTENT_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizeWritePayload(payload)),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_CONTENT_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_CONTENT_CREATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function updateMediaContent(payload: UpdateMediaContentPayload) {
  const response = await fetch(MEDIA_CONTENT_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
      ...normalizeWritePayload(payload),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_CONTENT_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_CONTENT_UPDATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function deleteMediaContent(payload: DeleteMediaContentPayload) {
  const url = buildApiRequestUrl(API_PATHS.mediaContentDelete)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_CONTENT_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_CONTENT_DELETE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function updateMediaContentSort(payload: UpdateMediaContentSortPayload) {
  const response = await fetch(MEDIA_CONTENT_SORT_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      List: normalizeSortItems(payload.List),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_CONTENT_SORT_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_CONTENT_SORT_UPDATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function updateMediaContentStatus(payload: UpdateMediaContentStatusPayload) {
  const response = await fetch(MEDIA_CONTENT_STATUS_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Status: getRequiredNumber(payload.Status, "Status"),
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_CONTENT_STATUS_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_CONTENT_STATUS_UPDATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

function normalizeWritePayload(payload: CreateMediaContentPayload | UpdateMediaContentPayload) {
  return {
    CategoryList: normalizeCategories(payload.CategoryList),
    SortNum: getOptionalNumber(payload.SortNum, "SortNum") ?? 0,
    Status: getOptionalNumber(payload.Status, "Status") ?? 1,
    Title: getRequiredString(payload.Title, "Title"),
    Type: getRequiredNumber(payload.Type, "Type"),
  }
}

function normalizeCategories(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item, index) => {
    const record = asRecord(item) ?? {}

    return {
      MediaList: normalizeMediaItems(record.MediaList),
      SortNum: getOptionalNumber(record.SortNum, `CategoryList[${index}].SortNum`) ?? (index + 1) * 10,
      Title: getRequiredString(record.Title, `CategoryList[${index}].Title`),
      Uuid: getOptionalString(record.Uuid),
    }
  })
}

function normalizeMediaItems(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index) => {
      const record = asRecord(item) ?? {}
      const uuid = getOptionalString(record.Uuid)

      if (!uuid) {
        return null
      }

      return {
        SortNum: getOptionalNumber(record.SortNum, `MediaList[${index}].SortNum`) ?? (index + 1) * 10,
        Uuid: uuid,
      }
    })
    .filter((item): item is { SortNum: number, Uuid: string } => item !== null)
}

function normalizeSortItems(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item, index) => {
    const record = asRecord(item) ?? {}

    return {
      SortNum: getOptionalNumber(record.SortNum, `List[${index}].SortNum`) ?? (index + 1) * 10,
      Uuid: getRequiredString(record.Uuid, `List[${index}].Uuid`),
    }
  })
}

function extractList(payload: MediaContentsListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload as MediaContentRecord[]
  }

  if (Array.isArray(payload.List)) {
    return payload.List as MediaContentRecord[]
  }

  if (Array.isArray(payload.data)) {
    return payload.data as MediaContentRecord[]
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MediaContentsListEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List as MediaContentRecord[]
    }

    if (Array.isArray(nested.list)) {
      return nested.list as MediaContentRecord[]
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows as MediaContentRecord[]
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list as MediaContentRecord[]
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows as MediaContentRecord[]
  }

  return []
}

function extractTotal(payload: MediaContentsListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MediaContentsListEnvelope

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
  return (nestedRecord ?? directRecord) as MediaContentRecord
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

function getRequiredNumber(value: unknown, fieldName: string) {
  const parsed = getOptionalNumber(value, fieldName)

  if (parsed === undefined) {
    throw new TypeError(`${fieldName} is required`)
  }

  return parsed
}

function getOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.trim())
      : NaN

  if (!Number.isFinite(parsed)) {
    throw new TypeError(`${fieldName} must be a number`)
  }

  return parsed
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}
