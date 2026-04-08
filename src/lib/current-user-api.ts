import {
  ApiError,
  assertApiSuccess,
  createHttpError,
  extractResponseCode,
  extractResponseMessage,
  readResponseBody,
} from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"
import { notifyAuthExpired } from "@/lib/auth"

export type CurrentUserRole = {
  RoleId?: number
  RoleName?: string
  RoleUuid?: string
}

export type CurrentUserEmployeeInfo = {
  DepartmentName?: string
  Name?: string
  Phone?: string
  Position?: string
  Roles?: CurrentUserRole[]
}

export type CurrentUserCustomerInfo = {
  CorpName?: string
  Name?: string
  Phone?: string
}

export type CurrentUserInfoResult = {
  Uuid?: string
  Id?: number
  Type?: number
  EmployeeInfo?: CurrentUserEmployeeInfo
  CustomerInfo?: CurrentUserCustomerInfo
}

const CURRENT_USER_INFO_ERROR_MESSAGE = "当前用户信息加载失败，请稍后重试。"
const CURRENT_USER_UNAUTHORIZED_MESSAGE = "登录状态已失效，请重新登录。"
const CURRENT_USER_INFO_API_PATHS = [
  API_PATHS.currentUserInfo,
  "/bqi/user/info",
] as const

export async function fetchCurrentUserInfo(): Promise<CurrentUserInfoResult> {
  let lastError: Error | null = null

  for (const path of CURRENT_USER_INFO_API_PATHS) {
    const response = await fetch(buildApiUrl(path), {
      method: "GET",
      headers: buildApiHeaders(),
    })
    const responseBody = await readResponseBody(response)
    const headerCode = extractResponseCode(response.headers) ?? ""
    const headerMessage = extractResponseMessage(response.headers) ?? ""

    if (!response.ok) {
      const httpError = createHttpError(response, responseBody, CURRENT_USER_INFO_ERROR_MESSAGE)

      if (response.status === 404 && path !== CURRENT_USER_INFO_API_PATHS[CURRENT_USER_INFO_API_PATHS.length - 1]) {
        lastError = httpError
        continue
      }

      throw httpError
    }

    if (headerCode && headerCode !== "0" && headerCode !== "200") {
      const authExpired = isAuthExpiredHeader(headerCode, headerMessage)
      const message = headerMessage || CURRENT_USER_INFO_ERROR_MESSAGE

      if (authExpired) {
        notifyAuthExpired()
      }

      throw new ApiError(message, {
        status: authExpired ? 401 : undefined,
        code: headerCode,
      })
    }

    assertApiSuccess(responseBody, CURRENT_USER_INFO_ERROR_MESSAGE)
    const profile = extractCurrentUserRecord(responseBody)

    if (!hasCurrentUserIdentity(profile)) {
      notifyAuthExpired()
      throw new ApiError(CURRENT_USER_UNAUTHORIZED_MESSAGE, {
        status: 401,
        code: "401",
      })
    }

    return profile
  }

  throw lastError ?? new Error(CURRENT_USER_INFO_ERROR_MESSAGE)
}

function extractCurrentUserRecord(payload: unknown): CurrentUserInfoResult {
  const record = asRecord(payload)

  if (!record) {
    return {}
  }

  if ("Uuid" in record || "EmployeeInfo" in record || "CustomerInfo" in record) {
    return record as CurrentUserInfoResult
  }

  for (const key of ["data", "Data", "result", "Result"]) {
    const nested = asRecord(record[key])

    if (nested && ("Uuid" in nested || "EmployeeInfo" in nested || "CustomerInfo" in nested)) {
      return nested as CurrentUserInfoResult
    }
  }

  return {}
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}

function hasCurrentUserIdentity(profile: CurrentUserInfoResult) {
  if (typeof profile.Id === "number" && Number.isFinite(profile.Id)) {
    return true
  }

  if (typeof profile.Type === "number" && Number.isFinite(profile.Type)) {
    return true
  }

  if (profile.Uuid?.trim()) {
    return true
  }

  if (profile.EmployeeInfo?.Name?.trim() || profile.EmployeeInfo?.Phone?.trim() || profile.EmployeeInfo?.DepartmentName?.trim()) {
    return true
  }

  if (profile.CustomerInfo?.Name?.trim() || profile.CustomerInfo?.Phone?.trim() || profile.CustomerInfo?.CorpName?.trim()) {
    return true
  }

  return false
}

function isAuthExpiredHeader(code: string, message: string) {
  if (code === "401" || code === "403" || code === "1001") {
    return true
  }

  return /(鉴权|身份信息|未登录|登录失效|token|请先登录|请先登陆)/i.test(message)
}
