import {
  fetchDictEntriesResult,
  fetchDictTypes,
  type DictEntryItem,
  type DictTypeItem,
} from "@/lib/business-presets-api"

export type RepairDictionaryOption = {
  value: string
  numericValue: number | null
  label: string
  uuid: string
  sort: number | null
}

export type RepairWorkOrderDictionaries = {
  importanceOptions: RepairDictionaryOption[]
  typeOptions: RepairDictionaryOption[]
}

const REPAIR_IMPORTANCE_TARGET = {
  codeAliases: [
    "repair_importance",
    "repair_important",
    "repair_importance_level",
    "repair_work_order_importance",
    "work_order_repair_importance",
  ],
  nameAliases: ["报修重要程度"],
}

const REPAIR_TYPE_TARGET = {
  codeAliases: [
    "repair_type",
    "report_type",
    "repair_report_type",
    "repair_work_order_type",
    "work_order_repair_type",
    "maintenance_type",
  ],
  nameAliases: ["报修类型"],
}

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
  const normalizedText = toTextValue(value)

  if (normalizedText) {
    const matchedByValue = options.find(option => (
      option.value === normalizedText
      || option.uuid === normalizedText
      || option.label === normalizedText
    ))

    if (matchedByValue) {
      return matchedByValue.label
    }
  }

  const normalizedValue = toNumericValue(value)

  if (normalizedValue === null) {
    return normalizedText ? `${fallbackPrefix} ${normalizedText}` : "-"
  }

  return options.find(option => option.numericValue === normalizedValue)?.label
    ?? `${fallbackPrefix} ${normalizedValue}`
}

function toTextValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return ""
}

async function loadRepairWorkOrderDictionaries(): Promise<RepairWorkOrderDictionaries> {
  const dictTypes = await fetchDictTypes()
  const importanceType = resolveDictType(dictTypes, REPAIR_IMPORTANCE_TARGET)
  const repairType = resolveDictType(dictTypes, REPAIR_TYPE_TARGET)
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
  const label = item.Name.trim()
  const numericValue = resolveDictEntryId(item)
  const value = numericValue === null ? item.Uuid.trim() : String(numericValue)

  if (!value) {
    return null
  }

  return {
    value,
    numericValue,
    label: label || value,
    uuid: item.Uuid,
    sort: item.Sort,
  }
}

function resolveDictEntryId(item: DictEntryItem) {
  const record = item as DictEntryItem & Record<string, unknown>
  const candidateKeys = [
    "Id",
    "ID",
    "id",
    "DictDataId",
    "DictDataID",
    "dictDataId",
    "dictDataID",
    "EntryId",
    "EntryID",
    "entryId",
    "entryID",
  ]

  for (const key of candidateKeys) {
    const value = record[key]
    const parsed = typeof value === "string" ? Number(value.trim()) : value

    if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
}

function resolveDictType(
  dictTypes: DictTypeItem[],
  target: { codeAliases: string[]; nameAliases: string[] },
) {
  const normalizedCodeAliases = new Set(target.codeAliases.map(normalizeText))
  const normalizedNameAliases = new Set(target.nameAliases.map(normalizeText))

  return dictTypes.find((type) => {
    const code = normalizeText(type.Code)
    const name = normalizeText(type.Name)

    return normalizedCodeAliases.has(code) || normalizedNameAliases.has(name)
  }) ?? dictTypes.find((type) => {
    const code = normalizeText(type.Code)
    const name = normalizeText(type.Name)

    return target.codeAliases.some(alias => code.includes(normalizeText(alias)))
      || target.nameAliases.some(alias => name.includes(normalizeText(alias)))
  }) ?? null
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
