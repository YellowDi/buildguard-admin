export const WORK_ORDER_STATUS_LABELS = {
  1: "待指派",
  2: "待开始",
  3: "进行中",
  4: "报告生成中",
  5: "已结单",
  6: "复检",
} as const

export function getWorkOrderStatusLabel(value: number | null, nullLabel = "未知状态") {
  if (value === null) {
    return nullLabel
  }

  return WORK_ORDER_STATUS_LABELS[value as keyof typeof WORK_ORDER_STATUS_LABELS] ?? `状态 ${value}`
}

export function isCompletedWorkOrderStatus(value: number | null) {
  return value === 5
}
