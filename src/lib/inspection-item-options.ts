import { fetchInspectionItems, type InspectionItemRecord } from "@/lib/inspection-items-api"

export type InspectionItemOption = {
  id: number
  uuid: string
  name: string
  categoryName: string
}

export async function fetchAllInspectionItemOptions() {
  const pageSize = 200
  const allItems: InspectionItemRecord[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchInspectionItems({
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

  return dedupeInspectionItems(allItems).map(normalizeInspectionItemOption)
}

function normalizeInspectionItemOption(item: InspectionItemRecord): InspectionItemOption {
  return {
    id: toNumber(item.Id) ?? 0,
    uuid: toText(item.Uuid),
    name: toText(item.Name, `检测项 ${toNumber(item.Id) ?? "-"}`),
    categoryName: toText(item.CategoryName, "未分类"),
  }
}

function dedupeInspectionItems(items: InspectionItemRecord[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const uuid = toText(item.Uuid)

    if (!uuid || seen.has(uuid)) {
      return false
    }

    seen.add(uuid)
    return true
  })
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
