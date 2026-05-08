import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

type MediaArticlesListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type MediaArticleStatus = 1 | 2 | 3

export type MediaArticleRecord = {
  Content?: string
  CoverUrl?: string
  Id?: number
  Status?: number
  Tags?: string[]
  Title?: string
  TypeName?: string
  TypeUuid?: string
  Uuid?: string
  [property: string]: unknown
}

export type MediaArticlesListResult = {
  list: MediaArticleRecord[]
  total: number
}

export type ListMediaArticlesPayload = {
  PageNum?: number
  PageSize?: number
  Status?: MediaArticleStatus
  Tags?: string[]
  Title?: string
  TypeUuid?: string
  [property: string]: unknown
}

export type MediaArticleDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type CreateMediaArticlePayload = {
  Content?: string
  CoverUrl?: string
  Status?: MediaArticleStatus
  Tags?: string[]
  Title?: string
  TypeUuid?: string
  [property: string]: unknown
}

export type UpdateMediaArticlePayload = CreateMediaArticlePayload & {
  Uuid?: string
}

export type DeleteMediaArticlePayload = {
  Uuid?: string
  [property: string]: unknown
}

const MEDIA_ARTICLE_LIST_API_URL = buildApiUrl(API_PATHS.mediaArticleList)
const MEDIA_ARTICLE_CREATE_API_URL = buildApiUrl(API_PATHS.mediaArticleCreate)
const MEDIA_ARTICLE_UPDATE_API_URL = buildApiUrl(API_PATHS.mediaArticleUpdate)
const MEDIA_ARTICLES_LOAD_ERROR_MESSAGE = "媒体文章列表加载失败，请稍后重试。"
const MEDIA_ARTICLE_DETAIL_ERROR_MESSAGE = "媒体文章详情加载失败，请稍后重试。"
const MEDIA_ARTICLE_CREATE_ERROR_MESSAGE = "媒体文章创建失败，请稍后重试。"
const MEDIA_ARTICLE_UPDATE_ERROR_MESSAGE = "媒体文章更新失败，请稍后重试。"
const MEDIA_ARTICLE_DELETE_ERROR_MESSAGE = "媒体文章删除失败，请稍后重试。"

export async function fetchMediaArticles(
  payload: ListMediaArticlesPayload = {},
): Promise<MediaArticlesListResult> {
  const response = await fetch(MEDIA_ARTICLE_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
      PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
      Status: getOptionalNumber(payload.Status, "Status"),
      Tags: normalizeTags(payload.Tags),
      Title: getOptionalString(payload.Title),
      TypeUuid: getOptionalString(payload.TypeUuid),
    }),
  })
  const responsePayload = await readResponseBody(response) as MediaArticlesListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, MEDIA_ARTICLES_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, MEDIA_ARTICLES_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

export async function getMediaArticleDetail(
  payload: MediaArticleDetailPayload,
): Promise<MediaArticleRecord> {
  const url = buildApiRequestUrl(API_PATHS.mediaArticleDetail)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_ARTICLE_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_ARTICLE_DETAIL_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function createMediaArticle(payload: CreateMediaArticlePayload) {
  const response = await fetch(MEDIA_ARTICLE_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizeWritePayload(payload)),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_ARTICLE_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_ARTICLE_CREATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function updateMediaArticle(payload: UpdateMediaArticlePayload) {
  const response = await fetch(MEDIA_ARTICLE_UPDATE_API_URL, {
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
    throw createHttpError(response, responseBody, MEDIA_ARTICLE_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_ARTICLE_UPDATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function deleteMediaArticle(payload: DeleteMediaArticlePayload) {
  const url = buildApiRequestUrl(API_PATHS.mediaArticleDelete)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, MEDIA_ARTICLE_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, MEDIA_ARTICLE_DELETE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

function normalizeWritePayload(payload: CreateMediaArticlePayload | UpdateMediaArticlePayload) {
  return {
    Content: getOptionalString(payload.Content) ?? "",
    CoverUrl: getOptionalString(payload.CoverUrl) ?? "",
    Status: getOptionalNumber(payload.Status, "Status") ?? 1,
    Tags: normalizeTags(payload.Tags),
    Title: getRequiredString(payload.Title, "Title"),
    TypeUuid: getRequiredString(payload.TypeUuid, "TypeUuid"),
  }
}

function extractList(payload: MediaArticlesListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload as MediaArticleRecord[]
  }

  if (Array.isArray(payload.List)) {
    return payload.List as MediaArticleRecord[]
  }

  if (Array.isArray(payload.data)) {
    return payload.data as MediaArticleRecord[]
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MediaArticlesListEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List as MediaArticleRecord[]
    }

    if (Array.isArray(nested.list)) {
      return nested.list as MediaArticleRecord[]
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows as MediaArticleRecord[]
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list as MediaArticleRecord[]
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows as MediaArticleRecord[]
  }

  return []
}

function extractTotal(payload: MediaArticlesListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MediaArticlesListEnvelope

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
  return (nestedRecord ?? directRecord) as MediaArticleRecord
}

function normalizeTags(value: unknown) {
  return Array.isArray(value)
    ? value.map(item => typeof item === "string" ? item.trim() : "").filter(Boolean)
    : []
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
