import { toast } from "vue-sonner"

import { notifyAuthExpired } from "@/lib/auth"

type ApiErrorMeta = {
  status?: number
  code?: string
  requestId?: string
}

type HandleApiErrorOptions = {
  title?: string
  fallback?: string
  description?: string
  mode?: "toast" | "silent"
}

const MESSAGE_KEYS = ["message", "msg", "error", "detail", "title", "reason", "resp_err", "respErr"] as const
const NESTED_KEYS = ["data", "error"] as const
const CODE_KEYS = ["code", "errorCode", "error_code", "status_code", "statusCode"] as const
const REQUEST_ID_KEYS = ["requestId", "request_id", "traceId", "trace_id"] as const
const REQUEST_ID_HEADER_KEYS = [
  "x-request-id",
  "x-trace-id",
  "trace-id",
  "x-b3-traceid",
  "x-amzn-trace-id",
] as const
const AUTH_EXPIRED_MESSAGE_PATTERN = /(鉴权|身份信息|未登录|登录失效|token)/i

export class ApiError extends Error {
  status?: number
  code?: string
  requestId?: string

  constructor(message: string, meta: ApiErrorMeta = {}) {
    super(message)
    this.name = "ApiError"
    this.status = meta.status
    this.code = meta.code
    this.requestId = meta.requestId
  }
}

export function getApiErrorMessage(error: unknown, fallback = "操作失败，请稍后重试。") {
  if (error instanceof ApiError) {
    const baseMessage = normalizeMessage(error.message) ?? fallback
    const requestId = normalizeMessage(error.requestId)
    return requestId && !baseMessage.includes(requestId)
      ? `${baseMessage}（requestId: ${requestId}）`
      : baseMessage
  }

  if (error instanceof Error) {
    return normalizeMessage(error.message) ?? fallback
  }

  const message = extractMessage(error)
  return message ?? fallback
}

export function handleApiError(error: unknown, options: HandleApiErrorOptions = {}) {
  const message = getApiErrorMessage(error, options.fallback)

  if (options.mode !== "silent") {
    toast.error(options.title ?? "操作失败", {
      description: options.description ?? message,
    })
  }

  return message
}

export function createHttpError(
  response: Pick<Response, "status" | "statusText" | "headers">,
  payload?: unknown,
  fallback = "请求失败，请稍后重试。",
) {
  const payloadMessage = extractMessage(payload)
  const status = Number.isFinite(response.status) ? response.status : undefined
  const statusSuffix = status ? `（${status}）` : ""
  const code = extractScalar(payload, CODE_KEYS)
  const requestId = extractScalar(payload, REQUEST_ID_KEYS)
    ?? extractHeaderValue(response.headers, REQUEST_ID_HEADER_KEYS)

  if (isAuthExpired({
    status,
    record: asRecord(payload),
    code,
    message: payloadMessage ?? fallback,
  })) {
    notifyAuthExpired()
  }

  return new ApiError(payloadMessage ?? `${fallback}${statusSuffix}`, {
    status,
    code: code ?? undefined,
    requestId: requestId ?? undefined,
  })
}

export function assertApiSuccess(payload: unknown, fallback = "请求失败，请稍后重试。") {
  const record = asRecord(payload)

  if (!record) {
    return
  }

  const code = extractScalar(payload, CODE_KEYS)
  const message = extractMessage(payload) ?? fallback

  if (isAuthExpired({ record, code, message })) {
    notifyAuthExpired()
    throw new ApiError(message, {
      code: code ?? undefined,
      requestId: extractScalar(payload, REQUEST_ID_KEYS) ?? undefined,
    })
  }

  if (record.success === false) {
    throw new ApiError(message, {
      code: code ?? undefined,
      requestId: extractScalar(payload, REQUEST_ID_KEYS) ?? undefined,
    })
  }

  const rawCode = record.code
    ?? record.Code
    ?? record.status_code
    ?? record.statusCode
  const numericCode = typeof rawCode === "string" ? Number(rawCode.trim()) : rawCode

  if (typeof numericCode === "number" && Number.isFinite(numericCode) && numericCode !== 0 && numericCode !== 200) {
    throw new ApiError(message, {
      code: String(numericCode),
      requestId: extractScalar(payload, REQUEST_ID_KEYS) ?? undefined,
    })
  }
}

export async function readResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  const text = await response.text()
  const normalizedText = normalizeMessage(text)

  if (!normalizedText) {
    return null
  }

  try {
    return JSON.parse(normalizedText) as unknown
  } catch {
    return normalizedText
  }
}

function extractMessage(value: unknown, depth = 0): string | null {
  if (depth > 3) {
    return null
  }

  const directMessage = normalizeMessage(value)
  if (directMessage) {
    return directMessage
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedMessage = extractMessage(item, depth + 1)
      if (nestedMessage) {
        return nestedMessage
      }
    }

    return null
  }

  const record = asRecord(value)
  if (!record) {
    return null
  }

  const topLevelMessage = extractScalar(record, MESSAGE_KEYS)
  if (topLevelMessage) {
    return topLevelMessage
  }

  for (const key of NESTED_KEYS) {
    const nestedMessage = extractMessage(record[key], depth + 1)
    if (nestedMessage) {
      return nestedMessage
    }
  }

  return null
}

function extractScalar(
  value: unknown,
  keys: readonly string[],
) {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  for (const key of keys) {
    const normalized = normalizeMessage(record[key])
    if (normalized) {
      return normalized
    }
  }

  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}

function normalizeMessage(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function extractHeaderValue(
  headers: Pick<Headers, "get">,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = normalizeMessage(headers.get(key))
    if (value) {
      return value
    }
  }

  return null
}

function isAuthExpired({
  status,
  record,
  code,
  message,
}: {
  status?: number
  record?: Record<string, unknown> | null
  code?: string | null
  message: string
}) {
  if (status === 401) {
    return true
  }

  if (code === "1001" || code === "401") {
    return true
  }

  if (AUTH_EXPIRED_MESSAGE_PATTERN.test(message) && (!record || record.success === false)) {
    return true
  }

  return false
}
