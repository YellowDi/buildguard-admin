import { assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

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

    if (!response.ok) {
      const httpError = createHttpError(response, responseBody, CURRENT_USER_INFO_ERROR_MESSAGE)

      if (response.status === 404 && path !== CURRENT_USER_INFO_API_PATHS[CURRENT_USER_INFO_API_PATHS.length - 1]) {
        lastError = httpError
        continue
      }

      throw httpError
    }

    assertApiSuccess(responseBody, CURRENT_USER_INFO_ERROR_MESSAGE)
    return extractCurrentUserRecord(responseBody)
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
