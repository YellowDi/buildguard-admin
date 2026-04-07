import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiRequestUrl, buildApiUrl } from "@/lib/api"

type WorkOrdersListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type WorkOrderListItem = {
  Uuid?: string
  Id?: number
  OrderNo?: string
  PlanUuid?: string
  PlanName?: string
  PackageName?: string
  ServiceName?: string
  ServiceUuid?: string
  CustomerUuid?: string
  CorpName?: string
  CustomerName?: string
  ParkUuid?: string
  ParkName?: string
  BuildName?: string
  Builds?: WorkOrderBuildInfo[]
  Deadline?: string
  Executor?: string
  Status?: number
  Score?: number
  Result?: number
  Remark?: string
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type WorkOrderBuildInfo = {
  BuildName?: string
  BuildUuid?: string
  InspectionItems?: WorkOrderBuildInspectionItem[]
  Score?: number
  [property: string]: unknown
}

export type WorkOrderBuildInspectionItem = {
  InspectionItemName?: string
  InspectionItemUuid?: string
  CategoryName?: string
  CategoryUuid?: string
  Score?: number
  UserName?: string
  [property: string]: unknown
}

export type WorkOrdersListResult = {
  list: WorkOrderListItem[]
  total: number
}

export type CreateWorkOrderPayload = {
  PlanUuid: string
  PackageName: string
  CustomerUuid: string
  Deadline: string
  Status: number
  Remark?: string
}

export type CreateWorkOrderResult = {
  Id?: number
  Uuid?: string
  [property: string]: unknown
}

export type CreateRepairWorkOrderPayload = {
  CustomerUuid: string
  ParkUuid: string
  Title: string
  ReportType: number
  Important: number
  Content: string
}

export type UpdateWorkOrderPayload = {
  Uuid: string
  Remark?: string
}

export type DispatchWorkOrderPayload = {
  Uuid: string
  UserUuid: string
  BuildUuids?: string[]
}

export type WorkOrderDetailPayload = {
  Uuid: string
}

export type WorkOrderDetailResult = WorkOrderListItem
export type RepairWorkOrderDetailResult = RepairWorkOrderListItem

export type RepairWorkOrderListItem = {
  Id?: number
  Uuid?: string
  OrderNo?: string
  CustomerUuid?: string
  CorpName?: string
  CustomerName?: string
  ParkUuid?: string
  ParkName?: string
  BuildName?: string
  UserUuid?: string
  UserName?: string
  Important?: number
  ReportType?: number
  Content?: string
  Title?: string
  Status?: number
  CreatedStartAt?: string
  CreatedEndAt?: string
  CreatedAt?: string
  UpdatedAt?: string
  AfterRepairFile?: string
  BeforeRepairFile?: string
  RepairContent?: string
  [property: string]: unknown
}

export type RepairWorkOrdersListResult = {
  list: RepairWorkOrderListItem[]
  total: number
}

export type ListWorkOrdersPayload = {
  OrderNo?: string
  PlanUuid?: string
  CustomerUuid?: string
  PackageName?: string
  Deadline?: string
  Executor?: string
  Status?: number
  Result?: number
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

const WORK_ORDERS_API_URL = buildApiUrl(API_PATHS.workOrdersList)
const REPAIR_WORK_ORDERS_API_URL = buildApiUrl(API_PATHS.workOrderReportList)
const REPAIR_WORK_ORDER_DETAIL_API_URL = API_PATHS.workOrderReportDetail
const REPAIR_WORK_ORDER_CREATE_API_URL = buildApiUrl(API_PATHS.workOrderReportCreate)
const WORK_ORDER_CREATE_API_URL = buildApiUrl(API_PATHS.workOrderCreate)
const WORK_ORDER_DETAIL_API_URL = API_PATHS.workOrderDetail
const WORK_ORDER_UPDATE_API_URL = buildApiUrl(API_PATHS.workOrderUpdate)
const WORK_ORDER_DISPATCH_API_URL = buildApiUrl(API_PATHS.workOrderDispatch)
const WORK_ORDERS_LOAD_ERROR_MESSAGE = "工单列表加载失败，请稍后重试。"
const WORK_ORDER_CREATE_ERROR_MESSAGE = "工单创建失败，请稍后重试。"
const REPAIR_WORK_ORDER_CREATE_ERROR_MESSAGE = "报修工单创建失败，请稍后重试。"
const WORK_ORDER_DETAIL_ERROR_MESSAGE = "工单详情加载失败，请稍后重试。"
const WORK_ORDER_UPDATE_ERROR_MESSAGE = "工单更新失败，请稍后重试。"
const WORK_ORDER_DISPATCH_ERROR_MESSAGE = "工单指派失败，请稍后重试。"

export async function fetchWorkOrders(payload: ListWorkOrdersPayload = {}): Promise<WorkOrdersListResult> {
  const normalizedPayload = {
    OrderNo: getOptionalString(payload.OrderNo) ?? "",
    PlanUuid: getOptionalString(payload.PlanUuid) ?? "",
    PackageName: getOptionalString(payload.PackageName) ?? "",
    CustomerUuid: getOptionalString(payload.CustomerUuid) ?? "",
    Deadline: getOptionalString(payload.Deadline) ?? "",
    Executor: getOptionalString(payload.Executor) ?? "",
    Status: getOptionalNumber(payload.Status, "Status") ?? 0,
    Result: getOptionalNumber(payload.Result, "Result") ?? 0,
    PageNum: getOptionalNumber(payload.PageNum, "PageNum") ?? 1,
    PageSize: getOptionalNumber(payload.PageSize, "PageSize") ?? 10,
  }

  const response = await fetch(WORK_ORDERS_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as WorkOrdersListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, WORK_ORDERS_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, WORK_ORDERS_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeWorkOrderListItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

export async function createWorkOrder(payload: CreateWorkOrderPayload): Promise<CreateWorkOrderResult> {
  const normalizedPayload = {
    PlanUuid: getRequiredString(payload.PlanUuid, "PlanUuid"),
    PackageName: getRequiredString(payload.PackageName, "PackageName"),
    CustomerUuid: getRequiredString(payload.CustomerUuid, "CustomerUuid"),
    Deadline: getRequiredString(payload.Deadline, "Deadline"),
    Status: getRequiredNumber(payload.Status, "Status"),
    Remark: getOptionalString(payload.Remark),
  }

  const response = await fetch(WORK_ORDER_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, WORK_ORDER_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, WORK_ORDER_CREATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function createRepairWorkOrder(payload: CreateRepairWorkOrderPayload): Promise<CreateWorkOrderResult> {
  const normalizedPayload = {
    CustomerUuid: getRequiredString(payload.CustomerUuid, "CustomerUuid"),
    ParkUuid: getRequiredString(payload.ParkUuid, "ParkUuid"),
    Title: getRequiredString(payload.Title, "Title"),
    ReportType: getRequiredNumber(payload.ReportType, "ReportType"),
    Important: getRequiredNumber(payload.Important, "Important"),
    Content: getRequiredString(payload.Content, "Content"),
  }

  const response = await fetch(REPAIR_WORK_ORDER_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, REPAIR_WORK_ORDER_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, REPAIR_WORK_ORDER_CREATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function fetchWorkOrderDetail(payload: WorkOrderDetailPayload): Promise<WorkOrderDetailResult> {
  const url = buildApiRequestUrl(WORK_ORDER_DETAIL_API_URL)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, WORK_ORDER_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, WORK_ORDER_DETAIL_ERROR_MESSAGE)

  return normalizeWorkOrderListItem(extractDetailRecord(responseBody))
}

export async function fetchRepairWorkOrderDetail(payload: WorkOrderDetailPayload): Promise<RepairWorkOrderDetailResult> {
  const url = buildApiRequestUrl(REPAIR_WORK_ORDER_DETAIL_API_URL)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, WORK_ORDER_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, WORK_ORDER_DETAIL_ERROR_MESSAGE)

  return normalizeRepairWorkOrderListItem(extractDetailRecord(responseBody))
}

export async function updateWorkOrder(payload: UpdateWorkOrderPayload): Promise<CreateWorkOrderResult> {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    Remark: getOptionalString(payload.Remark),
  }

  const response = await fetch(WORK_ORDER_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, WORK_ORDER_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, WORK_ORDER_UPDATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function dispatchWorkOrder(payload: DispatchWorkOrderPayload): Promise<CreateWorkOrderResult> {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    UserUuid: getRequiredString(payload.UserUuid, "UserUuid"),
    BuildUuids: normalizeOptionalStringArray(payload.BuildUuids),
  }

  const response = await fetch(WORK_ORDER_DISPATCH_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, WORK_ORDER_DISPATCH_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, WORK_ORDER_DISPATCH_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function fetchRepairWorkOrders(payload: ListWorkOrdersPayload = {}): Promise<RepairWorkOrdersListResult> {
  const normalizedPayload = {
    OrderNo: getOptionalString(payload.OrderNo) ?? "",
    CustomerUuid: getOptionalString(payload.CustomerUuid) ?? "",
    Status: getOptionalNumber(payload.Status, "Status") ?? 0,
    PageNum: getOptionalNumber(payload.PageNum, "PageNum") ?? 1,
    PageSize: getOptionalNumber(payload.PageSize, "PageSize") ?? 10,
  }

  const response = await fetch(REPAIR_WORK_ORDERS_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as WorkOrdersListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, WORK_ORDERS_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, WORK_ORDERS_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeRepairWorkOrderListItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

function extractList(payload: WorkOrdersListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as WorkOrdersListEnvelope

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

function extractTotal(payload: WorkOrdersListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as WorkOrdersListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeWorkOrderListItem(value: unknown): WorkOrderListItem {
  if (!value || typeof value !== "object") {
    return {}
  }

  const record = value as Record<string, unknown>

  return {
    ...record,
    Uuid: getFirstText(record, ["Uuid", "uuid", "WorkOrderUuid", "workOrderUuid", "OrderUuid", "orderUuid"]),
    Id: getFirstNumber(record, ["Id", "id", "WorkOrderId", "workOrderId", "OrderId", "orderId"]),
    OrderNo: getFirstText(record, ["OrderNo", "orderNo", "WorkOrderNo", "workOrderNo", "No", "no"]),
    PlanUuid: getFirstText(record, ["PlanUuid", "planUuid"]),
    PlanName: getFirstText(record, ["PlanName", "planName", "InspectionPlanName", "inspectionPlanName", "Name", "name"]),
    PackageName: getFirstText(record, ["PackageName", "packageName", "ServiceName", "serviceName"]),
    ServiceName: getFirstText(record, ["ServiceName", "serviceName", "PackageName", "packageName"]),
    ServiceUuid: getFirstText(record, ["ServiceUuid", "serviceUuid"]),
    CustomerUuid: getFirstText(record, ["CustomerUuid", "customerUuid"]),
    CorpName: getFirstText(record, ["CorpName", "corpName", "CompanyName", "companyName", "CustomerName", "customerName"]),
    CustomerName: getFirstText(record, ["CustomerName", "customerName", "CorpName", "corpName", "CompanyName", "companyName"]),
    ParkUuid: getFirstText(record, ["ParkUuid", "parkUuid"]),
    ParkName: getFirstText(record, ["ParkName", "parkName"]),
    BuildName: getFirstText(record, ["BuildName", "buildName", "BuildingName", "buildingName"]),
    Builds: normalizeWorkOrderBuildInfos(record.Builds),
    Deadline: getFirstText(record, ["Deadline", "deadline", "ExpireAt", "expireAt", "DueAt", "dueAt"]),
    Executor: getFirstText(record, ["Executor", "executor", "PrincipalName", "principalName", "Assignee", "assignee"]),
    Status: getFirstNumber(record, ["Status", "status", "WorkOrderStatus", "workOrderStatus"]),
    Score: getFirstNumber(record, ["Score", "score", "TotalScore", "totalScore"]),
    Result: getFirstNumber(record, ["Result", "result", "WorkOrderResult", "workOrderResult"]),
    Remark: getFirstText(record, ["Remark", "remark", "Note", "note", "Description", "description"]),
    CreatedStartAt: getFirstText(record, ["CreatedStartAt", "createdStartAt"]),
    CreatedEndAt: getFirstText(record, ["CreatedEndAt", "createdEndAt"]),
    CreatedAt: getFirstText(record, ["CreatedAt", "createdAt", "CreateTime", "createTime"]),
    UpdatedAt: getFirstText(record, ["UpdatedAt", "updatedAt", "UpdateTime", "updateTime"]),
  }
}

function normalizeRepairWorkOrderListItem(value: unknown): RepairWorkOrderListItem {
  if (!value || typeof value !== "object") {
    return {}
  }

  const record = value as Record<string, unknown>

  return {
    ...record,
    Id: getFirstNumber(record, ["Id", "id"]),
    Uuid: getFirstText(record, ["Uuid", "uuid"]),
    OrderNo: getFirstText(record, ["OrderNo", "orderNo"]),
    CustomerUuid: getFirstText(record, ["CustomerUuid", "customerUuid"]),
    CorpName: getFirstText(record, ["CorpName", "corpName"]),
    CustomerName: getFirstText(record, ["CustomerName", "customerName", "CorpName", "corpName"]),
    ParkUuid: getFirstText(record, ["ParkUuid", "parkUuid"]),
    ParkName: getFirstText(record, ["ParkName", "parkName"]),
    BuildName: getFirstText(record, ["BuildName", "buildName", "BuildingName", "buildingName"]),
    UserUuid: getFirstText(record, ["UserUuid", "userUuid"]),
    UserName: getFirstText(record, ["UserName", "userName"]),
    Important: getFirstNumber(record, ["Important", "important"]),
    ReportType: getFirstNumber(record, ["ReportType", "reportType"]),
    Content: getFirstText(record, ["Content", "content"]),
    Title: getFirstText(record, ["Title", "title"]),
    Status: getFirstNumber(record, ["Status", "status"]),
    CreatedAt: getFirstText(record, ["CreatedAt", "createdAt", "CreateTime", "createTime"]),
    UpdatedAt: getFirstText(record, ["UpdatedAt", "updatedAt", "UpdateTime", "updateTime"]),
    AfterRepairFile: getFirstText(record, ["AfterRepairFile", "afterRepairFile"]),
    BeforeRepairFile: getFirstText(record, ["BeforeRepairFile", "beforeRepairFile"]),
    RepairContent: getFirstText(record, ["RepairContent", "repairContent"]),
  }
}

function extractCreateResult(payload: unknown): CreateWorkOrderResult {
  const record = asRecord(payload)

  if (!record) {
    return {}
  }

  const nestedRecord = asRecord(record.data)

  if (nestedRecord) {
    return nestedRecord as CreateWorkOrderResult
  }

  return record as CreateWorkOrderResult
}

function extractDetailRecord(payload: unknown): WorkOrderDetailResult {
  const record = unwrapWorkOrderDetailRecord(payload)

  if (!record || Array.isArray(record)) {
    return {}
  }

  return record as WorkOrderDetailResult
}

function unwrapWorkOrderDetailRecord(value: unknown): Record<string, unknown> | unknown[] | null {
  if (Array.isArray(value)) {
    if (value.length === 1) {
      return unwrapWorkOrderDetailRecord(value[0])
    }

    return value
  }

  const record = asRecord(value)

  if (!record) {
    return null
  }

  const nestedCandidates = [
    record.data,
    record.Data,
    record.detail,
    record.Detail,
    record.record,
    record.Record,
    record.item,
    record.Item,
  ]

  for (const candidate of nestedCandidates) {
    const nestedRecord = unwrapWorkOrderDetailRecord(candidate)

    if (nestedRecord) {
      return nestedRecord
    }
  }

  const listCandidates = [
    record.List,
    record.list,
    record.rows,
    record.Items,
    record.items,
  ]

  for (const candidate of listCandidates) {
    if (!Array.isArray(candidate) || candidate.length !== 1) {
      continue
    }

    const nestedRecord = unwrapWorkOrderDetailRecord(candidate[0])

    if (nestedRecord && !Array.isArray(nestedRecord)) {
      return nestedRecord
    }
  }

  if (!hasDirectWorkOrderFields(record)) {
    const nestedObjectEntries = Object.entries(record)
      .filter(([key]) => !DETAIL_META_KEYS.has(key))
      .map(([, candidate]) => candidate)
      .filter(candidate => (
        (candidate !== null && typeof candidate === "object" && !Array.isArray(candidate))
        || (Array.isArray(candidate) && candidate.length === 1)
      ))

    if (nestedObjectEntries.length === 1) {
      const nestedRecord = unwrapWorkOrderDetailRecord(nestedObjectEntries[0])

      if (nestedRecord) {
        return nestedRecord
      }
    }
  }

  return record
}

const DETAIL_META_KEYS = new Set([
  "code",
  "Code",
  "message",
  "Message",
  "msg",
  "success",
  "requestId",
  "request_id",
  "traceId",
  "trace_id",
  "Total",
  "total",
])

function hasDirectWorkOrderFields(record: Record<string, unknown>) {
  return [
    "ServiceName",
    "PlanName",
    "ParkName",
    "OrderNo",
    "Uuid",
    "CustomerUuid",
  ].some(key => key in record)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}

function getRequiredString(value: unknown, fieldName: string) {
  const normalized = getOptionalString(value)

  if (!normalized) {
    throw new ApiError(`请求参数校验失败：${fieldName} 不能为空。`)
  }

  return normalized
}

function getRequiredNumber(value: unknown, fieldName: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(`请求参数校验失败：${fieldName} 必须是有效数字。`)
  }

  return value
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

function normalizeOptionalStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const normalized = Array.from(new Set(
    value
      .map(item => getOptionalString(item))
      .filter((item): item is string => Boolean(item)),
  ))

  return normalized.length ? normalized : undefined
}

function getFirstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "string") {
      const normalized = value.trim()
      if (normalized) {
        return normalized
      }
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return undefined
}

function normalizeWorkOrderBuildInfos(value: unknown): WorkOrderBuildInfo[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(item => item && typeof item === "object")
    .map((item) => {
      const record = item as Record<string, unknown>

      return {
        ...record,
        BuildName: getFirstText(record, ["BuildName", "buildName", "BuildingName", "buildingName"]),
        BuildUuid: getFirstText(record, ["BuildUuid", "buildUuid"]),
        InspectionItems: normalizeWorkOrderBuildInspectionItems(record.InspectionItems),
        Score: getFirstNumber(record, ["Score", "score"]),
      }
    })
}

function normalizeWorkOrderBuildInspectionItems(value: unknown): WorkOrderBuildInspectionItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(item => item && typeof item === "object")
    .map((item) => {
      const record = item as Record<string, unknown>

      return {
        ...record,
        InspectionItemName: getFirstText(record, ["InspectionItemName", "inspectionItemName", "Name", "name"]),
        InspectionItemUuid: getFirstText(record, ["InspectionItemUuid", "inspectionItemUuid", "Uuid", "uuid"]),
        CategoryName: getFirstText(record, ["CategoryName", "categoryName"]),
        CategoryUuid: getFirstText(record, ["CategoryUuid", "categoryUuid"]),
        Score: getFirstNumber(record, ["Score", "score"]),
        UserName: getFirstText(record, ["UserName", "userName"]),
      }
    })
}

function getFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string" && value.trim()) {
      const normalized = Number(value.trim())
      if (Number.isFinite(normalized)) {
        return normalized
      }
    }
  }

  return undefined
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
