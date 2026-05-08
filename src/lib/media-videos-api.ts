import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

type MediaVideosListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type MediaVideoStatus = 1 | 2 | 3

export type MediaVideoRecord = {
  Abstract?: string
  Id?: number
  Status?: number
  Title?: string
  TypeName?: string
  TypeUuid?: string
  Url?: string
  Uuid?: string
  [property: string]: unknown
}

export type MediaVideosListResult = {
  list: MediaVideoRecord[]
  total: number
}

export type ListMediaVideosPayload = {
  PageNum?: number
  PageSize?: number
  Status?: MediaVideoStatus
  Title?: string
  TypeUuid?: string
  [property: string]: unknown
}

const MEDIA_VIDEO_LIST_API_URL = buildApiUrl(API_PATHS.mediaVideoList)
const MEDIA_VIDEOS_LOAD_ERROR_MESSAGE = "媒体视频列表加载失败，请稍后重试。"

export async function fetchMediaVideos(
  payload: ListMediaVideosPayload = {},
): Promise<MediaVideosListResult> {
  const response = await fetch(MEDIA_VIDEO_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
      PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
      Status: getOptionalNumber(payload.Status, "Status"),
      Title: getOptionalString(payload.Title),
      TypeUuid: getOptionalString(payload.TypeUuid),
    }),
  })
  const responsePayload = await readResponseBody(response) as MediaVideosListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, MEDIA_VIDEOS_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, MEDIA_VIDEOS_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

function extractList(payload: MediaVideosListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload as MediaVideoRecord[]
  }

  if (Array.isArray(payload.List)) {
    return payload.List as MediaVideoRecord[]
  }

  if (Array.isArray(payload.data)) {
    return payload.data as MediaVideoRecord[]
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MediaVideosListEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List as MediaVideoRecord[]
    }

    if (Array.isArray(nested.list)) {
      return nested.list as MediaVideoRecord[]
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows as MediaVideoRecord[]
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list as MediaVideoRecord[]
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows as MediaVideoRecord[]
  }

  return []
}

function extractTotal(payload: MediaVideosListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as MediaVideosListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
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
