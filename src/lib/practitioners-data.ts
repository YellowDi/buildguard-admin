import usersData from "@/mocks/users.json"

import { fetchMembers } from "@/lib/members-api"
import { shouldUseMockData } from "@/lib/data-source"

export type PractitionerRecord = {
  id: number
  name: string
  phone: string
  company: string
  role: string
  district: string
  certificateLevel: string
  experienceYears: number
  joinedAt: string
  status: string
  note: string
}

export async function listPractitioners() {
  if (shouldUseMockData("users")) {
    return usersData as PractitionerRecord[]
  }

  const pageSize = 200
  const allItems: unknown[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchMembers({
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

  return allItems.map((item, index) => normalizePractitionerRecord(item, index))
}

function normalizePractitionerRecord(value: unknown, index: number): PractitionerRecord {
  const record = asRecord(value)
  const roles = getStringArray(record?.Roles ?? record?.RoleNames ?? record?.RoleUuids)

  return {
    id: getNumber(record?.Id) ?? index + 1,
    name: getString(record?.Name, "-"),
    phone: getString(record?.Phone, "-"),
    company: getString(record?.DepartmentName ?? record?.CorpName ?? record?.CompanyName, "-"),
    role: roles[0] ?? getString(record?.Position, "-"),
    district: getString(record?.DistrictName ?? record?.District ?? record?.AreaName, "-"),
    certificateLevel: getString(record?.CertificateLevel ?? record?.CertLevel ?? record?.LevelName, "-"),
    experienceYears: getNumber(record?.ExperienceYears ?? record?.WorkYears ?? record?.YearsOfExperience) ?? 0,
    joinedAt: getString(record?.JoinedAt ?? record?.EntryTime ?? record?.CreatedAt ?? record?.UpdatedAt, "-"),
    status: normalizeStatus(record?.Status),
    note: getString(record?.Remark ?? record?.Note, ""),
  }
}

function normalizeStatus(value: unknown) {
  const numericStatus = getNumber(value)

  if (numericStatus === 1) {
    return "在岗"
  }

  if (numericStatus === 0) {
    return "停用"
  }

  const normalized = getString(value)
  return normalized || "待复核"
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") {
        const normalized = item.trim()
        return normalized ? [normalized] : []
      }

      const record = asRecord(item)
      const label = getString(record?.RoleName ?? record?.Name ?? record?.Label)
      return label ? [label] : []
    })
  }

  return []
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
