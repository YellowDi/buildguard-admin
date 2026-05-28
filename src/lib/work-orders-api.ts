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
  EndTime?: string
  Executor?: string
  Executors?: WorkOrderExecutor[]
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
  ItemPassTotal?: number
  ItemTotal?: number
  ReportUrl?: string
  Result?: number
  Score?: number
  Version?: number
  [property: string]: unknown
}

export type WorkOrderExecutor = {
  Name?: string
  Uuid?: string
  [property: string]: unknown
}

export type WorkOrderBuildInspectionItem = {
  Uuid?: string
  InspectionItemName?: string
  InspectionItemUuid?: string
  CategoryContent?: string
  CategoryName?: string
  CategoryUuid?: string
  CategoryScore?: number
  ExecutorName?: string
  ExecutorUuid?: string
  Result?: number
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
  BuildUuid?: string
  ReportType: string
  Important: string
  Content?: string
  RepairFile?: WorkOrderFile[]
  WorkOrderInspectionBuildUuid?: string[]
}

export type UpdateRepairWorkOrderPayload = {
  Uuid: string
  CustomerUuid?: string
  ParkUuid?: string
  BuildUuid?: string
  ReportType?: string
  Important?: string
  Content?: string
  Status?: number
}

export type UpdateRepairWorkOrderStatusPayload = {
  Uuid: string
  Status: number
}

export type UploadRepairWorkOrderVideoPayload = {
  Abstract?: string
  Title?: string
  Url?: string
  Uuid?: string
  [property: string]: unknown
}

export type UpdateWorkOrderPayload = {
  Uuid: string
  Remark?: string
}

export type DispatchWorkOrderPayload = {
  Uuid: string
  UserUuid?: string
  UserUuids?: string[]
}

export type DispatchRepairWorkOrderPayload = {
  Uuids?: string[]
  UserUuids?: string[]
}

export type WorkOrderDetailPayload = {
  Uuid: string
}

export type WorkOrderInspectionHistoryDetailPayload = {
  Uuid: string
}

export type GenerateWorkOrderGnReportPayload = {
  BuildUuid?: string
  Expert?: string
  WorkOrderUuid?: string
  [property: string]: unknown
}

export type UploadWorkOrderReportPayload = {
  BuildUuid?: string
  FileUrl?: string
  Version?: number
  WorkOrderUuid?: string
  [property: string]: unknown
}

export type WorkOrderReportListPayload = {
  BuildUuid?: string
  WorkOrderUuid?: string
  [property: string]: unknown
}

export type WorkOrderReportItem = {
  CreatedAt?: string
  FileUrl?: string
  Version?: number
  [property: string]: unknown
}

export type WorkOrderDetailResult = WorkOrderListItem

export type WorkOrderInspectionHistoryDetailItem = {
  Uuid?: string
  Name?: string
  Content?: string
  MeasureContent?: string
  PhotoFile?: WorkOrderFile[]
  Result?: number
  IsReplay?: number
  [property: string]: unknown
}

export type WorkOrderGnReportItem = {
  CategoryName?: string
  Content?: string
  InspectionName?: string
  MeasureContent?: string
  Score?: number
  SuggestContent?: string
  [property: string]: unknown
}

export type WorkOrderGnReportResult = {
  BuildName?: string
  BuildSuggestContent?: string
  BuildUuid?: string
  CustomerAddress?: string
  CustomerName?: string
  Deadline?: string
  Expert?: string
  Items?: WorkOrderGnReportItem[]
  OrderNo?: string
  ParkName?: string
  PlanName?: string
  Result?: number
  RiskNum?: number
  Score?: number
  ServiceName?: string
  Version?: number
  [property: string]: unknown
}

export type WorkOrderFile = {
  Type?: number
  Url?: string
  [property: string]: unknown
}

export type RepairWorkOrderDetailResult = {
  Id?: number
  Uuid?: string
  OrderNo?: string
  CustomerUuid?: string
  CorpName?: string
  CustomerName?: string
  ParkUuid?: string
  ParkName?: string
  BuildUuid?: string
  BuildName?: string
  PlanName?: string
  UserUuid?: string
  UserName?: string
  Executors?: WorkOrderExecutor[]
  Important?: string
  ReportType?: string
  Content?: string
  BeforeContent?: string[]
  Title?: string
  Status?: number
  CreatedAt?: string
  AfterRepairFile?: WorkOrderFile[]
  BeforeRepairFile?: WorkOrderFile[]
  RepairFile?: WorkOrderFile[]
  RepairContent?: string
  CategoryContent?: string
  CategoryName?: string
  CategoryUuid?: string
  InspectionItemName?: string
  InspectionItemUuid?: string
  Result?: number
  WorkOrderInspectionBuildUuid?: string | string[]
  [property: string]: unknown
}

