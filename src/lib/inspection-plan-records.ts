import { fetchInspectionPlans } from "@/lib/inspection-plans-api"

export type InspectionPlanRecord = {
  id: string
  uuid: string
  code: string
  contractCode: string
  planName: string
  serviceName: string
  customerName: string
  cycle: string
  workOrderDuration: string
  firstExecutionAt: string
  latestExecutionAt: string
  latestOrderNo: string
  nextExecutionAt: string
  creator: string
  createdAt: string
  planStatus: string
  enableStatus: string
}

export async function listInspectionPlanRecords() {
  const pageSize = 200
  const allItems: unknown[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchInspectionPlans({
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && allItems.length >= total)) {
      break
    }

    pageNum += 1
  }

  return allItems.map(normalizeInspectionPlanRecord)
}

function normalizeInspectionPlanRecord(value: unknown): InspectionPlanRecord {
  const record = asRecord(value)
  const serviceName = getString(record?.ServiceName ?? record?.serviceName, "-")
  const duration = getNumber(record?.Duration)
  const workOrderDuration = getNumber(record?.WorkOrderDuration ?? record?.workOrderDuration)
  const fallbackId = getString(record?.id, "-")

  return {
    id: getString(record?.Uuid ?? record?.Id ?? record?.Code, fallbackId),
    uuid: getString(record?.Uuid, "-"),
    code: getString(record?.Code ?? record?.code, fallbackId),
    contractCode: getString(record?.ContractCode ?? record?.contractCode, "-"),
    planName: getString(record?.PlanName ?? record?.Name ?? record?.planName, serviceName === "-" ? "检测计划" : `${serviceName}计划`),
    serviceName,
    customerName: getString(record?.CorpName ?? record?.CustomerName ?? record?.customerName, "-"),
    cycle: buildCycleLabel(duration, getString(record?.cycle)),
    workOrderDuration: workOrderDuration === undefined ? "-" : `${workOrderDuration}天`,
    firstExecutionAt: getString(record?.FirstTime ?? record?.firstExecutionAt, "-"),
    latestExecutionAt: getString(record?.LastestTime ?? record?.latestExecutionAt, "-"),
    latestOrderNo: getString(record?.LastestOrderNo ?? record?.latestOrderNo, "-"),
    nextExecutionAt: getString(record?.NextTime ?? record?.NextExecutionAt, "-"),
    creator: getString(record?.Creator ?? record?.OwnerName ?? record?.PrincipalName ?? record?.CreatorName ?? record?.owner, "-"),
    createdAt: getString(record?.CreatedAt ?? record?.createdAt, "-"),
    planStatus: normalizePlanStatus(record?.PlanStatus ?? record?.status),
    enableStatus: normalizeEnableStatus(record?.Status ?? record?.enableStatus),
  }
}

function buildCycleLabel(duration: number | undefined, fallback = "") {
  if (duration) {
    return `${duration}天`
  }

  return fallback || "-"
}

function normalizePlanStatus(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized || "-"
  }

  if (typeof value === "number") {
    if (value === 1) {
      return "进行中"
    }

    if (value === 0) {
      return "未开始"
    }
  }

  return "-"
}

function normalizeEnableStatus(value: unknown) {
  if (value === 1 || value === "1" || value === "启用") {
    return "启用"
  }

  if (value === 2 || value === "2" || value === 0 || value === "0" || value === "禁用" || value === "停用") {
    return "禁用"
  }

  return "-"
}

function getString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized || fallback
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : undefined
  }

  return undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null
}
