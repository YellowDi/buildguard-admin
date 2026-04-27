import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

export type V1Credentials = {
  AccessKeyId?: string
  AccessKeySecret?: string
  Expiration?: string
  SecurityToken?: string
  [property: string]: unknown
}

export type TencentCosStsResponse = {
  BucketName?: string
  Domain?: string
  EndPoint?: string
  Region?: string
  Sts?: V1Credentials
  [property: string]: unknown
}

export type FetchTencentCosStsOptions = {
  forceRefresh?: boolean
}

const TENCENT_COS_STS_API_URL = buildApiUrl(API_PATHS.tencentCosSts)
const TENCENT_COS_STS_ERROR_MESSAGE = "腾讯云 COS 鉴权信息获取失败，请稍后重试。"
const TENCENT_COS_STS_CACHE_LEEWAY_MS = 60 * 1000

let cachedTencentCosSts: {
  expiresAt: number
  value: TencentCosStsResponse
} | null = null

export async function fetchTencentCosSts(options: FetchTencentCosStsOptions = {}): Promise<TencentCosStsResponse> {
  if (!options.forceRefresh && cachedTencentCosSts && cachedTencentCosSts.expiresAt > Date.now()) {
    return cachedTencentCosSts.value
  }

  const response = await fetch(TENCENT_COS_STS_API_URL, {
    method: "GET",
    headers: buildApiHeaders(),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, TENCENT_COS_STS_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, TENCENT_COS_STS_ERROR_MESSAGE)

  const sts = normalizeTencentCosStsResponse(extractTencentCosStsRecord(responseBody))

  assertTencentCosStsReady(sts)
  cacheTencentCosSts(sts)

  return sts
}

export function clearTencentCosStsCache() {
  cachedTencentCosSts = null
}

function cacheTencentCosSts(value: TencentCosStsResponse) {
  const expiresAt = parseExpirationTime(value.Sts?.Expiration) - TENCENT_COS_STS_CACHE_LEEWAY_MS

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    cachedTencentCosSts = null
    return
  }

  cachedTencentCosSts = {
    expiresAt,
    value,
  }
}

function assertTencentCosStsReady(value: TencentCosStsResponse) {
  if (!normalizeText(value.BucketName)) {
    throw new ApiError("腾讯云 COS 鉴权响应缺少 BucketName。")
  }

  if (!normalizeText(value.Region)) {
    throw new ApiError("腾讯云 COS 鉴权响应缺少 Region。")
  }

  if (!normalizeText(value.Sts?.AccessKeyId)
    || !normalizeText(value.Sts?.AccessKeySecret)
    || !normalizeText(value.Sts?.SecurityToken)) {
    throw new ApiError("腾讯云 COS 鉴权响应缺少临时凭证。")
  }
}

function extractTencentCosStsRecord(payload: unknown): Record<string, unknown> {
  const record = asRecord(payload)

  if (!record) {
    return {}
  }

  if (isTencentCosStsRecord(record)) {
    return record
  }

  for (const key of ["data", "Data", "result", "Result"]) {
    const nested = asRecord(record[key])

    if (nested && isTencentCosStsRecord(nested)) {
      return nested
    }
  }

  return record
}

function normalizeTencentCosStsResponse(record: Record<string, unknown>): TencentCosStsResponse {
  const sts = asRecord(record.Sts)
    ?? asRecord(record.sts)
    ?? asRecord(record.Credentials)
    ?? asRecord(record.credentials)

  return {
    ...record,
    BucketName: normalizeText(record.BucketName ?? record.bucketName ?? record.bucket),
    Domain: normalizeText(record.Domain ?? record.domain),
    EndPoint: normalizeText(record.EndPoint ?? record.Endpoint ?? record.endpoint ?? record.endPoint),
    Region: normalizeText(record.Region ?? record.region),
    Sts: sts
      ? {
          ...sts,
          AccessKeyId: normalizeText(sts.AccessKeyId ?? sts.accessKeyId ?? sts.TmpSecretId ?? sts.tmpSecretId),
          AccessKeySecret: normalizeText(sts.AccessKeySecret ?? sts.accessKeySecret ?? sts.TmpSecretKey ?? sts.tmpSecretKey),
          Expiration: normalizeText(sts.Expiration ?? sts.expiration ?? sts.ExpiredTime ?? sts.expiredTime),
          SecurityToken: normalizeText(sts.SecurityToken ?? sts.securityToken ?? sts.Token ?? sts.token ?? sts.SessionToken),
        }
      : undefined,
  }
}

function isTencentCosStsRecord(record: Record<string, unknown>) {
  return Boolean(
    record.BucketName
    || record.bucketName
    || record.Region
    || record.region
    || record.Sts
    || record.sts
    || record.Credentials
    || record.credentials,
  )
}

function parseExpirationTime(value: unknown) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return Number.NaN
  }

  const timestamp = Date.parse(normalized)

  if (Number.isFinite(timestamp)) {
    return timestamp
  }

  const seconds = Number(normalized)

  return Number.isFinite(seconds) ? seconds * 1000 : Number.NaN
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}
