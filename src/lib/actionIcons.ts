/**
 * 操作按钮文案 → Remix Icon class，与项目内已有 `ri-*-line` 用法对齐。
 * 未命中时由调用方决定兜底（表格行操作默认 `ri-arrow-right-s-line`）。
 */
const LABEL_TO_ICON: Record<string, string> = {
  查看详情: "ri-menu-line",
  查看更多: "ri-menu-line",
  查看: "ri-menu-line",
  查看归档: "ri-archive-line",
  编辑: "ri-edit-line",
  指派: "ri-user-shared-line",
  重置密码: "ri-reset-right-line",
  在地图中查看: "ri-map-pin-line",
  重置表单: "ri-restart-line",
  取消: "ri-close-line",
  重试: "ri-refresh-line",
  完成: "ri-check-line",
  确认指派: "ri-send-plane-line",
  确认删除: "ri-delete-bin-line",
  确认重置: "ri-restart-line",
  选择文件: "ri-file-upload-line",
  确认上传: "ri-upload-2-line",
  开始导出: "ri-download-line",
}

export function remixIconForActionLabel(label: string): string | undefined {
  const trimmed = label.trim()
  if (LABEL_TO_ICON[trimmed]) {
    return LABEL_TO_ICON[trimmed]
  }

  if (trimmed.endsWith("…") || trimmed.endsWith("...")) {
    const base = trimmed.replace(/[.…]+$/u, "").trim()
    if (LABEL_TO_ICON[base]) {
      return LABEL_TO_ICON[base]
    }
  }

  return undefined
}

export function remixIconForTableRowAction(label: string, explicit?: string): string {
  if (explicit?.trim()) {
    return explicit.trim()
  }
  return remixIconForActionLabel(label) ?? "ri-arrow-right-s-line"
}

export function remixIconForDetailFieldAction(label: string, explicit?: string): string {
  if (explicit?.trim()) {
    return explicit.trim()
  }
  return remixIconForActionLabel(label) ?? "ri-external-link-line"
}
