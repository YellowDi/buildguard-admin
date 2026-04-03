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
        { key: "order-no", label: "工单标号", value: toText(workOrder.OrderNo, "-") },
        { key: "service-name", label: "检测服务", value: toText(workOrder.ServiceName, "-") },
        { key: "plan-name", label: "检测计划", value: toText(workOrder.PlanName, "-") },
        { key: "deadline", label: "截止时间", value: formatDateOnly(toText(workOrder.Deadline, "-")) },
        { key: "created-at", label: "创建时间", value: toText(workOrder.CreatedAt, "-") },
        { key: "updated-at", label: "更新时间", value: toText(workOrder.UpdatedAt, "-") },
      ],
    },
    {
      key: "work-order-customer",
      title: "客户信息",
      rows: [
        { key: "customer-name", label: "客户名称", value: toText(customer?.CorpName, toText(workOrder.CustomerName, "-")) },
        { key: "park-name", label: "园区", value: toText(workOrder.ParkName, "-") },
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
  return []
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

function formatDateOnly(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
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
