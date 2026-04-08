import {
  fetchDictEntriesResult,
  fetchDictTypes,
  type DictTypeItem,
} from "@/lib/business-presets-api"

export type BusinessPresetTarget = "industry" | "customerLevel" | "serviceLevel"

export type BusinessPresetEntryOption = {
  uuid: string
  name: string
  sort: number | null
  remark: string
  typeCode: string
  typeName: string
}

const BUSINESS_PRESET_TARGETS: Record<BusinessPresetTarget, {
  codeAliases: string[]
  nameAliases: string[]
}> = {
  industry: {
    codeAliases: ["industry_category", "industry"],
    nameAliases: ["行业分类", "所属行业", "行业"],
  },
  customerLevel: {
    codeAliases: ["customer_level", "customer_grade"],
    nameAliases: ["客户等级"],
  },
  serviceLevel: {
    codeAliases: ["service_level", "inspection_service_level", "package_level"],
    nameAliases: ["服务等级", "检测服务等级", "套餐等级"],
  },
}

export async function fetchBusinessPresetEntryOptions(
  targets: BusinessPresetTarget[],
): Promise<Partial<Record<BusinessPresetTarget, BusinessPresetEntryOption[]>>> {
  const uniqueTargets = Array.from(new Set(targets))

  if (!uniqueTargets.length) {
    return {}
  }

  const dictTypes = await fetchDictTypes()
  const resolvedTypes = new Map(uniqueTargets.map(target => [
    target,
    resolveDictType(dictTypes, BUSINESS_PRESET_TARGETS[target]),
  ] as const))

  const entries = await Promise.all(uniqueTargets.map(async (target) => {
    const type = resolvedTypes.get(target)

    if (!type?.Uuid) {
      return [target, []] as const
    }

    const result = await fetchDictEntriesResult({
      DictTypeUuid: type.Uuid,
      PageNum: 1,
      PageSize: 500,
      ParentUuid: "",
    })

    return [target, result.list
      .slice()
      .sort((a, b) => {
        const aSort = a.Sort ?? Number.MAX_SAFE_INTEGER
        const bSort = b.Sort ?? Number.MAX_SAFE_INTEGER

        if (aSort !== bSort) {
          return aSort - bSort
        }

        return a.Name.localeCompare(b.Name, "zh-CN")
      })
      .map(item => ({
        uuid: item.Uuid,
        name: item.Name,
        sort: item.Sort,
        remark: item.Remark,
        typeCode: type.Code,
        typeName: type.Name,
      } satisfies BusinessPresetEntryOption))] as const
  }))

  return Object.fromEntries(entries)
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
  }) ?? null
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}
