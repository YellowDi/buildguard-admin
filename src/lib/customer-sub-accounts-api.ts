import { ApiError, assertApiSuccess, createHttpError, readResponseBody } from "@/lib/api-errors"
import { API_PATHS, buildApiHeaders, buildApiUrl } from "@/lib/api"
import { isMd5Hash, md5 } from "@/lib/md5"

type CustomerSubAccountsListEnvelope = {
  Total?: number
  List?: unknown
  data?: unknown
  list?: unknown
  rows?: unknown
}

export type ListCustomerSubAccountsPayload = {
  CustomerUuid?: string
  PageNum?: number
  PageSize?: number
  [property: string]: unknown
}

export type CustomerSubAccountListItem = {
  Account?: string
  IsMain?: number
  Name?: string
  Status?: number
  Username?: string
  Uuid?: string
  [property: string]: unknown
}

export type CustomerSubAccountsListResult = {
  list: CustomerSubAccountListItem[]
  total: number
}

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
  phone: string
}

const CUSTOMER_SUB_ACCOUNTS_LIST_API_URL = buildApiUrl(API_PATHS.customerSubAccountsList)
const CUSTOMER_SUB_ACCOUNT_CREATE_API_URL = buildApiUrl(API_PATHS.customerSubAccountCreate)
const CUSTOMER_SUB_ACCOUNT_UPDATE_API_URL = buildApiUrl(API_PATHS.customerSubAccountUpdate)
const CUSTOMER_SUB_ACCOUNT_PASSWORD_RESET_OLD_API_URL = buildApiUrl(API_PATHS.customerSubAccountPasswordResetOld)
const CUSTOMER_SUB_ACCOUNTS_LOAD_ERROR_MESSAGE = "子账号列表加载失败，请稍后重试。"
const CUSTOMER_SUB_ACCOUNT_CREATE_ERROR_MESSAGE = "子账号创建失败，请稍后重试。"
const CUSTOMER_SUB_ACCOUNT_UPDATE_ERROR_MESSAGE = "子账号编辑失败，请稍后重试。"
const CUSTOMER_SUB_ACCOUNT_PASSWORD_RESET_OLD_ERROR_MESSAGE = "子账号密码重置失败，请稍后重试。"
const CUSTOMER_SUB_ACCOUNT_STORAGE_KEY = "customer-sub-accounts:local-records"

export async function fetchCustomerSubAccounts(payload: ListCustomerSubAccountsPayload = {}): Promise<CustomerSubAccountsListResult> {
  const normalizedPayload = {
    CustomerUuid: getRequiredString(payload.CustomerUuid, "CustomerUuid"),
    PageNum: getOptionalNumber(payload.PageNum, "PageNum") ?? 1,
    PageSize: getOptionalNumber(payload.PageSize, "PageSize") ?? 10,
  }

  const response = await fetch(CUSTOMER_SUB_ACCOUNTS_LIST_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })
  const responseBody = await readResponseBody(response) as CustomerSubAccountsListEnvelope | unknown[]

  if (!response.ok) {
    throw createHttpError(response, responseBody, CUSTOMER_SUB_ACCOUNTS_LOAD_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, CUSTOMER_SUB_ACCOUNTS_LOAD_ERROR_MESSAGE)

  const list = extractList(responseBody)

  return {
    list: list.map(item => normalizeCustomerSubAccountListItem(item)),
    total: extractTotal(responseBody, list.length),
  }
}

export async function createCustomerSubAccount(payload: CreateCustomerSubAccountPayload): Promise<CreateCustomerSubAccountResult> {
  const normalizedPayload = {
    Account: getRequiredString(payload.Account, "Account"),
    Password: normalizePasswordForApi(payload.Password, "Password"),
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

export type ResetCustomerSubAccountPasswordOldPayload = {
  /**
   * 子账号 UUID
   */
  Uuid: string
  /**
   * 新密码
   */
  Password: string
}

export async function resetCustomerSubAccountPassword(payload: ResetCustomerSubAccountPasswordOldPayload): Promise<void> {
  const normalizedPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
    Password: normalizePasswordForApi(payload.Password, "Password"),
  }

  const response = await fetch(CUSTOMER_SUB_ACCOUNT_PASSWORD_RESET_OLD_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })

  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, CUSTOMER_SUB_ACCOUNT_PASSWORD_RESET_OLD_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, CUSTOMER_SUB_ACCOUNT_PASSWORD_RESET_OLD_ERROR_MESSAGE)
}

