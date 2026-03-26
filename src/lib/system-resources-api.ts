import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

type ResourceEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type SystemResourceRecord = {
  [property: string]: unknown
}

export type SystemResourceListResult = {
  list: SystemResourceRecord[]
  total: number
}

export type ListSystemApisPayload = {
  Path?: string
  Method?: string
  Name?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const SYSTEM_BUTTONS_API_URL = buildApiUrl(API_PATHS.systemButtonsList)
const SYSTEM_APIS_API_URL = buildApiUrl(API_PATHS.systemApisList)
const SYSTEM_APIS_IMPORT_API_URL = buildApiUrl(API_PATHS.systemApisImport)
const BUTTONS_LOAD_ERROR_MESSAGE = "按钮列表加载失败，请稍后重试。"
const APIS_LOAD_ERROR_MESSAGE = "API 列表加载失败，请稍后重试。"
const API_IMPORT_ERROR_MESSAGE = "API 导入失败，请稍后重试。"

export async function fetchSystemButtons(): Promise<SystemResourceListResult> {
  const response = await fetch(SYSTEM_BUTTONS_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({}),
  })
  const responsePayload = await readResponseBody(response) as ResourceEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, BUTTONS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

export async function fetchSystemApis(): Promise<SystemResourceListResult> {
  return fetchSystemApisWithPayload()
}

export async function fetchSystemApisWithPayload(payload: ListSystemApisPayload = {}): Promise<SystemResourceListResult> {
  const normalizedPayload = {
    Path: typeof payload.Path === "string" ? payload.Path.trim() : "",
    Method: typeof payload.Method === "string" ? payload.Method.trim() : "",
    Name: typeof payload.Name === "string" ? payload.Name.trim() : "",
    PageNum: Number.isFinite(Number(payload.PageNum)) ? Number(payload.PageNum) : 0,
    PageSize: Number.isFinite(Number(payload.PageSize)) ? Number(payload.PageSize) : 0,
  }

  const response = await fetch(SYSTEM_APIS_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as ResourceEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, APIS_LOAD_ERROR_MESSAGE)
  }

  const list = extractList(responsePayload)

  return {
    list,
    total: extractTotal(responsePayload, list.length),
  }
}

export async function importSystemApi(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(SYSTEM_APIS_IMPORT_API_URL, {
    method: "POST",
    headers: buildApiHeaders(),
    body: formData,
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, API_IMPORT_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, API_IMPORT_ERROR_MESSAGE)
  return responsePayload
}

function extractList(payload: ResourceEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload as SystemResourceRecord[]
  }

  if (Array.isArray(payload.List)) {
    return payload.List as SystemResourceRecord[]
  }

  if (Array.isArray(payload.data)) {
    return payload.data as SystemResourceRecord[]
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as ResourceEnvelope

    if (Array.isArray(nested.List)) {
      return nested.List as SystemResourceRecord[]
    }

    if (Array.isArray(nested.list)) {
      return nested.list as SystemResourceRecord[]
    }

    if (Array.isArray(nested.rows)) {
      return nested.rows as SystemResourceRecord[]
    }
  }

  if (Array.isArray(payload.list)) {
    return payload.list as SystemResourceRecord[]
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows as SystemResourceRecord[]
  }

  if (payload && typeof payload === "object") {
    return [payload as SystemResourceRecord]
  }

  return []
}

function extractTotal(payload: ResourceEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as ResourceEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}
