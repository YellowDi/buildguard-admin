import type { DetailContactValue, DetailFieldSection } from "@/components/detail/types"
import type { CustomerDetailResult } from "@/lib/customers-api"
import type { WorkOrderDetailResult } from "@/lib/work-orders-api"

export function buildWorkOrderPrimarySections(
  workOrder: WorkOrderDetailResult | null,
  customer: CustomerDetailResult | null,
): DetailFieldSection[] {
  if (!workOrder) {
    return []
  }

  return [
    {
      key: "work-order-basic",
      title: "基本信息",
      rows: [
        { key: "work-order-id", label: "工单ID", value: toText(workOrder.Uuid, toText(workOrder.Id, "-")) },
        { key: "plan-time", label: "计划时间", value: "-" },
        { key: "deadline", label: "截止时间", value: toText(workOrder.Deadline, "-") },
        { key: "executor", label: "执行人", value: toText(workOrder.Executor, "-") },
        { key: "package-name", label: "关联套餐", value: toText(workOrder.PackageName, "-") },
        { key: "plan-name", label: "关联计划", value: toText(workOrder.PlanName, "-") },
      ],
    },
    {
      key: "work-order-customer",
      title: "客户信息",
      rows: [
        { key: "customer-name", label: "客户名称", value: toText(customer?.CorpName, toText(workOrder.CustomerName, "-")) },
        { key: "park-building", label: "园区/建筑", value: "-" },
        {
          key: "address",
          label: "地址",
          value: toText(customer?.Address, "-"),
          truncate: false,
          valueClass: "leading-6",
        },
        {
          key: "contact",
          label: "园区/建筑联系人",
          value: buildContactValue(
            resolveCustomerContactName(customer),
            resolveCustomerContactPhone(customer),
          ),
        },
      ],
    },
  ]
}

export function buildWorkOrderSecondarySections(workOrder: WorkOrderDetailResult | null): DetailFieldSection[] {
  if (!workOrder) {
    return []
  }

  return [
    {
      key: "work-order-report-suggestion",
      title: "报告建议",
      rows: [
        { key: "remark", label: "建议内容", value: toText(workOrder.Remark, "-"), truncate: false, valueClass: "leading-6" },
      ],
    },
    {
      key: "work-order-result",
      title: "检测结果",
      rows: [
        { key: "status", label: "状态", value: formatWorkOrderStatus(workOrder.Status) },
        { key: "result", label: "检测结果", value: formatWorkOrderResult(workOrder.Result) },
        { key: "score", label: "评分", value: formatWorkOrderScore(workOrder.Score) },
      ],
    },
  ]
}

export function toText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function formatWorkOrderStatus(value: unknown) {
  const status = toNumber(value)

  if (status === null) return "-"
  if (status === 1) return "待指派"
  if (status === 2) return "待开始"
  if (status === 3) return "进行中"
  if (status === 4) return "报告生成中"
  if (status === 5) return "已结单"

  return `状态 ${status}`
}

function formatWorkOrderResult(value: unknown) {
  const result = toNumber(value)

  if (result === null || result === 0) return "未反馈"
  if (result === 1) return "正常"
  if (result === 2) return "异常"
  if (result === 3) return "已驳回"

  return `结果 ${result}`
}

function formatWorkOrderScore(value: unknown) {
  const score = toNumber(value)
  return score === null ? "-" : String(score)
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function buildContactValue(name: string, phone?: string | null): DetailContactValue {
  return {
    kind: "contact",
    name,
    phone,
  }
}

function resolveCustomerContactName(detail: CustomerDetailResult | null) {
  const mainContact = detail?.People?.find(person => toNumber(person?.IsMain) === 1)
  return toText(mainContact?.Name, toText(detail?.People?.[0]?.Name, "-"))
}

function resolveCustomerContactPhone(detail: CustomerDetailResult | null) {
  const mainContact = detail?.People?.find(person => toNumber(person?.IsMain) === 1)
  return toText(mainContact?.Phone, toText(detail?.People?.[0]?.Phone, "-"))
}
