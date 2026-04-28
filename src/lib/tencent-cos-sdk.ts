import COS from "cos-js-sdk-v5"

import { ApiError, getApiErrorMessage } from "@/lib/api-errors"
import { fetchTencentCosSts, type TencentCosStsResponse } from "@/lib/tencent-cos-api"

type TencentCosClientOptions = Omit<COS.COSOptions, "SecretId" | "SecretKey" | "SecurityToken" | "XCosSecurityToken" | "getAuthorization">
type TencentCosStsPayload = TencentCosStsResponse & {
  expiredTime: number
  startTime: number
}

export type TencentCosBucketConfig = {
  Bucket: string
  Region: string
  Domain?: string
  EndPoint?: string
}

export type UploadTencentCosFilePayload = {
  file: File | Blob | ArrayBuffer
  key?: string
  bucket?: string
  region?: string
  contentType?: string
  headers?: Record<string, unknown>
  sliceSize?: number
  onProgress?: COS.onProgress
}

export type UploadTencentCosFileResult = COS.UploadFileResult & {
  key: string
  url: string
}

const TENCENT_COS_AUTH_ERROR_MESSAGE = "腾讯云 COS 签名生成失败，请稍后重试。"
const DEFAULT_COS_STS_EXPIRES_SECONDS = 1800
const DEFAULT_COS_SLICE_SIZE = 1024 * 1024

export function createTencentCosClient(stsPayload: TencentCosStsPayload, options: TencentCosClientOptions = {}) {
  return new COS({
    ...options,
    getAuthorization(_, callback) {
      try {
        callback({
          TmpSecretId: normalizeText(stsPayload.Sts?.AccessKeyId),
          TmpSecretKey: normalizeText(stsPayload.Sts?.AccessKeySecret),
          SecurityToken: normalizeText(stsPayload.Sts?.SecurityToken),
          StartTime: stsPayload.startTime,
          ExpiredTime: stsPayload.expiredTime,
        })
      } catch (error) {
        console.error(getApiErrorMessage(error, TENCENT_COS_AUTH_ERROR_MESSAGE))
        callback({
          TmpSecretId: "",
          TmpSecretKey: "",
          SecurityToken: "",
          StartTime: Math.floor(Date.now() / 1000),
          ExpiredTime: Math.floor(Date.now() / 1000),
        })
      }
    },
  })
}

export async function fetchTencentCosBucketConfig(): Promise<TencentCosBucketConfig> {
  return extractBucketConfig(await fetchTencentCosSts({ forceRefresh: true }))
}

export async function uploadTencentCosFile(payload: UploadTencentCosFilePayload): Promise<UploadTencentCosFileResult> {
  const stsPayload = await getFreshTencentCosStsPayload()
  const stsConfig = extractBucketConfig(stsPayload)
  const config = payload.bucket && payload.region
    ? {
        Bucket: payload.bucket,
        Region: payload.region,
        Domain: stsConfig.Domain,
        EndPoint: stsConfig.EndPoint,
      }
    : stsConfig
  const key = normalizeObjectKey(payload.key || createDefaultObjectKey(payload.file))
  const cos = createTencentCosClient(stsPayload)
  const uploadBody = await createUploadBody(payload.file)
  const result = await cos.uploadFile({
    Bucket: config.Bucket,
    Region: config.Region,
    Key: key,
    Body: uploadBody.body,
    ContentLength: uploadBody.contentLength,
    Headers: payload.headers,
    ContentType: payload.contentType || getFileContentType(payload.file),
    SliceSize: payload.sliceSize ?? DEFAULT_COS_SLICE_SIZE,
    onProgress: payload.onProgress,
  })

  return {
    ...result,
    key,
    url: buildObjectUrl(result.Location, key, config),
  }
}

