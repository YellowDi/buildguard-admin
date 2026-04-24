import {
  fetchDictEntriesResult,
  fetchDictTypes,
  type DictEntryItem,
  type DictTypeItem,
} from "@/lib/business-presets-api"

export type RepairDictionaryOption = {
  value: string
  numericValue: number
  label: string
  uuid: string
  sort: number | null
}

export type RepairWorkOrderDictionaries = {
  importanceOptions: RepairDictionaryOption[]
  typeOptions: RepairDictionaryOption[]
}

const REPAIR_IMPORTANCE_CODE = "repair_importance"
const REPAIR_TYPE_CODE = "repair_type"

let cachedDictionaries: Promise<RepairWorkOrderDictionaries> | null = null

export function fetchRepairWorkOrderDictionaries() {
  if (!cachedDictionaries) {
    cachedDictionaries = loadRepairWorkOrderDictionaries().catch((error) => {
      cachedDictionaries = null
      throw error
    })
  }

  return cachedDictionaries
}

export function formatRepairDictionaryLabel(
  value: unknown,
  options: RepairDictionaryOption[],
  fallbackPrefix: string,
) {
  const normalizedValue = toNumericValue(value)

  if (normalizedValue === null) {
    return "-"
  }

  return options.find(option => option.numericValue === normalizedValue)?.label
    ?? `${fallbackPrefix} ${normalizedValue}`
}

async function loadRepairWorkOrderDictionaries(): Promise<RepairWorkOrderDictionaries> {
  const dictTypes = await fetchDictTypes()
  const importanceType = resolveDictType(dictTypes, REPAIR_IMPORTANCE_CODE)
  const repairType = resolveDictType(dictTypes, REPAIR_TYPE_CODE)
  const [importanceOptions, typeOptions] = await Promise.all([
    fetchOptionsForType(importanceType),
    fetchOptionsForType(repairType),
  ])

  return {
    importanceOptions,
    typeOptions,
  }
}

async function fetchOptionsForType(type: DictTypeItem | null) {
  if (!type?.Uuid) {
    return []
  }

  const result = await fetchDictEntriesResult({
    DictTypeUuid: type.Uuid,
    PageNum: 1,
    PageSize: 500,
    ParentUuid: "",
  })

  return result.list
    .map(mapDictEntryOption)
    .filter((option): option is RepairDictionaryOption => Boolean(option))
    .sort((left, right) => {
      const leftSort = left.sort ?? Number.MAX_SAFE_INTEGER
      const rightSort = right.sort ?? Number.MAX_SAFE_INTEGER

      if (leftSort !== rightSort) {
        return leftSort - rightSort
      }

      return left.label.localeCompare(right.label, "zh-CN")
    })
}

function mapDictEntryOption(item: DictEntryItem): RepairDictionaryOption | null {
  const numericValue = item.Sort ?? item.Id

  if (!Number.isFinite(numericValue)) {
    return null
  }

  return {
    value: String(numericValue),
    numericValue,
    label: item.Name || String(numericValue),
    uuid: item.Uuid,
    sort: item.Sort,
  }
}

function resolveDictType(dictTypes: DictTypeItem[], code: string) {
  const normalizedCode = normalizeText(code)

  return dictTypes.find(type => normalizeText(type.Code) === normalizedCode) ?? null
}

function toNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}
