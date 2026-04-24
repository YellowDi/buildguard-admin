import type { DetailContactValue, DetailFieldSection } from "@/components/detail/types"
import type { CustomerDetailResult } from "@/lib/customers-api"
import { formatRepairDictionaryLabel, type RepairDictionaryOption } from "@/lib/repair-work-order-dictionaries"
import { getWorkOrderStatusLabel } from "@/lib/work-order-status"
import type { RepairWorkOrderDetailResult } from "@/lib/work-orders-api"

export type RepairWorkOrderDictionaryLabels = {
  importanceOptions?: RepairDictionaryOption[]
  typeOptions?: RepairDictionaryOption[]
}

export function buildRepairWorkOrderPrimarySections(
  workOrder: RepairWorkOrderDetailResult | null,
  customer: CustomerDetailResult | null,
  options?: {
    onOpenCustomer?: () => void
    onOpenPark?: () => void
    dictionaries?: RepairWorkOrderDictionaryLabels
  },
): DetailFieldSection[] {
  if (!workOrder) {
    return []
  }

  return [
    {
      key: "repair-work-order-basic",
      title: "基本信息",
      rows: [
        { key: "order-no", label: "工单编号", value: toText(workOrder.OrderNo, "-") },
        { key: "title", label: "报修标题", value: toText(workOrder.Title, "-") },
        { key: "report-type", label: "报修类型", value: formatRepairReportTypeLabel(workOrder.ReportType, options?.dictionaries?.typeOptions) },
        { key: "important", label: "重要程度", value: formatRepairImportantLabel(workOrder.Important, options?.dictionaries?.importanceOptions) },
        {
          key: "content",
          label: "报修内容",
          value: toText(workOrder.Content, "-"),
          truncate: false,
          valueClass: "leading-6",
        },
        { key: "status", label: "状态", value: formatRepairWorkOrderStatus(workOrder.Status) },
        { key: "created-at", label: "创建时间", value: toText(workOrder.CreatedAt, "-") },
        { key: "user-name", label: "执行人", value: toText(workOrder.UserName, "-") },
      ],
    },
    {
      key: "repair-work-order-customer",
      title: "客户信息",
      rows: [
        {
          key: "customer-name",
          label: "客户名称",
          value: toText(customer?.CorpName, toText(workOrder.CorpName || workOrder.CustomerName, "-")),
          ...(options?.onOpenCustomer
            ? { linkAction: { onClick: options.onOpenCustomer } }
            : {}),
        },
        {
          key: "park-name",
          label: "园区名称",
          value: toText(workOrder.ParkName, "-"),
          ...(options?.onOpenPark
            ? { linkAction: { onClick: options.onOpenPark } }
            : {}),
        },
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
          label: "维修前附件",
          value: formatFileCount(workOrder.BeforeRepairFile),
        },
        {
          key: "after-repair-file",
          label: "维修后附件",
          value: formatFileCount(workOrder.AfterRepairFile),
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

function formatFileCount(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return "-"
  }

  return `${value.length} 个附件`
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function formatRepairWorkOrderStatus(value: unknown) {
  const status = toNumber(value)
  return getWorkOrderStatusLabel(status, "-")
}

function formatRepairReportTypeLabel(value: unknown, options: RepairDictionaryOption[] = []) {
  return formatRepairDictionaryLabel(value, options, "类型")
}

function formatRepairImportantLabel(value: unknown, options: RepairDictionaryOption[] = []) {
  return formatRepairDictionaryLabel(value, options, "等级")
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