async function getFreshTencentCosStsPayload(): Promise<TencentCosStsPayload> {
  const sts = await fetchTencentCosSts({ forceRefresh: true })
  const credentials = sts.Sts
  const secretId = normalizeText(credentials?.AccessKeyId)
  const secretKey = normalizeText(credentials?.AccessKeySecret)
  const securityToken = normalizeText(credentials?.SecurityToken)

  if (!secretId || !secretKey || !securityToken) {
    throw new ApiError("腾讯云 COS 鉴权响应缺少临时凭证。")
  }

  const { expiredTime, startTime } = parseCosStsTime(sts)

  return {
    ...sts,
    expiredTime,
    startTime,
  }
}

function extractBucketConfig(sts: TencentCosStsResponse): TencentCosBucketConfig {
  const bucket = normalizeText(sts.BucketName)
  const region = normalizeText(sts.Region)

  if (!bucket) {
    throw new ApiError("腾讯云 COS 鉴权响应缺少 BucketName。")
  }

  if (!region) {
    throw new ApiError("腾讯云 COS 鉴权响应缺少 Region。")
  }

  return {
    Bucket: bucket,
    Region: region,
    Domain: normalizeText(sts.Domain) || undefined,
    EndPoint: normalizeText(sts.EndPoint) || undefined,
  }
}

function buildObjectUrl(location: string | undefined, key: string, config: TencentCosBucketConfig) {
  const normalizedLocation = normalizeText(location)

  if (normalizedLocation) {
    return /^https?:\/\//i.test(normalizedLocation)
      ? normalizedLocation
      : `https://${normalizedLocation.replace(/^\/+/, "")}`
  }

  const domain = normalizeText(config.Domain) || normalizeText(config.EndPoint)

  if (domain) {
    const normalizedDomain = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`

    return `${normalizedDomain.replace(/\/+$/, "")}/${encodeObjectKey(key)}`
  }

  return `https://${config.Bucket}.cos.${config.Region}.myqcloud.com/${encodeObjectKey(key)}`
}

async function createUploadBody(file: UploadTencentCosFilePayload["file"]) {
  if (file instanceof ArrayBuffer) {
    return {
      body: file,
      contentLength: file.byteLength,
    }
  }

  if (typeof Blob !== "undefined" && file instanceof Blob) {
    return {
      body: file,
      contentLength: file.size,
    }
  }

  return {
    body: file,
    contentLength: undefined,
  }
}

function parseCosStsTime(stsPayload: TencentCosStsResponse) {
  const expiration = normalizeText(stsPayload.Sts?.Expiration)
  const parsedExpirationTime = Date.parse(expiration)
  const numericExpirationTime = Number(expiration)
  const expiredTime = Number.isFinite(parsedExpirationTime) && parsedExpirationTime > 0
    ? Math.floor(parsedExpirationTime / 1000)
    : Number.isFinite(numericExpirationTime) && numericExpirationTime > 0
      ? Math.floor(numericExpirationTime > 10_000_000_000 ? numericExpirationTime / 1000 : numericExpirationTime)
      : Math.floor(Date.now() / 1000) + DEFAULT_COS_STS_EXPIRES_SECONDS

  return {
    expiredTime,
    startTime: Math.max(0, Math.floor(Date.now() / 1000) - 60),
  }
}

function createDefaultObjectKey(file: UploadTencentCosFilePayload["file"]) {
  const extension = getFileExtension(file)
  const random = Math.random().toString(36).slice(2, 10)
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "")

  return `uploads/${timestamp}-${random}${extension}`
}

function getFileExtension(file: UploadTencentCosFilePayload["file"]) {
  if (typeof File === "undefined" || !(file instanceof File)) {
    return ""
  }

  const fileName = file.name.trim()
  const lastDotIndex = fileName.lastIndexOf(".")

  return lastDotIndex > -1 ? fileName.slice(lastDotIndex).toLowerCase() : ""
}

function getFileContentType(file: UploadTencentCosFilePayload["file"]) {
  return typeof Blob !== "undefined" && file instanceof Blob && file.type ? file.type : undefined
}

function normalizeObjectKey(value: string) {
  const key = value.trim().replace(/^\/+/, "")

  if (!key) {
    throw new ApiError("腾讯云 COS 对象 Key 不能为空。")
  }

  return key
}

function encodeObjectKey(key: string) {
  return key.split("/").map(part => encodeURIComponent(part)).join("/")
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}
