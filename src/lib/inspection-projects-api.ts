import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

type InspectionProjectsEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type InspectionProjectStatus = 1 | 2

export type WorkOrderFileItem = {
  Type?: number
  Url?: string
  [property: string]: unknown
}

export type InspectionProjectProgressItem = {
  CreatedAt?: string
  Photos?: WorkOrderFileItem[]
  ProcessInfo?: string
  ProgressDesc?: string
  Stage?: string
  Uuid?: string
  Version?: number
  [property: string]: unknown
}

export type InspectionProjectRecord = {
  Address?: string
  CoverUrl?: string
  CorpName?: string
  CustomerName?: string
  CustomerUuid?: string
  Duration?: number
  Introduction?: string
  IsPublic?: number
  Name?: string
  ProgressList?: InspectionProjectProgressItem[]
  ProjectTime?: string
  Status?: number
  Url?: string
  Uuid?: string
  [property: string]: unknown
}

export type InspectionProjectCustomerItem = {
  CoverUrl?: string
  Name?: string
  ProgressDesc?: string
  Stage?: string
  Status?: number
  Url?: string
  Uuid?: string
  [property: string]: unknown
}

export type InspectionProjectsResult = {
  list: InspectionProjectRecord[]
  total: number
}

export type InspectionProjectCustomerListResult = {
  list: InspectionProjectCustomerItem[]
  total: number
}

export type ListInspectionProjectsPayload = {
  Name?: string
  PageNum?: number
  PageSize?: number
  Status?: InspectionProjectStatus | number
  [property: string]: unknown
}

export type CreateInspectionProjectPayload = {
  Address?: string
  CustomerName?: string
  CustomerUuid?: string
  Duration?: number
  Introduction?: string
  Name?: string
  ProjectTime?: string
  [property: string]: unknown
}

export type UpdateInspectionProjectPayload = {
  CustomerName?: string
  CustomerUuid?: string
  Name?: string
  Uuid?: string
  [property: string]: unknown
}

export type FinishInspectionProjectPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type UpdateInspectionProjectPublicPayload = {
  IsPublic?: number
  Url?: string
  Uuid?: string
  [property: string]: unknown
}

export type CreateInspectionProjectProgressPayload = {
  Photos?: WorkOrderFileItem[]
  ProcessInfo?: string
  ProgressDesc?: string
  ProjectUuid?: string
  Stage?: string
  [property: string]: unknown
}

export type UpdateInspectionProjectProgressPayload = {
  Photos?: WorkOrderFileItem[]
  ProcessInfo?: string
  ProgressDesc?: string
  Stage?: string
  Uuid?: string
  [property: string]: unknown
}

export type InspectionProjectDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

const INSPECTION_PROJECT_LIST_API_URL = buildApiUrl(API_PATHS.inspectionProjectList)
const INSPECTION_PROJECT_CUSTOMER_LIST_API_URL = buildApiUrl(API_PATHS.inspectionProjectCustomerList)
const INSPECTION_PROJECT_CREATE_API_URL = buildApiUrl(API_PATHS.inspectionProjectCreate)
const INSPECTION_PROJECT_UPDATE_API_URL = buildApiUrl(API_PATHS.inspectionProjectUpdate)
const INSPECTION_PROJECT_FINISH_API_URL = buildApiUrl(API_PATHS.inspectionProjectFinish)
const INSPECTION_PROJECT_PUBLIC_UPDATE_API_URL = buildApiUrl(API_PATHS.inspectionProjectPublicUpdate)
const INSPECTION_PROJECT_PROGRESS_CREATE_API_URL = buildApiUrl(API_PATHS.inspectionProjectProgressCreate)
const INSPECTION_PROJECT_PROGRESS_UPDATE_API_URL = buildApiUrl(API_PATHS.inspectionProjectProgressUpdate)
const INSPECTION_PROJECTS_LOAD_ERROR_MESSAGE = "客户项目列表加载失败，请稍后重试。"
const INSPECTION_PROJECT_CREATE_ERROR_MESSAGE = "客户项目创建失败，请稍后重试。"
const INSPECTION_PROJECT_DETAIL_ERROR_MESSAGE = "客户项目详情加载失败，请稍后重试。"
const INSPECTION_PROJECT_UPDATE_ERROR_MESSAGE = "客户项目更新失败，请稍后重试。"
const INSPECTION_PROJECT_FINISH_ERROR_MESSAGE = "客户项目完结失败，请稍后重试。"
const INSPECTION_PROJECT_PUBLIC_UPDATE_ERROR_MESSAGE = "客户项目公开状态更新失败，请稍后重试。"
const INSPECTION_PROJECT_PROGRESS_CREATE_ERROR_MESSAGE = "客户项目进度创建失败，请稍后重试。"
const INSPECTION_PROJECT_PROGRESS_UPDATE_ERROR_MESSAGE = "客户项目进度更新失败，请稍后重试。"
const INSPECTION_PROJECT_CUSTOMER_LIST_ERROR_MESSAGE = "客户项目展示列表加载失败，请稍后重试。"

