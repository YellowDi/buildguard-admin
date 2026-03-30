import type { DetailContactValue, DetailFieldSection } from "@/components/detail/types"
import type { CustomerDetailResult } from "@/lib/customers-api"
import type { RepairWorkOrderDetailResult } from "@/lib/work-orders-api"

export function buildRepairWorkOrderPrimarySections(
  workOrder: RepairWorkOrderDetailResult | null,
  customer: CustomerDetailResult | null,
): DetailFieldSection[] {
  if (!workOrder) {
    return []
  }

  return [
    {
      key: "repair-work-order-basic",
      title: "基本信息",
      rows: [
        { key: "work-order-id", label: "工单ID", value: toText(workOrder.Uuid, toText(workOrder.Id, "-")) },
        { key: "order-no", label: "工单编号", value: toText(workOrder.OrderNo, "-") },
        { key: "title", label: "报修标题", value: toText(workOrder.Title, "-") },
        { key: "status", label: "状态", value: formatRepairWorkOrderStatus(workOrder.Status) },
        { key: "created-start-at", label: "创建开始时间", value: toText(workOrder.CreatedStartAt, "-") },
        { key: "created-end-at", label: "创建结束时间", value: toText(workOrder.CreatedEndAt, "-") },
        { key: "user-name", label: "维修人员", value: toText(workOrder.UserName, "-") },
      ],
    },
    {
      key: "repair-work-order-customer",
      title: "客户信息",
      rows: [
        { key: "customer-name", label: "客户名称", value: toText(customer?.CorpName, toText(workOrder.CorpName || workOrder.CustomerName, "-")) },
        { key: "park-name", label: "园区名称", value: toText(workOrder.ParkName, "-") },
        {
          key: "address",
          label: "地址",
          value: toText(customer?.Address, "-"),
          truncate: false,
          valueClass: "leading-6",
        },
        {
          key: "contact",
          label: "客户联系人",
          value: buildContactValue(
            resolveCustomerContactName(customer),
            resolveCustomerContactPhone(customer),
          ),
        },
      ],
    },
  ]
}

export function buildRepairWorkOrderSecondarySections(workOrder: RepairWorkOrderDetailResult | null): DetailFieldSection[] {
  if (!workOrder) {
    return []
  }

  return [
    {
      key: "repair-work-order-report",
      title: "报修信息",
      rows: [
        { key: "report-type", label: "报修类型", value: formatRepairReportTypeLabel(workOrder.ReportType) },
        { key: "important", label: "重要程度", value: formatRepairImportantLabel(workOrder.Important) },
        {
          key: "content",
          label: "报修内容",
          value: toText(workOrder.Content, "-"),
          truncate: false,
          valueClass: "leading-6",
        },
      ],
    },
    {
      key: "repair-work-order-repair",
      title: "维修记录",
      rows: [
        {
          key: "repair-content",
          label: "维修内容",
          value: toText(workOrder.RepairContent, "-"),
          truncate: false,
          valueClass: "leading-6",
        },
        {
          key: "before-repair-file",
          label: "维修前图片",
          value: workOrder.BeforeRepairFile ? null : "-",
          imageUrl: toOptionalText(workOrder.BeforeRepairFile),
          truncate: false,
        },
        {
          key: "after-repair-file",
          label: "维修后图片",
          value: workOrder.AfterRepairFile ? null : "-",
          imageUrl: toOptionalText(workOrder.AfterRepairFile),
          truncate: false,
        },
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

function toOptionalText(value: unknown) {
  const text = toText(value)
  return text || null
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function formatRepairWorkOrderStatus(value: unknown) {
  const status = toNumber(value)

  if (status === null) return "-"
  if (status === 1) return "待指派"
  if (status === 2) return "待开始"
  if (status === 3) return "进行中"
  if (status === 4) return "报告生成中"
  if (status === 5) return "已结单"

  return `状态 ${status}`
}

function formatRepairReportTypeLabel(value: unknown) {
  const reportType = toNumber(value)
  return reportType === null ? "-" : `类型 ${reportType}`
}

function formatRepairImportantLabel(value: unknown) {
  const important = toNumber(value)
  return important === null ? "-" : `等级 ${important}`
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
