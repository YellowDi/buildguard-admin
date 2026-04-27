export const WORK_ORDER_STATUS_LABELS = {
  1: "待指派",
  2: "待开始",
  3: "进行中",
  4: "报告生成中",
  5: "已结单",
  6: "复检",
} as const

export const REPAIR_WORK_ORDER_STATUS_LABELS = {
  1: "待指派",
  2: "进行中",
  3: "待复核",
  4: "已完成",
} as const

export const WORK_ORDER_STATUS_OPTIONS = Object.entries(WORK_ORDER_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const REPAIR_WORK_ORDER_STATUS_OPTIONS = Object.entries(REPAIR_WORK_ORDER_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function getWorkOrderStatusLabel(value: number | null, nullLabel = "未知状态") {
  if (value === null) {
    return nullLabel
  }

  return WORK_ORDER_STATUS_LABELS[value as keyof typeof WORK_ORDER_STATUS_LABELS] ?? `状态 ${value}`
}

export function getRepairWorkOrderStatusLabel(value: number | null, nullLabel = "未知状态") {
  if (value === null) {
    return nullLabel
  }

  return REPAIR_WORK_ORDER_STATUS_LABELS[value as keyof typeof REPAIR_WORK_ORDER_STATUS_LABELS] ?? `状态 ${value}`
}

export function isCompletedWorkOrderStatus(value: number | null) {
  return value === 5
}

export function isCompletedRepairWorkOrderStatus(value: number | null) {
  return value === 4
}
