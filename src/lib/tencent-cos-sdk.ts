import COS from "cos-js-sdk-v5"

import { ApiError, getApiErrorMessage } from "@/lib/api-errors"
import { fetchTencentCosSts, type TencentCosStsResponse } from "@/lib/tencent-cos-api"

type TencentCosClientOptions = Omit<COS.COSOptions, "SecretId" | "SecretKey" | "SecurityToken" | "XCosSecurityToken" | "getAuthorization">
type TencentCosAuthorizationWithToken = {
  Authorization: string
  SecurityToken: string
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
const DEFAULT_SIGN_EXPIRES_SECONDS = 900

export function createTencentCosClient(options: TencentCosClientOptions = {}) {
  return new COS({
    ...options,
    getAuthorization(signOptions, callback) {
      fetchTencentCosAuthorization(signOptions)
        .then(callback)
        .catch((error: unknown) => {
          console.error(getApiErrorMessage(error, TENCENT_COS_AUTH_ERROR_MESSAGE))
          callback({
            Authorization: "",
            SecurityToken: "",
          } as COS.GetAuthorizationCallbackParams)
        })
    },
  })
}

export async function fetchTencentCosBucketConfig(): Promise<TencentCosBucketConfig> {
  return extractBucketConfig(await fetchTencentCosSts({ forceRefresh: true }))
}

export async function uploadTencentCosFile(payload: UploadTencentCosFilePayload): Promise<UploadTencentCosFileResult> {
  const config = payload.bucket && payload.region
    ? {
        Bucket: payload.bucket,
        Region: payload.region,
      }
    : await fetchTencentCosBucketConfig()
  const key = normalizeObjectKey(payload.key || createDefaultObjectKey(payload.file))
  const cos = createTencentCosClient()
  const result = await cos.uploadFile({
    Bucket: config.Bucket,
    Region: config.Region,
    Key: key,
    Body: payload.file,
    Headers: payload.headers,
    ContentType: payload.contentType || getFileContentType(payload.file),
    SliceSize: payload.sliceSize,
    onProgress: payload.onProgress,
  })

  return {
    ...result,
    key,
    url: buildObjectUrl(result.Location, key, config),
  }
}

async function fetchTencentCosAuthorization(options: COS.GetAuthorizationOptions): Promise<COS.GetAuthorizationCallbackParams> {
  const sts = await fetchTencentCosSts({ forceRefresh: true })
  const credentials = sts.Sts
  const secretId = normalizeText(credentials?.AccessKeyId)
  const secretKey = normalizeText(credentials?.AccessKeySecret)
  const securityToken = normalizeText(credentials?.SecurityToken)

  if (!secretId || !secretKey || !securityToken) {
    throw new ApiError("腾讯云 COS 鉴权响应缺少临时凭证。")
  }

  const authorization: TencentCosAuthorizationWithToken = {
    Authorization: COS.getAuthorization({
      SecretId: secretId,
      SecretKey: secretKey,
      Bucket: options.Bucket,
      Region: options.Region,
      Method: options.Method,
      Pathname: options.Pathname,
      Key: options.Key,
      Query: options.Query,
      Headers: options.Headers,
      Expires: DEFAULT_SIGN_EXPIRES_SECONDS,
      SystemClockOffset: options.SystemClockOffset,
    }),
    SecurityToken: securityToken,
  }

  return authorization as COS.GetAuthorizationCallbackParams
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
    return `${domain.replace(/\/+$/, "")}/${encodeObjectKey(key)}`
  }

  return `https://${config.Bucket}.cos.${config.Region}.myqcloud.com/${encodeObjectKey(key)}`
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