export type RepairWorkOrderListItem = {
} & RepairWorkOrderDetailResult & {
  BuildName?: string
  CreatedStartAt?: string
  CreatedEndAt?: string
  UpdatedAt?: string
}

export type RepairWorkOrdersListResult = {
  list: RepairWorkOrderListItem[]
  total: number
}

export type ListWorkOrdersPayload = {
  CustomerUuid?: string
  Deadline?: string
  Executor?: string
  OrderNo?: string
  PageNum?: number
  PageSize?: number
  PlanUuid?: string
  Result?: number
  ServiceName?: string
  Status?: number
  [property: string]: unknown
}

export type ListRepairWorkOrdersPayload = {
  CreatedEndAt?: string
  CreatedStartAt?: string
  CustomerUuid?: string
  Important?: string
  OrderNo?: string
  PageNum?: number
  PageSize?: number
  Status?: number
  Title?: string
  UserUuid?: number
  [property: string]: unknown
}

const WORK_ORDERS_API_URL = buildApiUrl(API_PATHS.workOrdersList)
const REPAIR_WORK_ORDERS_API_URL = buildApiUrl(API_PATHS.workOrderRepairList)
const REPAIR_WORK_ORDER_DETAIL_API_URL = API_PATHS.workOrderRepairDetail
const REPAIR_WORK_ORDER_CREATE_API_URL = buildApiUrl(API_PATHS.workOrderRepairCreate)
const REPAIR_WORK_ORDER_UPDATE_API_URL = buildApiUrl(API_PATHS.workOrderRepairUpdate)
const REPAIR_WORK_ORDER_DELETE_API_URL = API_PATHS.workOrderRepairDelete
const REPAIR_WORK_ORDER_STATUS_UPDATE_API_URL = buildApiUrl(API_PATHS.workOrderRepairStatusUpdate)
const REPAIR_WORK_ORDER_VIDEO_UPLOAD_API_URL = buildApiUrl(API_PATHS.workOrderRepairVideoUpload)
const WORK_ORDER_CREATE_API_URL = buildApiUrl(API_PATHS.workOrderCreate)
const WORK_ORDER_DETAIL_API_URL = API_PATHS.workOrderDetail
const WORK_ORDER_DELETE_API_URL = API_PATHS.workOrderDelete
const WORK_ORDER_INSPECTION_HISTORY_DETAIL_API_URL = API_PATHS.workOrderInspectionHistoryDetail
const WORK_ORDER_UPDATE_API_URL = buildApiUrl(API_PATHS.workOrderUpdate)
const WORK_ORDER_DISPATCH_API_URL = buildApiUrl(API_PATHS.workOrderDispatch)
const WORK_ORDER_REPAIR_DISPATCH_API_URL = buildApiUrl(API_PATHS.workOrderRepairDispatch)
const WORK_ORDER_GN_REPORT_API_URL = buildApiUrl(API_PATHS.workOrderGnReport)
const WORK_ORDER_REPORT_LIST_API_URL = buildApiUrl(API_PATHS.workOrderReportList)
const WORK_ORDER_REPORT_UPLOAD_API_URL = buildApiUrl(API_PATHS.workOrderReportUpload)
const WORK_ORDERS_LOAD_ERROR_MESSAGE = "工单列表加载失败，请稍后重试。"
const WORK_ORDER_CREATE_ERROR_MESSAGE = "工单创建失败，请稍后重试。"
const REPAIR_WORK_ORDER_CREATE_ERROR_MESSAGE = "报修工单创建失败，请稍后重试。"
const REPAIR_WORK_ORDER_UPDATE_ERROR_MESSAGE = "报修工单更新失败，请稍后重试。"
const REPAIR_WORK_ORDER_STATUS_UPDATE_ERROR_MESSAGE = "报修工单状态更新失败，请稍后重试。"
const REPAIR_WORK_ORDER_VIDEO_UPLOAD_ERROR_MESSAGE = "报修工单视频保存失败，请稍后重试。"
const REPAIR_WORK_ORDER_DELETE_ERROR_MESSAGE = "报修工单删除失败，请稍后重试。"
const WORK_ORDER_DELETE_ERROR_MESSAGE = "检测工单删除失败，请稍后重试。"
const WORK_ORDER_DETAIL_ERROR_MESSAGE = "工单详情加载失败，请稍后重试。"
const WORK_ORDER_INSPECTION_HISTORY_DETAIL_ERROR_MESSAGE = "检测结果历史加载失败，请稍后重试。"
const WORK_ORDER_UPDATE_ERROR_MESSAGE = "工单更新失败，请稍后重试。"
const WORK_ORDER_DISPATCH_ERROR_MESSAGE = "工单指派失败，请稍后重试。"
const WORK_ORDER_GN_REPORT_ERROR_MESSAGE = "检测报告生成失败，请稍后重试。"
const WORK_ORDER_REPORT_LIST_ERROR_MESSAGE = "报告列表加载失败，请稍后重试。"
const WORK_ORDER_REPORT_UPLOAD_ERROR_MESSAGE = "报告文件地址保存失败，请稍后重试。"

