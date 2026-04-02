export type InspectionCategoryScorePreset = {
  normal: number
  attention: number
  risk: number
}

type InspectionCategoryScorePresetStorage = Record<string, InspectionCategoryScorePreset>

const INSPECTION_CATEGORY_SCORE_PRESET_STORAGE_KEY = "buildguard:inspection-category-score-presets"

export function readInspectionCategoryScorePresets(): InspectionCategoryScorePresetStorage {
  if (typeof window === "undefined") {
    return {}
  }

  const rawValue = window.localStorage.getItem(INSPECTION_CATEGORY_SCORE_PRESET_STORAGE_KEY)

  if (!rawValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    return isScorePresetStorage(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function writeInspectionCategoryScorePreset(uuid: string, preset: InspectionCategoryScorePreset) {
  const normalizedUuid = normalizeText(uuid)

  if (!normalizedUuid || typeof window === "undefined") {
    return
  }

  const storage = readInspectionCategoryScorePresets()
  storage[normalizedUuid] = normalizeScorePreset(preset)
  persistScorePresetStorage(storage)
}

export function removeInspectionCategoryScorePreset(uuid: string) {
  const normalizedUuid = normalizeText(uuid)

  if (!normalizedUuid || typeof window === "undefined") {
    return
  }

  const storage = readInspectionCategoryScorePresets()

  if (!(normalizedUuid in storage)) {
    return
  }

  delete storage[normalizedUuid]
  persistScorePresetStorage(storage)
}

function persistScorePresetStorage(storage: InspectionCategoryScorePresetStorage) {
  try {
    window.localStorage.setItem(
      INSPECTION_CATEGORY_SCORE_PRESET_STORAGE_KEY,
      JSON.stringify(storage),
    )
  } catch {
    // ignore quota or privacy mode failures
  }
}

function normalizeScorePreset(preset: InspectionCategoryScorePreset): InspectionCategoryScorePreset {
  return {
    normal: clampDeductionScore(preset.normal),
    attention: clampDeductionScore(preset.attention),
    risk: clampDeductionScore(preset.risk),
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
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

function clampDeductionScore(value: number) {
  return Math.max(0, Math.min(20, Math.round(value)))
}

function isScorePresetStorage(value: unknown): value is InspectionCategoryScorePresetStorage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every(isInspectionCategoryScorePreset)
}

function isInspectionCategoryScorePreset(value: unknown): value is InspectionCategoryScorePreset {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>
  return ["normal", "attention", "risk"].every((key) => {
    const numberValue = toFiniteNumber(record[key])
    return numberValue !== null
  })
}
