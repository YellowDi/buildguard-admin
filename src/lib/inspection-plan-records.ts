import inspectionPlansData from "@/mocks/inspection-plans.json"

import { fetchInspectionPlans } from "@/lib/inspection-plans-api"
import { shouldUseMockData } from "@/lib/data-source"

export type InspectionPlanRecord = {
  id: string
  planName: string
  serviceName: string
  customerName: string
  inspectionScope: string
  cycle: string
  owner: string
  nextExecutionAt: string
  status: string
  note: string
}

export async function listInspectionPlanRecords() {
  if (shouldUseMockData("inspection-plans")) {
    return inspectionPlansData as InspectionPlanRecord[]
  }

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
  const serviceName = getString(record?.ServiceName, "-")
  const duration = getNumber(record?.Duration)
  const cycleType = getString(record?.CycleType)

  return {
    id: getString(record?.Uuid ?? record?.Id, "-"),
    planName: getString(record?.PlanName ?? record?.Name, serviceName === "-" ? "检测计划" : `${serviceName}计划`),
    serviceName,
    customerName: getString(record?.CorpName ?? record?.CustomerName, "-"),
    inspectionScope: getString(record?.InspectionScope ?? record?.Scope, serviceName),
    cycle: buildCycleLabel(cycleType, duration),
    owner: getString(record?.OwnerName ?? record?.PrincipalName ?? record?.CreatorName, "-"),
    nextExecutionAt: getString(record?.NextTime ?? record?.NextExecutionAt, "-"),
    status: normalizePlanStatus(record?.PlanStatus ?? record?.Status),
    note: getString(record?.Remark ?? record?.Note, ""),
  }
}

function buildCycleLabel(cycleType: string, duration: number | undefined) {
  if (cycleType && duration) {
    return `${duration}${cycleType}`
  }

  if (cycleType) {
    return cycleType
  }

  if (duration) {
    return `${duration}天`
  }

  return "-"
}

function normalizePlanStatus(value: unknown) {
  if (typeof value === "number") {
    if (value === 1) {
      return "进行中"
    }

    if (value === 0) {
      return "未开始"
    }
  }

  return getString(value, "未开始")
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
