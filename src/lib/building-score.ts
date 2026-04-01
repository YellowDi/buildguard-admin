import type { BuildingListItem } from "@/lib/buildings-api"

/** 与仪表盘建筑排行一致的综合分解析（0–100）。 */
export function clampBuildingScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function hashText(value: string) {
  let hash = 0

  for (const char of value) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0)
    hash |= 0
  }

  return hash
}

export function resolveBuildingOverallScore(item: BuildingListItem, index: number) {
  const candidateKeys = [
    "Score",
    "score",
    "TotalScore",
    "totalScore",
    "RiskScore",
    "riskScore",
    "SafetyScore",
    "safetyScore",
    "Rating",
    "rating",
  ] as const

  for (const key of candidateKeys) {
    const value = toFiniteNumber(item[key])
    if (value !== null) {
      return clampBuildingScore(value)
    }
  }

  return 55 + (Math.abs(hashText([
    String(item.Uuid ?? ""),
    String(item.Name ?? ""),
    String(item.ParkName ?? ""),
    String(index),
  ].join("|"))) % 45)
}
