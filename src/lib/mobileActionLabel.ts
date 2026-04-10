export function toMobileActionLabel(label: string): string {
  const normalized = label.trim()

  if (!normalized) {
    return normalized
  }

  const mappings: Array<[RegExp, string]> = [
    [/^添加.+$/, "添加"],
    [/^新建.+$/, "新建"],
    [/^创建.+$/, "创建"],
    [/^修改.+$/, "修改"],
    [/^编辑.+$/, "编辑"],
    [/^删除.+$/, "删除"],
    [/^指派.+$/, "指派"],
    [/^导出.+$/, "导出"],
    [/^保存.+$/, "保存"],
    [/^确认.+$/, "确认"],
  ]

  for (const [pattern, shortLabel] of mappings) {
    if (pattern.test(normalized)) {
      return shortLabel
    }
  }

  return normalized
}
