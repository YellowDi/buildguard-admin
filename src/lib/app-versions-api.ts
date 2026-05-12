import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

type AppVersionListEnvelope = {
  List?: unknown
  Total?: number
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type AppVersionDetail = {
  CreatedAt?: string
  Id?: number
  Log?: string
  Type?: number
  Url?: string
  Uuid?: string
  Version?: string
  VersionCode?: number
  [property: string]: unknown
}

export type ListAppVersionsPayload = {
  PageNum?: number
  PageSize?: number
  Type?: number
  Version?: string
  [property: string]: unknown
}

export type AppVersionDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type CreateAppVersionPayload = {
  Log?: string
  Type?: number
  Url?: string
  Version?: string
  VersionCode?: number
  [property: string]: unknown
}

export type UpdateAppVersionPayload = CreateAppVersionPayload & {
  Uuid?: string
}

export type DeleteAppVersionPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type AppVersionListResult = {
  list: AppVersionDetail[]
  total: number
}

const APP_VERSION_LIST_API_URL = buildApiUrl(API_PATHS.appVersionList)
const APP_VERSION_CREATE_API_URL = buildApiUrl(API_PATHS.appVersionCreate)
const APP_VERSION_UPDATE_API_URL = buildApiUrl(API_PATHS.appVersionUpdate)
const APP_VERSION_LIST_ERROR_MESSAGE = "应用更新列表加载失败，请稍后重试。"
const APP_VERSION_DETAIL_ERROR_MESSAGE = "应用更新详情加载失败，请稍后重试。"
const APP_VERSION_CREATE_ERROR_MESSAGE = "应用更新创建失败，请稍后重试。"
const APP_VERSION_UPDATE_ERROR_MESSAGE = "应用更新编辑失败，请稍后重试。"
const APP_VERSION_DELETE_ERROR_MESSAGE = "应用更新删除失败，请稍后重试。"

export async function fetchAppVersions(payload: ListAppVersionsPayload = {}): Promise<AppVersionListResult> {
  const normalizedPayload = {
    PageNum: getOptionalNumber(payload.PageNum, "PageNum") ?? 1,
    PageSize: getOptionalNumber(payload.PageSize, "PageSize") ?? 10,
    Type: getOptionalNumber(payload.Type, "Type"),
    Version: getOptionalString(payload.Version),
  }

  const response = await fetch(APP_VERSION_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response) as AppVersionListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responseBody, APP_VERSION_LIST_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, APP_VERSION_LIST_ERROR_MESSAGE)

  const list = extractList(responseBody)

  return {
    list: list.map(item => normalizeAppVersionDetail(item)),
    total: extractTotal(responseBody, list.length),
  }
}

export async function fetchAppVersionDetail(payload: AppVersionDetailPayload): Promise<AppVersionDetail> {
  const url = buildApiRequestUrl(API_PATHS.appVersionDetail)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, APP_VERSION_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, APP_VERSION_DETAIL_ERROR_MESSAGE)

  return extractDetail(responseBody)
}

export async function createAppVersion(payload: CreateAppVersionPayload): Promise<AppVersionDetail> {
  const response = await fetch(APP_VERSION_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizeMutationPayload(payload)),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, APP_VERSION_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, APP_VERSION_CREATE_ERROR_MESSAGE)

  return extractDetail(responseBody)
}

export async function updateAppVersion(payload: UpdateAppVersionPayload): Promise<AppVersionDetail> {
  const response = await fetch(APP_VERSION_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      ...normalizeMutationPayload(payload),
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, APP_VERSION_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, APP_VERSION_UPDATE_ERROR_MESSAGE)

  return extractDetail(responseBody)
}

export async function deleteAppVersion(payload: DeleteAppVersionPayload): Promise<void> {
  const url = buildApiRequestUrl(API_PATHS.appVersionDelete)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, APP_VERSION_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, APP_VERSION_DELETE_ERROR_MESSAGE)
}

function normalizeMutationPayload(payload: CreateAppVersionPayload) {
  return {
    Log: getOptionalString(payload.Log),
    Type: getOptionalNumber(payload.Type, "Type"),
    Url: getOptionalString(payload.Url),
    Version: getOptionalString(payload.Version),
    VersionCode: getOptionalNumber(payload.VersionCode, "VersionCode"),
  }
}

function extractList(payload: AppVersionListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as AppVersionListEnvelope

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

function extractTotal(payload: AppVersionListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as AppVersionListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function extractDetail(value: unknown): AppVersionDetail {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>

    if (record.data && typeof record.data === "object") {
      return normalizeAppVersionDetail(record.data)
    }

    return normalizeAppVersionDetail(record)
  }

  return {}
}

function normalizeAppVersionDetail(value: unknown): AppVersionDetail {
  return value && typeof value === "object" ? value as AppVersionDetail : {}
}

function getRequiredString(value: unknown, field: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  throw new ApiError(`请求参数校验失败：${field} 不能为空。`)
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

  throw new ApiError("请求参数校验失败：字符串参数格式不正确。")
}

function getOptionalNumber(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const parsed = Number(value)

  if (Number.isFinite(parsed)) {
    return parsed
  }

  throw new ApiError(`请求参数校验失败：${field} 必须是有效数字。`)
}