export async function fetchInspectionProjects(
  payload: ListInspectionProjectsPayload = {},
): Promise<InspectionProjectsResult> {
  const response = await fetch(INSPECTION_PROJECT_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Name: getOptionalString(payload.Name),
      PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
      PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
      Status: getOptionalNumber(payload.Status, "Status"),
    }),
  })
  const responsePayload = await readResponseBody(response) as InspectionProjectsEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, INSPECTION_PROJECTS_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, INSPECTION_PROJECTS_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeProjectRecord(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

export async function fetchCustomerInspectionProjects(
  payload: Pick<ListInspectionProjectsPayload, "PageNum" | "PageSize"> = {},
): Promise<InspectionProjectCustomerListResult> {
  const response = await fetch(INSPECTION_PROJECT_CUSTOMER_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
      PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
    }),
  })
  const responsePayload = await readResponseBody(response) as InspectionProjectsEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, INSPECTION_PROJECT_CUSTOMER_LIST_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, INSPECTION_PROJECT_CUSTOMER_LIST_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeCustomerProjectItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createInspectionProject(payload: CreateInspectionProjectPayload) {
  const response = await fetch(INSPECTION_PROJECT_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Address: getOptionalString(payload.Address),
      CustomerName: getOptionalString(payload.CustomerName),
      CustomerUuid: getOptionalString(payload.CustomerUuid),
      Duration: getOptionalNumber(payload.Duration, "Duration"),
      Introduction: getOptionalString(payload.Introduction),
      Name: getRequiredString(payload.Name, "Name"),
      ProjectTime: getOptionalString(payload.ProjectTime),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_PROJECT_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_PROJECT_CREATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function fetchInspectionProjectDetail(
  payload: InspectionProjectDetailPayload,
): Promise<InspectionProjectRecord> {
  const url = buildApiRequestUrl(API_PATHS.inspectionProjectDetail)
  url.searchParams.set("Uuid", getRequiredString(payload.Uuid, "Uuid"))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_PROJECT_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_PROJECT_DETAIL_ERROR_MESSAGE)

  return normalizeProjectRecord(extractDetailRecord(responseBody))
}

export async function updateInspectionProject(payload: UpdateInspectionProjectPayload) {
  const response = await fetch(INSPECTION_PROJECT_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      CustomerName: getOptionalString(payload.CustomerName),
      CustomerUuid: getOptionalString(payload.CustomerUuid),
      Name: getRequiredString(payload.Name, "Name"),
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_PROJECT_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_PROJECT_UPDATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function finishInspectionProject(payload: FinishInspectionProjectPayload) {
  const response = await fetch(INSPECTION_PROJECT_FINISH_API_URL, {
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
    throw createHttpError(response, responseBody, INSPECTION_PROJECT_FINISH_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_PROJECT_FINISH_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function updateInspectionProjectPublicStatus(payload: UpdateInspectionProjectPublicPayload) {
  const response = await fetch(INSPECTION_PROJECT_PUBLIC_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      IsPublic: getRequiredNumber(payload.IsPublic, "IsPublic"),
      Url: getOptionalString(payload.Url),
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_PROJECT_PUBLIC_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_PROJECT_PUBLIC_UPDATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function createInspectionProjectProgress(payload: CreateInspectionProjectProgressPayload) {
  const response = await fetch(INSPECTION_PROJECT_PROGRESS_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Photos: getOptionalFiles(payload.Photos),
      ProcessInfo: getOptionalString(payload.ProcessInfo),
      ProgressDesc: getOptionalString(payload.ProgressDesc),
      ProjectUuid: getRequiredString(payload.ProjectUuid, "ProjectUuid"),
      Stage: getOptionalString(payload.Stage),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_PROJECT_PROGRESS_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_PROJECT_PROGRESS_CREATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

export async function updateInspectionProjectProgress(payload: UpdateInspectionProjectProgressPayload) {
  const response = await fetch(INSPECTION_PROJECT_PROGRESS_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      Photos: getOptionalFiles(payload.Photos),
      ProcessInfo: getOptionalString(payload.ProcessInfo),
      ProgressDesc: getOptionalString(payload.ProgressDesc),
      Stage: getOptionalString(payload.Stage),
      Uuid: getRequiredString(payload.Uuid, "Uuid"),
    }),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_PROJECT_PROGRESS_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_PROJECT_PROGRESS_UPDATE_ERROR_MESSAGE)

  return extractDetailRecord(responseBody)
}

function extractList(payload: InspectionProjectsEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionProjectsEnvelope

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

function extractTotal(payload: InspectionProjectsEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionProjectsEnvelope

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

  return asRecord(directRecord.data) ?? directRecord
}

function normalizeProjectRecord(value: unknown): InspectionProjectRecord {
  const record = asRecord(value)

  if (!record) {
    return {}
  }

  return {
    ...record,
    ProgressList: Array.isArray(record.ProgressList)
      ? record.ProgressList.map(item => normalizeProgressItem(item))
      : [],
  } as InspectionProjectRecord
}

function normalizeCustomerProjectItem(value: unknown): InspectionProjectCustomerItem {
  return asRecord(value) as InspectionProjectCustomerItem ?? {}
}

function normalizeProgressItem(value: unknown): InspectionProjectProgressItem {
  const record = asRecord(value)

  if (!record) {
    return {}
  }

  return {
    ...record,
    Photos: Array.isArray(record.Photos)
      ? record.Photos.map(item => normalizeFileItem(item))
      : [],
  } as InspectionProjectProgressItem
}

function normalizeFileItem(value: unknown): WorkOrderFileItem {
  return asRecord(value) as WorkOrderFileItem ?? {}
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

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
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

function getRequiredNumber(value: unknown, fieldName: string) {
  const parsed = getOptionalNumber(value, fieldName)

  if (parsed === undefined) {
    throw new TypeError(`${fieldName} is required`)
  }

  return parsed
}

function getOptionalFiles(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(file => ({
    Type: getOptionalNumber(asRecord(file)?.Type, "Type"),
    Url: getOptionalString(asRecord(file)?.Url),
  }))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}