export async function fetchWorkOrders(payload: ListWorkOrdersPayload = {}): Promise<WorkOrdersListResult> {
  const normalizedPayload: ListWorkOrdersPayload = {
    PageNum: getOptionalPositiveInteger(payload.PageNum, "PageNum") ?? 1,
    PageSize: getOptionalPositiveInteger(payload.PageSize, "PageSize") ?? 10,
  }
  const customerUuid = getOptionalString(payload.CustomerUuid)
  const deadline = getOptionalString(payload.Deadline)
  const executor = getOptionalString(payload.Executor)
  const orderNo = getOptionalString(payload.OrderNo)
  const planUuid = getOptionalString(payload.PlanUuid)
  const result = getOptionalPositiveFilterNumber(payload.Result, "Result")
  const serviceName = getOptionalString(payload.ServiceName)
  const status = getOptionalPositiveFilterNumber(payload.Status, "Status")

  if (customerUuid) normalizedPayload.CustomerUuid = customerUuid
  if (deadline) normalizedPayload.Deadline = deadline
  if (executor) normalizedPayload.Executor = executor
  if (orderNo) normalizedPayload.OrderNo = orderNo
  if (planUuid) normalizedPayload.PlanUuid = planUuid
  if (result !== undefined) normalizedPayload.Result = result
  if (serviceName) normalizedPayload.ServiceName = serviceName
  if (status !== undefined) normalizedPayload.Status = status

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
    BuildUuid: getOptionalString(payload.BuildUuid),
    ReportType: getRequiredString(payload.ReportType, "ReportType"),
    Important: getRequiredString(payload.Important, "Important"),
    Content: getOptionalString(payload.Content) ?? "",
    RepairFile: normalizeOptionalWorkOrderFiles(payload.RepairFile),
    WorkOrderInspectionBuildUuid: normalizeOptionalStringArray(payload.WorkOrderInspectionBuildUuid),
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

export async function updateRepairWorkOrder(payload: UpdateRepairWorkOrderPayload): Promise<CreateWorkOrderResult> {
  const normalizedPayload = {
    Uuid: getOptionalString(payload.Uuid),
    CustomerUuid: getOptionalString(payload.CustomerUuid),
    ParkUuid: getOptionalString(payload.ParkUuid),
    BuildUuid: getOptionalString(payload.BuildUuid),
    ReportType: getOptionalString(payload.ReportType),
    Important: getOptionalString(payload.Important),
    Content: getOptionalString(payload.Content),
    Status: getOptionalNumber(payload.Status, "Status"),
  }

  const response = await fetch(REPAIR_WORK_ORDER_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, REPAIR_WORK_ORDER_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, REPAIR_WORK_ORDER_UPDATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function updateRepairWorkOrderStatus(payload: UpdateRepairWorkOrderStatusPayload): Promise<CreateWorkOrderResult> {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    Status: getRequiredNumber(payload.Status, "Status"),
  }

  const response = await fetch(REPAIR_WORK_ORDER_STATUS_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, REPAIR_WORK_ORDER_STATUS_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, REPAIR_WORK_ORDER_STATUS_UPDATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function uploadRepairWorkOrderVideo(payload: UploadRepairWorkOrderVideoPayload): Promise<CreateWorkOrderResult> {
  const normalizedPayload: UploadRepairWorkOrderVideoPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    Url: getRequiredString(payload.Url, "Url"),
    Title: getOptionalString(payload.Title),
    Abstract: getOptionalString(payload.Abstract),
  }

  const response = await fetch(REPAIR_WORK_ORDER_VIDEO_UPLOAD_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, REPAIR_WORK_ORDER_VIDEO_UPLOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, REPAIR_WORK_ORDER_VIDEO_UPLOAD_ERROR_MESSAGE)

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

export async function deleteRepairWorkOrder(payload: WorkOrderDetailPayload) {
  const url = buildApiRequestUrl(REPAIR_WORK_ORDER_DELETE_API_URL)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, REPAIR_WORK_ORDER_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, REPAIR_WORK_ORDER_DELETE_ERROR_MESSAGE)
}

export async function deleteWorkOrder(payload: WorkOrderDetailPayload) {
  const url = buildApiRequestUrl(WORK_ORDER_DELETE_API_URL)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, WORK_ORDER_DELETE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, WORK_ORDER_DELETE_ERROR_MESSAGE)
}

export async function fetchWorkOrderInspectionHistoryDetail(
  payload: WorkOrderInspectionHistoryDetailPayload,
): Promise<WorkOrderInspectionHistoryDetailItem[]> {
  const url = buildApiRequestUrl(WORK_ORDER_INSPECTION_HISTORY_DETAIL_API_URL)
  const uuid = getRequiredString(payload.Uuid, "Uuid")

  url.searchParams.set("Uuid", uuid)

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, WORK_ORDER_INSPECTION_HISTORY_DETAIL_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, WORK_ORDER_INSPECTION_HISTORY_DETAIL_ERROR_MESSAGE)

  return extractInspectionHistoryList(responseBody).map(item => normalizeWorkOrderInspectionHistoryDetailItem(item))
}

export async function generateWorkOrderGnReport(
  payload: GenerateWorkOrderGnReportPayload,
): Promise<WorkOrderGnReportResult> {
  const normalizedPayload: GenerateWorkOrderGnReportPayload = {
    BuildUuid: getRequiredString(payload.BuildUuid, "BuildUuid"),
    Expert: getOptionalString(payload.Expert) ?? "",
    WorkOrderUuid: getRequiredString(payload.WorkOrderUuid, "WorkOrderUuid"),
  }

  const response = await fetch(WORK_ORDER_GN_REPORT_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, WORK_ORDER_GN_REPORT_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, WORK_ORDER_GN_REPORT_ERROR_MESSAGE)

  return normalizeWorkOrderGnReportResult(extractWorkOrderGnReportRecord(responseBody))
}

export async function uploadWorkOrderReport(payload: UploadWorkOrderReportPayload): Promise<CreateWorkOrderResult> {
  const normalizedPayload: UploadWorkOrderReportPayload = {
    BuildUuid: getRequiredString(payload.BuildUuid, "BuildUuid"),
    FileUrl: getRequiredString(payload.FileUrl, "FileUrl"),
    WorkOrderUuid: getRequiredString(payload.WorkOrderUuid, "WorkOrderUuid"),
  }
  const version = getOptionalPositiveInteger(payload.Version, "Version")

  if (version !== undefined) {
    normalizedPayload.Version = version
  }

  const response = await fetch(WORK_ORDER_REPORT_UPLOAD_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, WORK_ORDER_REPORT_UPLOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, WORK_ORDER_REPORT_UPLOAD_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export async function fetchWorkOrderReportList(payload: WorkOrderReportListPayload = {}): Promise<WorkOrderReportItem[]> {
  const normalizedPayload: WorkOrderReportListPayload = {}
  const buildUuid = getOptionalString(payload.BuildUuid)
  const workOrderUuid = getOptionalString(payload.WorkOrderUuid)

  if (buildUuid) normalizedPayload.BuildUuid = buildUuid
  if (workOrderUuid) normalizedPayload.WorkOrderUuid = workOrderUuid

  const response = await fetch(WORK_ORDER_REPORT_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, WORK_ORDER_REPORT_LIST_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, WORK_ORDER_REPORT_LIST_ERROR_MESSAGE)

  return extractList(responseBody as WorkOrdersListEnvelope | unknown[]).map(item => normalizeWorkOrderReportItem(item))
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
  const userUuid = getOptionalString(payload.UserUuid)
  const userUuids = normalizeOptionalStringArray(payload.UserUuids)

  if (!userUuid && !userUuids?.length) {
    throw new ApiError("请求参数校验失败：UserUuid 或 UserUuids 至少需要一个。")
  }

  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    UserUuid: userUuid,
    UserUuids: userUuids,
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

export async function dispatchRepairWorkOrder(payload: DispatchRepairWorkOrderPayload): Promise<CreateWorkOrderResult> {
  const uuids = normalizeOptionalStringArray(payload.Uuids)
  const userUuids = normalizeOptionalStringArray(payload.UserUuids)

  if (!uuids?.length) {
    throw new ApiError("请求参数校验失败：Uuids 至少需要一个。")
  }

  if (!userUuids?.length) {
    throw new ApiError("请求参数校验失败：UserUuids 至少需要一个。")
  }

  const normalizedPayload = {
    Uuids: uuids,
    UserUuids: userUuids,
  }

  const response = await fetch(WORK_ORDER_REPAIR_DISPATCH_API_URL, {
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

export async function fetchRepairWorkOrders(payload: ListRepairWorkOrdersPayload = {}): Promise<RepairWorkOrdersListResult> {
  const normalizedPayload: ListRepairWorkOrdersPayload = {
    PageNum: getOptionalPositiveInteger(payload.PageNum, "PageNum") ?? 1,
    PageSize: getOptionalPositiveInteger(payload.PageSize, "PageSize") ?? 10,
  }
  const createdEndAt = getOptionalString(payload.CreatedEndAt)
  const createdStartAt = getOptionalString(payload.CreatedStartAt)
  const customerUuid = getOptionalString(payload.CustomerUuid)
  const important = getOptionalString(payload.Important)
  const orderNo = getOptionalString(payload.OrderNo)
  const status = getOptionalPositiveFilterNumber(payload.Status, "Status")
  const title = getOptionalString(payload.Title)
  const userUuid = getOptionalPositiveFilterNumber(payload.UserUuid, "UserUuid")

  if (createdEndAt) normalizedPayload.CreatedEndAt = createdEndAt
  if (createdStartAt) normalizedPayload.CreatedStartAt = createdStartAt
  if (customerUuid) normalizedPayload.CustomerUuid = customerUuid
  if (important) normalizedPayload.Important = important
  if (orderNo) normalizedPayload.OrderNo = orderNo
  if (status !== undefined) normalizedPayload.Status = status
  if (title) normalizedPayload.Title = title
  if (userUuid !== undefined) normalizedPayload.UserUuid = userUuid

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
    Builds: normalizeWorkOrderBuildInfos(getFirstArray(record, ["Builds", "builds"])),
    Deadline: getFirstText(record, ["Deadline", "deadline", "ExpireAt", "expireAt", "DueAt", "dueAt"]),
    EndTime: getFirstText(record, ["EndTime", "endTime"]),
    Executor: getFirstText(record, ["Executor", "executor", "PrincipalName", "principalName", "Assignee", "assignee"]),
    Executors: normalizeWorkOrderExecutors(record.Executors ?? record.executors),
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
    BuildUuid: getFirstText(record, ["BuildUuid", "buildUuid", "BuildingUuid", "buildingUuid"]),
    BuildName: getFirstText(record, ["BuildName", "buildName", "BuildingName", "buildingName"]),
    PlanName: getFirstText(record, ["PlanName", "planName"]),
    UserUuid: getFirstText(record, ["UserUuid", "userUuid"]),
    UserName: getFirstText(record, ["UserName", "userName"]),
    Executors: normalizeWorkOrderExecutors(record.Executors ?? record.executors),
    Important: getFirstText(record, ["Important", "important"]),
    ReportType: getFirstText(record, ["ReportType", "reportType"]),
    Content: getFirstText(record, ["Content", "content"]),
    BeforeContent: getFirstTextArray(record, ["BeforeContent", "beforeContent"]),
    Title: getFirstText(record, ["Title", "title"]),
    Status: getFirstNumber(record, ["Status", "status"]),
    CreatedStartAt: getFirstText(record, ["CreatedStartAt", "createdStartAt"]),
    CreatedEndAt: getFirstText(record, ["CreatedEndAt", "createdEndAt"]),
    CreatedAt: getFirstText(record, ["CreatedAt", "createdAt", "CreateTime", "createTime"]),
    UpdatedAt: getFirstText(record, ["UpdatedAt", "updatedAt", "UpdateTime", "updateTime"]),
    AfterRepairFile: getFirstWorkOrderFiles(record, ["AfterRepairFile", "afterRepairFile"]),
    BeforeRepairFile: getFirstWorkOrderFiles(record, ["BeforeRepairFile", "beforeRepairFile"]),
    RepairFile: getFirstWorkOrderFiles(record, ["RepairFile", "repairFile"]),
    RepairContent: getFirstText(record, ["RepairContent", "repairContent"]),
    CategoryContent: getFirstText(record, ["CategoryContent", "categoryContent"]),
    CategoryName: getFirstText(record, ["CategoryName", "categoryName"]),
    CategoryUuid: getFirstText(record, ["CategoryUuid", "categoryUuid"]),
    InspectionItemName: getFirstText(record, ["InspectionItemName", "inspectionItemName"]),
    InspectionItemUuid: getFirstText(record, ["InspectionItemUuid", "inspectionItemUuid"]),
    Result: getFirstNumber(record, ["Result", "result"]),
    WorkOrderInspectionBuildUuid: getFirstText(record, [
      "WorkOrderInspectionBuildUuid",
      "workOrderInspectionBuildUuid",
    ]) ?? getFirstTextArray(record, [
      "WorkOrderInspectionBuildUuids",
      "workOrderInspectionBuildUuids",
    ]),
  }
}

function normalizeWorkOrderInspectionHistoryDetailItem(value: unknown): WorkOrderInspectionHistoryDetailItem {
  if (!value || typeof value !== "object") {
    return {}
  }

  const record = value as Record<string, unknown>

  return {
    ...record,
    Uuid: getFirstText(record, ["Uuid", "uuid"]),
    Name: getFirstText(record, ["Name", "name"]),
    Content: getFirstText(record, ["Content", "content"]),
    MeasureContent: getFirstText(record, ["MeasureContent", "measureContent"]),
    PhotoFile: getFirstWorkOrderFiles(record, ["PhotoFile", "photoFile"]),
    Result: getFirstNumber(record, ["Result", "result"]),
    IsReplay: getFirstNumber(record, ["IsReplay", "isReplay"]),
  }
}

function normalizeWorkOrderGnReportResult(value: unknown): WorkOrderGnReportResult {
  if (!value || typeof value !== "object") {
    return {}
  }

  const record = value as Record<string, unknown>

  return {
    ...record,
    BuildName: getFirstText(record, ["BuildName", "buildName", "BuildingName", "buildingName"]),
    BuildSuggestContent: getFirstText(record, ["BuildSuggestContent", "buildSuggestContent"]),
    BuildUuid: getFirstText(record, ["BuildUuid", "buildUuid"]),
    CustomerAddress: getFirstText(record, ["CustomerAddress", "customerAddress", "Address", "address"]),
    CustomerName: getFirstText(record, ["CustomerName", "customerName", "CorpName", "corpName"]),
    Deadline: getFirstText(record, ["Deadline", "deadline", "ExpireAt", "expireAt", "DueAt", "dueAt"]),
    Expert: getFirstText(record, ["Expert", "expert"]),
    Items: normalizeWorkOrderGnReportItems(getFirstArray(record, ["Items", "items", "List", "list"])),
    OrderNo: getFirstText(record, ["OrderNo", "orderNo", "WorkOrderNo", "workOrderNo", "No", "no"]),
    ParkName: getFirstText(record, ["ParkName", "parkName"]),
    PlanName: getFirstText(record, ["PlanName", "planName", "InspectionPlanName", "inspectionPlanName"]),
    Result: getFirstNumber(record, ["Result", "result"]),
    RiskNum: getFirstNumber(record, ["RiskNum", "riskNum", "RiskNumber", "riskNumber"]),
    Score: getFirstNumber(record, ["Score", "score", "TotalScore", "totalScore"]),
    ServiceName: getFirstText(record, ["ServiceName", "serviceName", "PackageName", "packageName"]),
    Version: getFirstNumber(record, ["Version", "version", "ReportVersion", "reportVersion"]),
  }
}

function normalizeWorkOrderReportItem(value: unknown): WorkOrderReportItem {
  if (!value || typeof value !== "object") {
    return {}
  }

  const record = value as Record<string, unknown>

  return {
    ...record,
    CreatedAt: getFirstText(record, ["CreatedAt", "createdAt", "CreateTime", "createTime", "UploadTime", "uploadTime"]),
    FileUrl: getFirstText(record, ["FileUrl", "fileUrl", "Url", "url", "URL"]),
    Version: getFirstNumber(record, ["Version", "version", "ReportVersion", "reportVersion"]),
  }
}

function normalizeWorkOrderGnReportItems(value: unknown): WorkOrderGnReportItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(item => item && typeof item === "object")
    .map((item) => {
      const record = item as Record<string, unknown>

      return {
        ...record,
        CategoryName: getFirstText(record, ["CategoryName", "categoryName"]),
        Content: getFirstText(record, ["Content", "content"]),
        InspectionName: getFirstText(record, ["InspectionName", "inspectionName", "InspectionItemName", "inspectionItemName", "Name", "name"]),
        MeasureContent: getFirstText(record, ["MeasureContent", "measureContent"]),
        Score: getFirstNumber(record, ["Score", "score"]),
        SuggestContent: getFirstText(record, ["SuggestContent", "suggestContent"]),
      }
    })
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

function extractInspectionHistoryList(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload
  }

  const record = asRecord(payload)

  if (!record) {
    return []
  }

  if (Array.isArray(record.List)) {
    return record.List
  }

  const nestedRecord = asRecord(record.data)

  if (nestedRecord && Array.isArray(nestedRecord.List)) {
    return nestedRecord.List
  }

  if (nestedRecord && Array.isArray(nestedRecord.list)) {
    return nestedRecord.list
  }

  if (nestedRecord && Array.isArray(nestedRecord.Rows)) {
    return nestedRecord.Rows
  }

  if (nestedRecord && Array.isArray(nestedRecord.rows)) {
    return nestedRecord.rows
  }

  const upperNestedRecord = asRecord(record.Data)

  if (upperNestedRecord && Array.isArray(upperNestedRecord.List)) {
    return upperNestedRecord.List
  }

  if (upperNestedRecord && Array.isArray(upperNestedRecord.list)) {
    return upperNestedRecord.list
  }

  if (upperNestedRecord && Array.isArray(upperNestedRecord.Rows)) {
    return upperNestedRecord.Rows
  }

  if (upperNestedRecord && Array.isArray(upperNestedRecord.rows)) {
    return upperNestedRecord.rows
  }

  if (Array.isArray(record.list)) {
    return record.list
  }

  if (Array.isArray(record.Rows)) {
    return record.Rows
  }

  if (Array.isArray(record.rows)) {
    return record.rows
  }

  return []
}

function extractDetailRecord(payload: unknown): WorkOrderDetailResult {
  const record = unwrapWorkOrderDetailRecord(payload)

  if (!record || Array.isArray(record)) {
    return {}
  }

  return record as WorkOrderDetailResult
}

function extractWorkOrderGnReportRecord(payload: unknown): WorkOrderGnReportResult {
  const record = unwrapWorkOrderGnReportRecord(payload)

  if (!record || Array.isArray(record)) {
    return {}
  }

  return record as WorkOrderGnReportResult
}

function unwrapWorkOrderGnReportRecord(value: unknown): Record<string, unknown> | unknown[] | null {
  if (Array.isArray(value)) {
    if (value.length === 1) {
      return unwrapWorkOrderGnReportRecord(value[0])
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
    const nestedRecord = unwrapWorkOrderGnReportRecord(candidate)

    if (nestedRecord) {
      return nestedRecord
    }
  }

  const listCandidates = [
    record.List,
    record.list,
    record.rows,
  ]

  for (const candidate of listCandidates) {
    if (!Array.isArray(candidate) || candidate.length !== 1) {
      continue
    }

    const nestedRecord = unwrapWorkOrderGnReportRecord(candidate[0])

    if (nestedRecord && !Array.isArray(nestedRecord)) {
      return nestedRecord
    }
  }

  if (!hasDirectWorkOrderGnReportFields(record)) {
    const nestedObjectEntries = Object.entries(record)
      .filter(([key]) => !DETAIL_META_KEYS.has(key))
      .map(([, candidate]) => candidate)
      .filter(candidate => (
        (candidate !== null && typeof candidate === "object" && !Array.isArray(candidate))
        || (Array.isArray(candidate) && candidate.length === 1)
      ))

    if (nestedObjectEntries.length === 1) {
      const nestedRecord = unwrapWorkOrderGnReportRecord(nestedObjectEntries[0])

      if (nestedRecord) {
        return nestedRecord
      }
    }
  }

  return record
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
    "Title",
    "Content",
  ].some(key => key in record)
}

function hasDirectWorkOrderGnReportFields(record: Record<string, unknown>) {
  return [
    "BuildName",
    "buildName",
    "BuildSuggestContent",
    "buildSuggestContent",
    "BuildUuid",
    "buildUuid",
    "CustomerAddress",
    "customerAddress",
    "CustomerName",
    "customerName",
    "Expert",
    "expert",
    "Items",
    "items",
    "OrderNo",
    "orderNo",
    "RiskNum",
    "riskNum",
    "ServiceName",
    "serviceName",
    "Version",
    "version",
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

function getRequiredPositiveInteger(value: unknown, fieldName: string) {
  if (
    typeof value !== "number"
    || !Number.isInteger(value)
    || value <= 0
  ) {
    throw new ApiError(`请求参数校验失败：${fieldName} 必须是正整数。`)
  }

  return value
}

function getOptionalPositiveInteger(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  return getRequiredPositiveInteger(value, fieldName)
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

function getOptionalPositiveFilterNumber(value: unknown, fieldName: string) {
  const normalized = getOptionalNumber(value, fieldName)

  if (normalized === undefined || normalized === 0) {
    return undefined
  }

  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new TypeError(`${fieldName} must be a positive integer.`)
  }

  return normalized
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

function normalizeOptionalWorkOrderFiles(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const files: WorkOrderFile[] = []

  value.forEach((item) => {
    const record = asRecord(item)
    const url = getOptionalStringSilently(record?.Url)

    if (!url) {
      return
    }

    files.push({
      Type: getOptionalNumber(record?.Type, "Type") ?? 1,
      Url: url,
    })
  })

  return files.length ? files : undefined
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

function getFirstTextArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "string" || typeof value === "number") {
      const normalized = getOptionalString(value)

      if (normalized) {
        return [normalized]
      }
    }

    if (!Array.isArray(value)) {
      continue
    }

    const normalized = value
      .map(item => getTextArrayItem(item))
      .filter((item): item is string => Boolean(item))

    if (normalized.length) {
      return normalized
    }
  }

  return undefined
}

function getTextArrayItem(value: unknown) {
  const directValue = getOptionalStringSilently(value)

  if (directValue) {
    return directValue
  }

  const record = asRecord(value)

  if (!record) {
    return undefined
  }

  return getFirstText(record, [
    "Name",
    "name",
    "UserName",
    "userName",
    "Username",
    "username",
    "ExecutorName",
    "executorName",
    "RealName",
    "realName",
    "DisplayName",
    "displayName",
    "NickName",
    "nickName",
    "Uuid",
    "uuid",
    "UserUuid",
    "userUuid",
  ])
}

function normalizeWorkOrderExecutors(value: unknown): WorkOrderExecutor[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const executors = value
    .map(item => normalizeWorkOrderExecutor(item))
    .filter((item): item is WorkOrderExecutor => item !== null)

  return executors.length ? executors : undefined
}

function normalizeWorkOrderExecutor(value: unknown): WorkOrderExecutor | null {
  const directName = getOptionalStringSilently(value)

  if (directName) {
    return { Name: directName }
  }

  const record = asRecord(value)

  if (!record) {
    return null
  }

  const name = getFirstText(record, [
    "Name",
    "name",
    "UserName",
    "userName",
    "ExecutorName",
    "executorName",
    "RealName",
    "realName",
    "DisplayName",
    "displayName",
    "NickName",
    "nickName",
  ])
  const uuid = getFirstText(record, [
    "Uuid",
    "uuid",
    "UserUuid",
    "userUuid",
    "ExecutorUuid",
    "executorUuid",
  ])

  if (!name && !uuid) {
    return null
  }

  return {
    ...record,
    Name: name,
    Uuid: uuid,
  }
}

function getFirstArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (Array.isArray(value)) {
      return value
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
        InspectionItems: normalizeWorkOrderBuildInspectionItems(getFirstArray(record, ["InspectionItems", "inspectionItems"])),
        ItemPassTotal: getFirstNumber(record, ["ItemPassTotal", "itemPassTotal"]),
        ItemTotal: getFirstNumber(record, ["ItemTotal", "itemTotal"]),
        ReportUrl: getFirstText(record, ["ReportUrl", "reportUrl", "FileUrl", "fileUrl", "Url", "url"]),
        Result: getFirstNumber(record, ["Result", "result"]),
        Score: getFirstNumber(record, ["Score", "score"]),
        Version: getFirstNumber(record, ["Version", "version"]),
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
        Uuid: getFirstText(record, ["Uuid", "uuid"]),
        InspectionItemName: getFirstText(record, ["InspectionItemName", "inspectionItemName", "Name", "name"]),
        InspectionItemUuid: getFirstText(record, ["InspectionItemUuid", "inspectionItemUuid"]),
        CategoryContent: getFirstText(record, ["CategoryContent", "categoryContent"]),
        CategoryName: getFirstText(record, ["CategoryName", "categoryName"]),
        CategoryUuid: getFirstText(record, ["CategoryUuid", "categoryUuid", "Uuid", "uuid"]),
        CategoryScore: getFirstNumber(record, ["CategoryScore", "categoryScore"]),
        ExecutorName: getFirstText(record, ["ExecutorName", "executorName"]),
        ExecutorUuid: getFirstText(record, ["ExecutorUuid", "executorUuid"]),
        Result: getFirstNumber(record, ["Result", "result"]),
        Score: getFirstNumber(record, ["Score", "score"]),
        UserName: getFirstText(record, ["UserName", "userName", "ExecutorName", "executorName"]),
      }
    })
}

function getFirstWorkOrderFiles(record: Record<string, unknown>, keys: string[]): WorkOrderFile[] {
  for (const key of keys) {
    const value = record[key]
    const normalized = normalizeWorkOrderFiles(value)

    if (normalized.length) {
      return normalized
    }
  }

  return []
}

function normalizeWorkOrderFiles(value: unknown): WorkOrderFile[] {
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeWorkOrderFile(item))
      .filter((item): item is WorkOrderFile => Boolean(item))
  }

  const legacyUrl = getOptionalStringSilently(value)
  return legacyUrl ? [{ Url: legacyUrl, Type: inferWorkOrderFileType(legacyUrl) }] : []
}

function normalizeWorkOrderFile(value: unknown): WorkOrderFile | null {
  if (typeof value === "string" || typeof value === "number") {
    const url = getOptionalStringSilently(value)
    return url ? { Url: url, Type: inferWorkOrderFileType(url) } : null
  }

  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const url = getFirstText(record, ["Url", "url", "URL", "FileUrl", "fileUrl"])

  if (!url) {
    return null
  }

  return {
    ...record,
    Url: url,
    Type: getFirstNumber(record, ["Type", "type", "FileType", "fileType"]) ?? inferWorkOrderFileType(url),
  }
}

function inferWorkOrderFileType(url: string) {
  return /\.(mp4|mov|m4v|webm|ogg)(\?|#|$)/i.test(url) ? 2 : 1
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

function getOptionalStringSilently(value: unknown) {
  try {
    return getOptionalString(value)
  } catch {
    return undefined
  }
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
