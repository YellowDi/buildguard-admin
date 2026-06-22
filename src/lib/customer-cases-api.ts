import mockCustomerCases from "@/mocks/customer-cases.json"

export type CustomerCaseModule = {
  id: string
  projectProgress: string
  projectStage: string
  sitePhotoUrl: string
  progressDescription: string
  craftInfo: string
  sortOrder: number
}

export type CustomerCaseRecord = {
  id: string
  title: string
  customerUuid: string
  customerName: string
  body: string
  modules: CustomerCaseModule[]
  isPublished: boolean
  updatedAt: string
}

export type CustomerCaseListPayload = {
  keyword?: string
  isPublished?: boolean | null
}

export type SaveCustomerCasePayload = {
  title: string
  customerUuid?: string
  customerName?: string
  body: string
  modules: CustomerCaseModule[]
  isPublished: boolean
}

export type UpdateCustomerCasePayload = SaveCustomerCasePayload & {
  id: string
}

let customerCaseStore: CustomerCaseRecord[] | null = null

export async function fetchCustomerCases(payload: CustomerCaseListPayload = {}) {
  const keyword = normalizeText(payload.keyword).toLowerCase()
  const list = getCustomerCaseStore()
    .filter((item) => {
      if (typeof payload.isPublished === "boolean" && item.isPublished !== payload.isPublished) {
        return false
      }

      if (!keyword) {
        return true
      }

      return buildSearchText(item).includes(keyword)
    })
    .sort(compareCustomerCases)
    .map(cloneCustomerCase)

  return {
    list,
    total: list.length,
  }
}

export async function createCustomerCase(payload: SaveCustomerCasePayload) {
  const nextRecord = normalizeCustomerCaseRecord({
    id: createId("case"),
    updatedAt: getNowText(),
    ...payload,
  })

  getCustomerCaseStore().unshift(nextRecord)
  return cloneCustomerCase(nextRecord)
}

export async function updateCustomerCase(payload: UpdateCustomerCasePayload) {
  const id = normalizeText(payload.id)
  const store = getCustomerCaseStore()
  const index = store.findIndex(item => item.id === id)

  if (index < 0) {
    throw new Error("客户案例不存在")
  }

  const nextRecord = normalizeCustomerCaseRecord({
    ...payload,
    id,
    updatedAt: getNowText(),
  })

  store.splice(index, 1, nextRecord)
  return cloneCustomerCase(nextRecord)
}

export async function deleteCustomerCase(id: string) {
  const normalizedId = normalizeText(id)
  const store = getCustomerCaseStore()
  const index = store.findIndex(item => item.id === normalizedId)

  if (index < 0) {
    throw new Error("客户案例不存在")
  }

  store.splice(index, 1)
}

export async function updateCustomerCasePublished(id: string, isPublished: boolean) {
  const normalizedId = normalizeText(id)
  const record = getCustomerCaseStore().find(item => item.id === normalizedId)

  if (!record) {
    throw new Error("客户案例不存在")
  }

  record.isPublished = isPublished
  record.updatedAt = getNowText()
  return cloneCustomerCase(record)
}

function getCustomerCaseStore() {
  if (!customerCaseStore) {
    customerCaseStore = Array.isArray(mockCustomerCases)
      ? mockCustomerCases.map(normalizeCustomerCaseRecord)
      : []
  }

  return customerCaseStore
}

function normalizeCustomerCaseRecord(value: unknown): CustomerCaseRecord {
  const source = isRecord(value) ? value : {}
  const id = normalizeText(source.id)
  const title = normalizeText(source.title)

  if (!title) {
    throw new TypeError("title is required")
  }

  return {
    id: id || createId("case"),
    title,
    customerUuid: normalizeText(source.customerUuid),
    customerName: normalizeText(source.customerName),
    body: normalizeText(source.body),
    modules: normalizeModules(source.modules),
    isPublished: Boolean(source.isPublished),
    updatedAt: normalizeText(source.updatedAt, getNowText()),
  }
}

function normalizeModules(value: unknown): CustomerCaseModule[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index) => {
      const source = isRecord(item) ? item : {}
      return {
        id: normalizeText(source.id) || createId("module"),
        projectProgress: normalizeText(source.projectProgress),
        projectStage: normalizeText(source.projectStage),
        sitePhotoUrl: normalizeText(source.sitePhotoUrl),
        progressDescription: normalizeText(source.progressDescription),
        craftInfo: normalizeText(source.craftInfo),
        sortOrder: normalizeNumber(source.sortOrder) ?? (index + 1) * 10,
      }
    })
    .sort(compareModules)
    .map((item, index) => ({
      ...item,
      sortOrder: (index + 1) * 10,
    }))
}

function compareCustomerCases(left: CustomerCaseRecord, right: CustomerCaseRecord) {
  return right.updatedAt.localeCompare(left.updatedAt)
    || left.title.localeCompare(right.title, "zh-CN")
}

function compareModules(left: CustomerCaseModule, right: CustomerCaseModule) {
  return left.sortOrder - right.sortOrder
}

function buildSearchText(record: CustomerCaseRecord) {
  return [
    record.title,
    record.customerName,
    stripHtml(record.body),
    record.modules.map(buildModuleSearchText).join(" "),
  ].join(" ").toLowerCase()
}

function buildModuleSearchText(module: CustomerCaseModule) {
  return [
    module.projectProgress,
    module.projectStage,
    module.progressDescription,
    module.craftInfo,
  ].join(" ")
}

function cloneCustomerCase(record: CustomerCaseRecord): CustomerCaseRecord {
  return {
    ...record,
    modules: record.modules.map(module => ({ ...module })),
  }
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function getNowText() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("-")
    + " "
    + [pad(now.getHours()), pad(now.getMinutes())].join(":")
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function normalizeText(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value.trim() || fallback
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function normalizeNumber(value: unknown) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.trim())
      : NaN

  return Number.isFinite(parsed) ? parsed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}
