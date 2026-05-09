import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

type CustomerFeedbackListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type CustomerFeedbackListItem = {
  Id?: number
  Uuid?: string
  CustomerUuid?: string
  CorpName?: string
  CustomerName?: string
  UserName?: string
  Nickname?: string
  Phone?: string
  Mobile?: string
  Contact?: string
  Type?: string
  Category?: string
  Title?: string
  Content?: string
  FeedbackContent?: string
  Opinion?: string
  ReplyContent?: string
  Reply?: string
  ReplyAt?: string
  ReplyTime?: string
  Status?: number
  CreatedAt?: string
  UpdatedAt?: string
  [property: string]: unknown
}

export type ListCustomerFeedbackPayload = {
  Keyword?: string
  CustomerName?: string
  Status?: number
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

export type ReplyCustomerFeedbackPayload = {
  Uuid?: string
  ReplyContent?: string
  [property: string]: unknown
}

export type CustomerFeedbackListResult = {
  list: CustomerFeedbackListItem[]
  total: number
}

const CUSTOMER_FEEDBACK_LIST_API_URL = buildApiUrl(API_PATHS.customerFeedbackList)
const CUSTOMER_FEEDBACK_REPLY_API_URL = buildApiUrl(API_PATHS.customerFeedbackReply)
const CUSTOMER_FEEDBACK_LOAD_ERROR_MESSAGE = "客户反馈列表加载失败，请稍后重试。"
const CUSTOMER_FEEDBACK_REPLY_ERROR_MESSAGE = "客户反馈回复保存失败，请稍后重试。"

export async function fetchCustomerFeedback(
  payload: ListCustomerFeedbackPayload = {},
): Promise<CustomerFeedbackListResult> {
  const normalizedPayload = {
    Keyword: getOptionalString(payload.Keyword),
    CustomerName: getOptionalString(payload.CustomerName),
    Status: getOptionalNumber(payload.Status, "Status"),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum") ?? 1,
    PageSize: getOptionalNumber(payload.PageSize, "PageSize") ?? 10,
  }

  const response = await fetch(CUSTOMER_FEEDBACK_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responsePayload = await readResponseBody(response) as CustomerFeedbackListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responsePayload, CUSTOMER_FEEDBACK_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responsePayload, CUSTOMER_FEEDBACK_LOAD_ERROR_MESSAGE)

  const list = extractList(responsePayload)

  return {
    list: list.map(item => normalizeFeedbackItem(item)),
    total: extractTotal(responsePayload, list.length),
  }
}

export async function replyCustomerFeedback(payload: ReplyCustomerFeedbackPayload) {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    ReplyContent: getRequiredString(payload.ReplyContent, "ReplyContent"),
  }

  const response = await fetch(CUSTOMER_FEEDBACK_REPLY_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, CUSTOMER_FEEDBACK_REPLY_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, CUSTOMER_FEEDBACK_REPLY_ERROR_MESSAGE)
}

function extractList(payload: CustomerFeedbackListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as CustomerFeedbackListEnvelope

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

function extractTotal(payload: CustomerFeedbackListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as CustomerFeedbackListEnvelope

    if (typeof nested.Total === "number") {
      return nested.Total
    }
  }

  return fallback
}

function normalizeFeedbackItem(value: unknown): CustomerFeedbackListItem {
  if (value && typeof value === "object") {
    return value as CustomerFeedbackListItem
  }

  return {}
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

function getRequiredString(value: unknown, field: string) {
  const normalized = getOptionalString(value)

  if (normalized) {
    return normalized
  }

  throw new ApiError(`请求参数校验失败：${field} 不能为空。`)
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
