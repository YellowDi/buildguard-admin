import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

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
  CustomerUuid?: string
  CustomerName?: string
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

export type RepairWorkOrderListItem = {
  Id?: number
  Uuid?: string
  OrderNo?: string
  CustomerUuid?: string
  CorpName?: string
  CustomerName?: string
  ParkUuid?: string
  ParkName?: string
  UserUuid?: string
  UserName?: string
  Important?: number
  ReportType?: number
  Content?: string
  Title?: string
  Status?: number
  CreatedAt?: string
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
const WORK_ORDER_CREATE_API_URL = buildApiUrl(API_PATHS.workOrderCreate)
const WORK_ORDERS_LOAD_ERROR_MESSAGE = "工单列表加载失败，请稍后重试。"
const WORK_ORDER_CREATE_ERROR_MESSAGE = "工单创建失败，请稍后重试。"

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
    CustomerUuid: getFirstText(record, ["CustomerUuid", "customerUuid"]),
    CustomerName: getFirstText(record, ["CustomerName", "customerName", "CorpName", "corpName", "CompanyName", "companyName"]),
    Deadline: getFirstText(record, ["Deadline", "deadline", "ExpireAt", "expireAt", "DueAt", "dueAt"]),
    Executor: getFirstText(record, ["Executor", "executor", "PrincipalName", "principalName", "Assignee", "assignee"]),
    Status: getFirstNumber(record, ["Status", "status", "WorkOrderStatus", "workOrderStatus"]),
    Score: getFirstNumber(record, ["Score", "score", "TotalScore", "totalScore"]),
    Result: getFirstNumber(record, ["Result", "result", "WorkOrderResult", "workOrderResult"]),
    Remark: getFirstText(record, ["Remark", "remark", "Note", "note", "Description", "description"]),
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
    UserUuid: getFirstText(record, ["UserUuid", "userUuid"]),
    UserName: getFirstText(record, ["UserName", "userName"]),
    Important: getFirstNumber(record, ["Important", "important"]),
    ReportType: getFirstNumber(record, ["ReportType", "reportType"]),
    Content: getFirstText(record, ["Content", "content"]),
    Title: getFirstText(record, ["Title", "title"]),
    Status: getFirstNumber(record, ["Status", "status"]),
    CreatedAt: getFirstText(record, ["CreatedAt", "createdAt", "CreateTime", "createTime"]),
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
