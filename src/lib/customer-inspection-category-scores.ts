import type { BuildingListItem } from "@/lib/buildings-api"
import type { InspectionCategoryRecord } from "@/lib/inspection-categories-api"
import { clampBuildingScore, resolveBuildingOverallScore } from "@/lib/building-score"

function toTrimmedText(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return ""
}

function tryScoreFromCategoryRow(row: unknown, categoryUuid: string, categoryName: string) {
  if (!row || typeof row !== "object") {
    return null
  }

  const record = row as Record<string, unknown>
  const ru = toTrimmedText(record.CategoryUuid ?? record.categoryUuid)
  const rn = toTrimmedText(record.CategoryName ?? record.categoryName)
  const matchesUuid = categoryUuid && ru === categoryUuid
  const matchesName = categoryName && rn === categoryName

  if (!matchesUuid && !matchesName) {
    return null
  }

  const raw = record.Score ?? record.score ?? record.AvgScore ?? record.avgScore
  const num = typeof raw === "number" ? raw : Number(raw)
  if (Number.isFinite(num)) {
    return clampBuildingScore(num)
  }

  return null
}

/**
 * 从单栋建筑记录中解析某检测分类下的得分；若无分类维度字段则回退为建筑综合分。
 */
export function resolveBuildingScoreForInspectionCategory(
  building: BuildingListItem,
  buildingIndex: number,
  category: InspectionCategoryRecord,
): number {
  const categoryUuid = toTrimmedText(category.Uuid)
  const categoryName = toTrimmedText(category.Name)

  const listKeys = ["CategoryScores", "categoryScores", "InspectionCategoryScores", "inspectionCategoryScores"] as const
  for (const key of listKeys) {
    const raw = building[key]
    if (!Array.isArray(raw)) {
      continue
    }

    for (const row of raw) {
      const score = tryScoreFromCategoryRow(row, categoryUuid, categoryName)
      if (score !== null) {
        return score
      }
    }
  }

  const mapKeys = ["CategoryScoreMap", "categoryScoreMap", "InspectionCategoryScoreMap"] as const
  for (const mk of mapKeys) {
    const map = building[mk]
    if (!map || typeof map !== "object") {
      continue
    }

    const record = map as Record<string, unknown>
    const direct = categoryUuid ? record[categoryUuid] : undefined
    const byName = categoryName ? record[categoryName] : undefined
    const pick = direct ?? byName
    const num = typeof pick === "number" ? pick : Number(pick)
    if (Number.isFinite(num)) {
      return clampBuildingScore(num)
    }
  }

  if (categoryUuid) {
    const prefixed = building[`Score_${categoryUuid}`] ?? building[`score_${categoryUuid}`]
    const num = typeof prefixed === "number" ? prefixed : Number(prefixed)
    if (Number.isFinite(num)) {
      return clampBuildingScore(num)
    }
  }

  return resolveBuildingOverallScore(building, buildingIndex)
}

/** 每个检测分类下，对客户全部建筑的得分取算术平均（0–100）。 */
export function averageBuildingScoresByInspectionCategory(
  categories: InspectionCategoryRecord[],
  buildings: BuildingListItem[],
): number[] {
  if (!categories.length || !buildings.length) {
    return categories.map(() => 0)
  }

  return categories.map((category) => {
    let sum = 0

    for (let i = 0; i < buildings.length; i += 1) {
      sum += resolveBuildingScoreForInspectionCategory(buildings[i], i, category)
    }

    return clampBuildingScore(sum / buildings.length)
  })
}
