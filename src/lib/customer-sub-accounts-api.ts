import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"

export type CreateCustomerSubAccountPayload = {
  Account: string
  Password: string
  Phone: string
  Name: string
  CustomerUuid: string
}

export type CreateCustomerSubAccountResult = {
  Id?: number
  Uuid?: string
  [property: string]: unknown
}

export type CustomerSubAccountLocalRecord = {
  id: string
  username: string
  account: string
  password: string
  phone: string
}

const CUSTOMER_SUB_ACCOUNT_CREATE_API_URL = buildApiUrl(API_PATHS.customerSubAccountCreate)
const CUSTOMER_SUB_ACCOUNT_CREATE_ERROR_MESSAGE = "子账号创建失败，请稍后重试。"
const CUSTOMER_SUB_ACCOUNT_STORAGE_KEY = "customer-sub-accounts:local-records"

export async function createCustomerSubAccount(payload: CreateCustomerSubAccountPayload): Promise<CreateCustomerSubAccountResult> {
  const normalizedPayload = {
    Account: getRequiredString(payload.Account, "Account"),
    Password: getRequiredString(payload.Password, "Password"),
    Phone: getRequiredString(payload.Phone, "Phone"),
    Name: getRequiredString(payload.Name, "Name"),
    CustomerUuid: getRequiredString(payload.CustomerUuid, "CustomerUuid"),
  }

  const response = await fetch(CUSTOMER_SUB_ACCOUNT_CREATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, CUSTOMER_SUB_ACCOUNT_CREATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, CUSTOMER_SUB_ACCOUNT_CREATE_ERROR_MESSAGE)

  return extractCreateResult(responseBody)
}

export function readCustomerSubAccountLocalRecords(customerUuid: string) {
  const normalizedCustomerUuid = normalizeText(customerUuid)

  if (!normalizedCustomerUuid || typeof window === "undefined") {
    return []
  }

  const storage = readStorageRecord()
  const records = storage[normalizedCustomerUuid]

  return Array.isArray(records)
    ? records.filter(isCustomerSubAccountLocalRecord)
    : []
}

export function appendCustomerSubAccountLocalRecord(customerUuid: string, record: CustomerSubAccountLocalRecord) {
  const normalizedCustomerUuid = normalizeText(customerUuid)

  if (!normalizedCustomerUuid || typeof window === "undefined" || !isCustomerSubAccountLocalRecord(record)) {
    return
  }

  const storage = readStorageRecord()
  const currentRecords = Array.isArray(storage[normalizedCustomerUuid])
    ? storage[normalizedCustomerUuid].filter(isCustomerSubAccountLocalRecord)
    : []

  const dedupedRecords = currentRecords.filter(item => item.account !== record.account)

  storage[normalizedCustomerUuid] = [record, ...dedupedRecords]
  window.sessionStorage.setItem(CUSTOMER_SUB_ACCOUNT_STORAGE_KEY, JSON.stringify(storage))
}

function readStorageRecord() {
  if (typeof window === "undefined") {
    return {} as Record<string, CustomerSubAccountLocalRecord[]>
  }

  const rawValue = window.sessionStorage.getItem(CUSTOMER_SUB_ACCOUNT_STORAGE_KEY)

  if (!rawValue) {
    return {} as Record<string, CustomerSubAccountLocalRecord[]>
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    return isStorageRecord(parsed)
      ? parsed
      : {} as Record<string, CustomerSubAccountLocalRecord[]>
  } catch {
    return {} as Record<string, CustomerSubAccountLocalRecord[]>
  }
}

function extractCreateResult(payload: unknown): CreateCustomerSubAccountResult {
  const record = asRecord(payload)

  if (!record) {
    return {}
  }

  const nestedRecord = asRecord(record.data)

  if (nestedRecord) {
    return nestedRecord as CreateCustomerSubAccountResult
  }

  return record as CreateCustomerSubAccountResult
}

function getRequiredString(value: unknown, field: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  throw new ApiError(`请求参数校验失败：${field} 不能为空。`)
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}

function isStorageRecord(value: unknown): value is Record<string, CustomerSubAccountLocalRecord[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every(records =>
    Array.isArray(records) && records.every(isCustomerSubAccountLocalRecord),
  )
}

function isCustomerSubAccountLocalRecord(value: unknown): value is CustomerSubAccountLocalRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>

  return ["id", "username", "account", "password", "phone"].every(key =>
    typeof record[key] === "string",
  )
}