export type UpdateCustomerSubAccountPayload = {
  /**
   * 账号
   */
  Account?: string
  /**
   * 名称
   */
  Name?: string
  /**
   * 账号UUID
   */
  Uuid?: string
  [property: string]: unknown
}

export async function updateCustomerSubAccount(payload: UpdateCustomerSubAccountPayload): Promise<void> {
  const normalizedPayload: UpdateCustomerSubAccountPayload = {
    Uuid: getRequiredString(payload.Uuid, "Uuid"),
  }
  const account = getOptionalString(payload.Account)
  const name = getOptionalString(payload.Name)

  if (!account && !name) {
    throw new ApiError("请求参数校验失败：Account 和 Name 至少填写一项。")
  }

  if (account) {
    normalizedPayload.Account = account
  }

  if (name) {
    normalizedPayload.Name = name
  }

  const response = await fetch(CUSTOMER_SUB_ACCOUNT_UPDATE_API_URL, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(normalizedPayload),
  })

  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw createHttpError(response, responseBody, CUSTOMER_SUB_ACCOUNT_UPDATE_ERROR_MESSAGE)
  }

  assertApiSuccess(responseBody, CUSTOMER_SUB_ACCOUNT_UPDATE_ERROR_MESSAGE)
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
    if (!isStorageRecord(parsed)) {
      return {} as Record<string, CustomerSubAccountLocalRecord[]>
    }

    const sanitizedStorage = sanitizeStorageRecord(parsed)

    if (hasLegacyPasswordField(parsed)) {
      window.sessionStorage.setItem(CUSTOMER_SUB_ACCOUNT_STORAGE_KEY, JSON.stringify(sanitizedStorage))
    }

    return sanitizedStorage
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

function extractList(payload: CustomerSubAccountsListEnvelope | unknown[]) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.List)) {
    return payload.List
  }

  const nested = asRecord(payload.data)

  if (nested) {
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

function extractTotal(payload: CustomerSubAccountsListEnvelope | unknown[], fallback: number) {
  if (Array.isArray(payload)) {
    return payload.length
  }

  if (typeof payload.Total === "number") {
    return payload.Total
  }

  const nested = asRecord(payload.data)

  if (nested && typeof nested.Total === "number") {
    return nested.Total
  }

  return fallback
}

function normalizeCustomerSubAccountListItem(value: unknown): CustomerSubAccountListItem {
  return asRecord(value) as CustomerSubAccountListItem ?? {}
}

function getOptionalNumber(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return undefined
  }

  const parsed = Number(value)

  if (Number.isFinite(parsed)) {
    return parsed
  }

  throw new ApiError(`请求参数校验失败：${field} 必须是有效数字。`)
}

function getRequiredString(value: unknown, field: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  throw new ApiError(`请求参数校验失败：${field} 不能为空。`)
}

function getOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizePasswordForApi(value: unknown, field: string) {
  const normalizedValue = getRequiredString(value, field)

  return isMd5Hash(normalizedValue) ? normalizedValue.toLowerCase() : md5(normalizedValue)
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

  return ["id", "username", "account", "phone"].every(key =>
    typeof record[key] === "string",
  )
}

function sanitizeStorageRecord(value: Record<string, CustomerSubAccountLocalRecord[]>) {
  const sanitized: Record<string, CustomerSubAccountLocalRecord[]> = {}

  for (const [customerUuid, records] of Object.entries(value)) {
    sanitized[customerUuid] = records.filter(isCustomerSubAccountLocalRecord).map(record => ({
      id: record.id,
      username: record.username,
      account: record.account,
      phone: record.phone,
    }))
  }

  return sanitized
}

function hasLegacyPasswordField(value: Record<string, CustomerSubAccountLocalRecord[]>) {
  return Object.values(value).some(records =>
    records.some(record => "password" in record),
  )
}
