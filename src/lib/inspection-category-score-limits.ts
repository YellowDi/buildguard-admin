export type InspectionCategoryScoreLimit = number

type InspectionCategoryScoreLimitStorage = Record<string, InspectionCategoryScoreLimit>

const INSPECTION_CATEGORY_SCORE_LIMIT_STORAGE_KEY = "buildguard:inspection-category-score-limits"
const LEGACY_INSPECTION_CATEGORY_SCORE_PRESET_STORAGE_KEY = "buildguard:inspection-category-score-presets"

export function readInspectionCategoryScoreLimits(): InspectionCategoryScoreLimitStorage {
  if (typeof window === "undefined") {
    return {}
  }

  const currentStorage = readStorageRecord(INSPECTION_CATEGORY_SCORE_LIMIT_STORAGE_KEY)

  if (currentStorage) {
    return currentStorage
  }

  const legacyStorage = readLegacyScorePresetStorage()

  if (!legacyStorage) {
    return {}
  }

  const migrated = Object.fromEntries(
    Object.entries(legacyStorage).map(([uuid, preset]) => [uuid, normalizeScoreLimit(
      Math.max(preset.normal, preset.attention, preset.risk),
    )]),
  )

  persistScoreLimitStorage(migrated)
  return migrated
}

export function writeInspectionCategoryScoreLimit(uuid: string, scoreLimit: InspectionCategoryScoreLimit) {
  const normalizedUuid = normalizeText(uuid)

  if (!normalizedUuid || typeof window === "undefined") {
    return
  }

  const storage = readInspectionCategoryScoreLimits()
  storage[normalizedUuid] = normalizeScoreLimit(scoreLimit)
  persistScoreLimitStorage(storage)
}

export function removeInspectionCategoryScoreLimit(uuid: string) {
  const normalizedUuid = normalizeText(uuid)

  if (!normalizedUuid || typeof window === "undefined") {
    return
  }

  const storage = readInspectionCategoryScoreLimits()

  if (!(normalizedUuid in storage)) {
    return
  }

  delete storage[normalizedUuid]
  persistScoreLimitStorage(storage)
}

function persistScoreLimitStorage(storage: InspectionCategoryScoreLimitStorage) {
  try {
    window.localStorage.setItem(
      INSPECTION_CATEGORY_SCORE_LIMIT_STORAGE_KEY,
      JSON.stringify(storage),
    )
  } catch {
    // ignore quota or privacy mode failures
  }
}

function readStorageRecord(key: string): InspectionCategoryScoreLimitStorage | null {
  try {
    const rawValue = window.localStorage.getItem(key)

    if (!rawValue) {
      return null
    }

    const parsed = JSON.parse(rawValue) as unknown
    return isScoreLimitStorage(parsed) ? parsed : null
  } catch {
    return null
  }
}

function readLegacyScorePresetStorage(): Record<string, { normal: number, attention: number, risk: number }> | null {
  try {
    const rawValue = window.localStorage.getItem(LEGACY_INSPECTION_CATEGORY_SCORE_PRESET_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const parsed = JSON.parse(rawValue) as unknown

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null
    }

    const entries = Object.entries(parsed)

    if (!entries.every(([, value]) => isLegacyScorePreset(value))) {
      return null
    }

    return Object.fromEntries(entries) as Record<string, { normal: number, attention: number, risk: number }>
  } catch {
    return null
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

function normalizeScoreLimit(value: number) {
  return Math.max(0, Math.round(value))
}

function isScoreLimitStorage(value: unknown): value is InspectionCategoryScoreLimitStorage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every((item) => {
    const numberValue = toFiniteNumber(item)
    return numberValue !== null
  })
}

function isLegacyScorePreset(value: unknown): value is { normal: number, attention: number, risk: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>

  return ["normal", "attention", "risk"].every((key) => {
    const numberValue = toFiniteNumber(record[key])
    return numberValue !== null
  })
}
