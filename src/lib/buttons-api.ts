import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

export type ButtonRecord = {
  ApiName?: string
  ApiUuid?: string
  Code?: string
  CreatedAt?: string
  Id?: number
  MenuName?: string
  MenuUuid?: string
  Name?: string
  UpdatedAt?: string
  Uuid?: string
  [property: string]: unknown
}

export type ButtonDetailPayload = {
  Uuid?: string
  Id?: number
  [property: string]: unknown
}

export type CreateButtonPayload = {
  ApiUuid?: string
  Code?: string
  MenuUuid?: string
  Name?: string
  [property: string]: unknown
}

export type UpdateButtonPayload = CreateButtonPayload & {
  Uuid?: string
  Id?: number
}

export type DeleteButtonPayload = {
  Uuid?: string
  Id?: number
  [property: string]: unknown
}

type ButtonMutationResult = {
  Id?: number
  Uuid?: string
  [property: string]: unknown
}

const BUTTON_DETAIL_API_URL = API_PATHS.systemButtonDetail
const BUTTON_CREATE_API_URL = buildApiUrl(API_PATHS.systemButtonCreate)
const BUTTON_UPDATE_API_URL = buildApiUrl(API_PATHS.systemButtonUpdate)
const BUTTON_DELETE_API_URL = buildApiUrl(API_PATHS.systemButtonDelete)
const BUTTON_DETAIL_ERROR_MESSAGE = "按钮详情加载失败，请稍后重试。"
const BUTTON_CREATE_ERROR_MESSAGE = "按钮创建失败，请稍后重试。"
const BUTTON_UPDATE_ERROR_MESSAGE = "按钮更新失败，请稍后重试。"
const BUTTON_DELETE_ERROR_MESSAGE = "按钮删除失败，请稍后重试。"

export async function fetchButtonDetail(payload: ButtonDetailPayload): Promise<ButtonRecord> {
  const url = buildApiRequestUrl(BUTTON_DETAIL_API_URL)
  const identifier = normalizeIdentifierPayload(payload)

  if (identifier.Uuid) {
    url.searchParams.set("Uuid", identifier.Uuid)
  } else if (identifier.Id !== undefined) {
    url.searchParams.set("Id", String(identifier.Id))
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, BUTTON_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, BUTTON_DETAIL_ERROR_MESSAGE)
  return normalizeButtonRecord(extractDetailRecord(responsePayload))
}

export async function createButton(payload: CreateButtonPayload): Promise<ButtonMutationResult> {
  const response = await fetch(BUTTON_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizeWritePayload(payload)),
  })
  const responsePayload = await readResponseBody(response) as ButtonMutationResult

  if (!response.ok) {
    throw createHttpError(response, responsePayload, BUTTON_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, BUTTON_CREATE_ERROR_MESSAGE)
  return extractDetailRecord(responsePayload)
}

export async function updateButton(payload: UpdateButtonPayload): Promise<ButtonMutationResult> {
  const identifier = normalizeIdentifierPayload(payload)

  const response = await fetch(BUTTON_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      ...identifier,
      ...normalizeWritePayload(payload),
    }),
  })
  const responsePayload = await readResponseBody(response) as ButtonMutationResult

  if (!response.ok) {
    throw createHttpError(response, responsePayload, BUTTON_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, BUTTON_UPDATE_ERROR_MESSAGE)
  return extractDetailRecord(responsePayload)
}

export async function deleteButton(payload: DeleteButtonPayload) {
  const response = await fetch(BUTTON_DELETE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizeIdentifierPayload(payload)),
  })
  const responsePayload = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responsePayload, BUTTON_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, BUTTON_DELETE_ERROR_MESSAGE)
  return responsePayload
}

function normalizeWritePayload(payload: CreateButtonPayload | UpdateButtonPayload) {
  return {
    ApiUuid: normalizeOptionalText(payload.ApiUuid),
    Code: normalizeOptionalText(payload.Code),
    MenuUuid: normalizeOptionalText(payload.MenuUuid),
    Name: normalizeOptionalText(payload.Name),
  }
}

function normalizeIdentifierPayload(payload: ButtonDetailPayload | UpdateButtonPayload | DeleteButtonPayload) {
  const uuid = getOptionalString(payload.Uuid)
  const id = getOptionalNumber(payload.Id, "Id")

  if (!uuid && id === undefined) {
    throw new ApiError("请求参数校验失败：Uuid 或 Id 至少需要一个。")
  }

  return {
    ...(uuid ? { Uuid: uuid } : {}),
    ...(id !== undefined ? { Id: id } : {}),
  }
}

function extractDetailRecord(payload: unknown) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const envelope = payload as Record<string, unknown>

    if (envelope.data && typeof envelope.data === "object" && !Array.isArray(envelope.data)) {
      return envelope.data as ButtonMutationResult
    }

    return envelope as ButtonMutationResult
  }

  return {} as ButtonMutationResult
}

function normalizeButtonRecord(value: unknown): ButtonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>

    return {
      ...record,
      ApiName: getFirstText(record, ["ApiName", "apiName"]),
      ApiUuid: getFirstText(record, ["ApiUuid", "apiUuid"]),
      Code: getFirstText(record, ["Code", "code"]),
      CreatedAt: getFirstText(record, ["CreatedAt", "createdAt", "CreateTime", "createTime"]),
      Id: getFirstNumber(record, ["Id", "id", "ButtonId", "buttonId"]),
      MenuName: getFirstText(record, ["MenuName", "menuName"]),
      MenuUuid: getFirstText(record, ["MenuUuid", "menuUuid"]),
      Name: getFirstText(record, ["Name", "name", "ButtonName", "buttonName"]),
      UpdatedAt: getFirstText(record, ["UpdatedAt", "updatedAt", "UpdateTime", "updateTime"]),
      Uuid: getFirstText(record, ["Uuid", "uuid", "ButtonUuid", "buttonUuid"]),
    }
  }

  return {}
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

function getOptionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  throw new ApiError("请求参数校验失败：字符串字段格式无效。")
}

function normalizeOptionalText(value: unknown) {
  if (value === undefined || value === null) {
    return ""
  }

  if (typeof value === "string") {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  throw new ApiError("请求参数校验失败：字符串字段格式无效。")
}

function getFirstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return undefined
}

function getFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return undefined
}
