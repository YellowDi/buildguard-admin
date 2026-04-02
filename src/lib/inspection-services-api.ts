import inspectionServicesMockData from "@/mocks/inspection-services.json"

import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

type InspectionServicesListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

type InspectionServiceBuildItem = {
  BuildUuid?: string
  BuildId?: number
  BuildName?: string
  ParkUuid?: string
  ParkId?: number
  ParkName?: string
  [property: string]: unknown
}

type InspectionServiceInspectionItem = {
  Id?: number
  CategoryId?: number
  CategoryUuid?: string
  InspectionUuid?: string
  InspectionName?: string
  CategoryName?: string
  Content?: string
  IsForcePhoto?: number
  IsMeasureRecord?: number
  Standard?: string
  CreatedAt?: string
  UpdatedAt?: string
  Uuid?: string
  Name?: string
  [property: string]: unknown
}

export type InspectionServiceListItem = {
  Uuid?: string
  Id?: number
  Name?: string
  Status?: number
  ContractEndTime?: string
  ContractFile?: string
  CustomerId?: number
  CorpName?: string
  CustomerName?: string
  CustomerUuid?: string
  Level?: string
  ManagerName?: string
  ManagerPhone?: string
  TemplateId?: number
  TemplateUuid?: string
  TemplateName?: string
  InspectionUuids?: string[]
  Inspections?: InspectionServiceInspectionItem[]
  Builds?: InspectionServiceBuildItem[]
  Remark?: string
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type InspectionServicesListResult = {
  list: InspectionServiceListItem[]
  total: number
}

export type InspectionServiceCreatePayload = {
  Name: string
  CustomerUuid: string
  Level: string
  ManagerName: string
  ManagerPhone: string
  TemplateUuid?: string
  InspectionUuids?: string[]
  BuildUuids: string[]
  Remark?: string
}

export type InspectionServiceUpdatePayload = InspectionServiceCreatePayload & {
  Uuid: string
}

export type InspectionServiceContractUpdatePayload = {
  ContractEndTime?: string
  ContractFile?: string
  Uuid?: string
  [property: string]: unknown
}

export type InspectionServiceCreateResult = {
  Id?: number
  Uuid?: string
  [property: string]: unknown
}

export type InspectionServiceSubmitCompatibilitySource = {
  inspectionUuids?: string[]
  categoryScorePresetCount?: number
}

export type InspectionServiceSubmitCompatibilityResult = {
  canSubmit: boolean
  inspectionUuids: string[]
  reason: string
}

export type InspectionServiceDetailPayload = {
  Uuid?: string
  [property: string]: unknown
}

export type ListInspectionServicesPayload = {
  Name?: string
  CustomerUuid?: string
  TemplateUuid?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const INSPECTION_SERVICES_API_URL = buildApiUrl(API_PATHS.inspectionServicesList)
const INSPECTION_SERVICE_CREATE_API_URL = buildApiUrl(API_PATHS.inspectionServiceCreate)
const INSPECTION_SERVICE_UPDATE_API_URL = buildApiUrl(API_PATHS.inspectionServiceUpdate)
const INSPECTION_SERVICE_CONTRACT_UPDATE_API_URL = buildApiUrl(API_PATHS.inspectionServiceContractUpdate)
const INSPECTION_SERVICES_LOAD_ERROR_MESSAGE = "检测服务列表加载失败，请稍后重试。"
const INSPECTION_SERVICE_CREATE_ERROR_MESSAGE = "检测服务创建失败，请稍后重试。"
const INSPECTION_SERVICE_UPDATE_ERROR_MESSAGE = "检测服务更新失败，请稍后重试。"
const INSPECTION_SERVICE_CONTRACT_UPDATE_ERROR_MESSAGE = "检测服务合同更新失败，请稍后重试。"
const INSPECTION_SERVICE_DETAIL_ERROR_MESSAGE = "检测服务详情加载失败，请稍后重试。"
const USE_INSPECTION_SERVICES_LIST_MOCK = false
const USE_INSPECTION_SERVICE_DETAIL_MOCK = false

export async function fetchInspectionServices(
  payload: ListInspectionServicesPayload = {},
): Promise<InspectionServicesListResult> {
  if (USE_INSPECTION_SERVICES_LIST_MOCK) {
    return listMockInspectionServices(payload)
  }

  const normalizedPayload = {
    Name: getOptionalString(payload.Name),
    CustomerUuid: getOptionalString(payload.CustomerUuid),
    TemplateUuid: getOptionalString(payload.TemplateUuid),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum"),
    PageSize: getOptionalNumber(payload.PageSize, "PageSize"),
  }

  const response = await fetch(INSPECTION_SERVICES_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as InspectionServicesListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, INSPECTION_SERVICES_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, INSPECTION_SERVICES_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeInspectionServiceListItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createInspectionService(
  payload: InspectionServiceCreatePayload,
): Promise<InspectionServiceCreateResult> {
  const normalizedPayload = {
    Name: getRequiredString(payload.Name, "Name"),
    CustomerUuid: getRequiredString(payload.CustomerUuid, "CustomerUuid"),
    Level: getRequiredString(payload.Level, "Level"),
    ManagerName: getRequiredString(payload.ManagerName, "ManagerName"),
    ManagerPhone: getRequiredString(payload.ManagerPhone, "ManagerPhone"),
    TemplateUuid: getOptionalString(payload.TemplateUuid),
    InspectionUuids: getOptionalStringArray(payload.InspectionUuids),
    BuildUuids: getRequiredStringArray(payload.BuildUuids, "BuildUuids"),
    Remark: getOptionalString(payload.Remark),
  }

  const response = await fetch(INSPECTION_SERVICE_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_SERVICE_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_SERVICE_CREATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function updateInspectionService(
  payload: InspectionServiceUpdatePayload,
): Promise<InspectionServiceCreateResult> {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    Name: getRequiredString(payload.Name, "Name"),
    CustomerUuid: getRequiredString(payload.CustomerUuid, "CustomerUuid"),
    Level: getRequiredString(payload.Level, "Level"),
    ManagerName: getRequiredString(payload.ManagerName, "ManagerName"),
    ManagerPhone: getRequiredString(payload.ManagerPhone, "ManagerPhone"),
    TemplateUuid: getOptionalString(payload.TemplateUuid),
    InspectionUuids: getOptionalStringArray(payload.InspectionUuids),
    BuildUuids: getRequiredStringArray(payload.BuildUuids, "BuildUuids"),
    Remark: getOptionalString(payload.Remark),
  }

  const response = await fetch(INSPECTION_SERVICE_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_SERVICE_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_SERVICE_UPDATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function updateInspectionServiceContract(
  payload: InspectionServiceContractUpdatePayload,
): Promise<InspectionServiceCreateResult> {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    ContractEndTime: getOptionalString(payload.ContractEndTime),
    ContractFile: getOptionalString(payload.ContractFile),
  }

  const response = await fetch(INSPECTION_SERVICE_CONTRACT_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_SERVICE_CONTRACT_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_SERVICE_CONTRACT_UPDATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function fetchInspectionServiceDetail(
  payload: InspectionServiceDetailPayload,
): Promise<InspectionServiceListItem> {
  if (USE_INSPECTION_SERVICE_DETAIL_MOCK) {
    return getMockInspectionServiceDetail(payload)
  }

  const url = buildApiRequestUrl(API_PATHS.inspectionServiceDetail)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, INSPECTION_SERVICE_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, INSPECTION_SERVICE_DETAIL_ERROR_MESSAGE)

  return normalizeInspectionServiceListItem(extractDetailRecord(responseBody))
}

export function extractInspectionServiceDetailInspectionUuids(
  detail: Pick<InspectionServiceListItem, "InspectionUuids" | "Inspections"> | null | undefined,
) {
  return dedupeStringList([
    ...((Array.isArray(detail?.InspectionUuids) ? detail.InspectionUuids : []).map(item => getOptionalString(item))),
    ...((Array.isArray(detail?.Inspections) ? detail.Inspections : []).map((item) => (
      getOptionalString(item?.InspectionUuid) ?? getOptionalString(item?.Uuid)
    ))),
  ])
}

export function resolveInspectionServiceSubmitCompatibility(
  sources: InspectionServiceSubmitCompatibilitySource[],
): InspectionServiceSubmitCompatibilityResult {
  if (!sources.length) {
    return {
      canSubmit: false,
      inspectionUuids: [],
      reason: "请至少选择一个建筑。",
    }
  }

  const normalizedSources = sources.map(source => ({
    inspectionUuids: dedupeStringList(source.inspectionUuids ?? []),
    categoryScorePresetCount: normalizeOptionalNumberLike(source.categoryScorePresetCount) ?? 0,
  }))

  if (normalizedSources.some(source => source.categoryScorePresetCount > 0)) {
    return {
      canSubmit: false,
      inspectionUuids: [],
      reason: "当前接口暂不支持保存按建筑配置的分类积分策略。",
    }
  }

  if (normalizedSources.some(source => !source.inspectionUuids.length)) {
    return {
      canSubmit: false,
      inspectionUuids: [],
      reason: "请为每个建筑至少配置一个检测项。",
    }
  }

  const [firstSource] = normalizedSources
  const baselineKey = serializeStringList(firstSource.inspectionUuids)
  const hasDifferentInspectionSelections = normalizedSources.some(source =>
    serializeStringList(source.inspectionUuids) !== baselineKey,
  )

  if (hasDifferentInspectionSelections) {
    return {
      canSubmit: false,
      inspectionUuids: [],
      reason: "当前接口暂不支持保存按建筑单独配置的检测项。",
    }
  }

  return {
    canSubmit: true,
    inspectionUuids: firstSource.inspectionUuids,
    reason: "",
  }
}

function listMockInspectionServices(
  payload: ListInspectionServicesPayload,
): InspectionServicesListResult {
  const name = getOptionalString(payload.Name)?.toLowerCase()
  const customerUuid = getOptionalString(payload.CustomerUuid)
  const templateUuid = getOptionalString(payload.TemplateUuid)
  const pageNum = getOptionalNumber(payload.PageNum, "PageNum") ?? 1
  const pageSize = getOptionalNumber(payload.PageSize, "PageSize") ?? (getMockInspectionServices().length || 10)

  const filtered = getMockInspectionServices().filter((item) => {
    if (name && !getOptionalString(item.Name)?.toLowerCase().includes(name)) {
      return false
    }

    if (customerUuid && getOptionalString(item.CustomerUuid) !== customerUuid) {
      return false
    }

    if (templateUuid && getOptionalString(item.TemplateUuid) !== templateUuid) {
      return false
    }

    return true
  })

  const start = Math.max(pageNum - 1, 0) * Math.max(pageSize, 1)
  const end = start + Math.max(pageSize, 1)

  return {
    list: filtered.slice(start, end).map(item => normalizeInspectionServiceListItem(item)),
    total: filtered.length,
  }
}

function getMockInspectionServiceDetail(
  payload: InspectionServiceDetailPayload,
): InspectionServiceListItem {
  const uuid = getRequiredString(payload.Uuid, "Uuid")
  const item = getMockInspectionServices().find(candidate => getIdentity(candidate) === uuid)

  if (!item) {
    throw new Error(INSPECTION_SERVICE_DETAIL_ERROR_MESSAGE)
  }

  return normalizeInspectionServiceListItem(item)
}

function extractList(payload: InspectionServicesListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionServicesListEnvelope

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

function extractTotal(payload: InspectionServicesListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as InspectionServicesListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeInspectionServiceListItem(value: unknown): InspectionServiceListItem {
  if (!value || typeof value !== "object") {
    return {}
  }

  const record = value as Record<string, unknown>
  const customerName = getOptionalString(record.CustomerName)
  const corpName = getOptionalString(record.CorpName) ?? customerName
  const contractEndTime = getOptionalString(record.ContractEndTime)
    ?? getOptionalString(record.ExpireAt)
    ?? getOptionalString(record.ExpiredAt)
    ?? getOptionalString(record.EndAt)
    ?? getOptionalString(record.ServiceEndAt)
    ?? getOptionalString(record.PackageExpireAt)
    ?? getOptionalString(record.DueAt)
  const status = normalizeOptionalNumberLike(record.Status)

  return {
    ...record,
    Status: status,
    ContractEndTime: contractEndTime,
    ContractFile: getOptionalString(record.ContractFile),
    CustomerId: normalizeOptionalNumberLike(record.CustomerId),
    CorpName: corpName,
    CustomerName: customerName,
    CustomerUuid: getOptionalString(record.CustomerUuid),
    InspectionUuids: normalizeOptionalStringList(record.InspectionUuids),
    Inspections: normalizeInspectionServiceInspectionItems(record.Inspections),
    Builds: Array.isArray(record.Builds)
      ? record.Builds.filter(item => item && typeof item === "object") as InspectionServiceBuildItem[]
      : [],
  }
}

function extractDetailRecord(value: unknown) {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>

    if (record.data && typeof record.data === "object") {
      return record.data
    }

    return record
  }

  return {}
}

function extractCreateResult(value: unknown) {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>

    if (record.data && typeof record.data === "object") {
      return record.data as InspectionServiceCreateResult
    }

    return record as InspectionServiceCreateResult
  }

  return {}
}

function getOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number.`)
  }

  return value
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

  throw new TypeError("String field must be a string or number.")
}

function getRequiredString(value: unknown, fieldName: string) {
  const normalized = getOptionalString(value)

  if (!normalized) {
    throw new TypeError(`${fieldName} is required.`)
  }

  return normalized
}

function getRequiredStringArray(value: unknown, fieldName: string) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array.`)
  }

  const normalized = value
    .map(item => getOptionalString(item))
    .filter((item): item is string => Boolean(item))

  if (!normalized.length) {
    throw new TypeError(`${fieldName} must contain at least one item.`)
  }

  return normalized
}

function getOptionalStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const normalized = dedupeStringList(value)

  return normalized.length ? normalized : undefined
}

function normalizeOptionalStringList(value: unknown) {
  if (Array.isArray(value)) {
    const normalized = dedupeStringList(value)

    return normalized.length ? normalized : undefined
  }

  const normalized = getOptionalString(value)

  if (!normalized) {
    return undefined
  }

  const list = normalized
    .split(/[，,]/)
    .map(item => item.trim())
    .filter(Boolean)

  return list.length ? Array.from(new Set(list)) : [normalized]
}

function dedupeStringList(value: unknown[]) {
  return Array.from(new Set(
    value
      .map(item => getOptionalString(item))
      .filter((item): item is string => Boolean(item)),
  ))
}

function serializeStringList(value: string[]) {
  return [...value].sort((left, right) => left.localeCompare(right, "zh-Hans-CN")).join("::")
}

function normalizeInspectionServiceInspectionItems(value: unknown): InspectionServiceInspectionItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(item => item && typeof item === "object")
    .map((item) => {
      const record = item as Record<string, unknown>
      const uuid = getOptionalString(record.InspectionUuid) ?? getOptionalString(record.Uuid)
      const name = getOptionalString(record.InspectionName) ?? getOptionalString(record.Name)
      const categoryName = getOptionalString(record.CategoryName)

      return {
        ...record,
        Id: normalizeOptionalNumberLike(record.Id),
        CategoryId: normalizeOptionalNumberLike(record.CategoryId),
        CategoryUuid: getOptionalString(record.CategoryUuid),
        InspectionUuid: uuid,
        InspectionName: name,
        CategoryName: categoryName,
        Content: getOptionalString(record.Content),
        IsForcePhoto: normalizeInspectionFlag(record.IsForcePhoto),
        IsMeasureRecord: normalizeInspectionFlag(record.IsMeasureRecord),
        Standard: getOptionalString(record.Standard),
        CreatedAt: getOptionalString(record.CreatedAt),
        UpdatedAt: getOptionalString(record.UpdatedAt),
        Uuid: getOptionalString(record.Uuid),
        Name: getOptionalString(record.Name),
      }
    })
}

function normalizeInspectionFlag(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (value === 1 || value === "1" || value === true) {
    return 1
  }

  if (value === 2 || value === "2" || value === false) {
    return 2
  }

  return undefined
}

function normalizeOptionalNumberLike(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const normalized = value.trim()

    if (!normalized) {
      return undefined
    }

    const nextValue = Number(normalized)
    return Number.isFinite(nextValue) ? nextValue : undefined
  }

  return undefined
}

function getMockInspectionServices() {
  return inspectionServicesMockData as InspectionServiceListItem[]
}

function getIdentity(item: InspectionServiceListItem) {
  return getOptionalString(item.Uuid) ?? getOptionalString(item.Id) ?? ""
}
