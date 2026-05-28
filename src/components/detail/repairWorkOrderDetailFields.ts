import type { DetailContactValue, DetailFieldMediaFile, DetailFieldSection, DetailStatusValue } from "@/components/detail/types"
import { repairWorkOrderStatusMap } from "@/components/table-page/statusPresets"
import type { CustomerDetailResult } from "@/lib/customers-api"
import { formatRepairDictionaryLabel, type RepairDictionaryOption } from "@/lib/repair-work-order-dictionaries"
import { getRepairWorkOrderStatusLabel } from "@/lib/work-order-status"
import type { RepairWorkOrderDetailResult, WorkOrderFile } from "@/lib/work-orders-api"

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
        { key: "report-type", label: "报修类型", value: formatRepairReportTypeLabel(workOrder.ReportType, options?.dictionaries?.typeOptions) },
        { key: "important", label: "重要程度", value: formatRepairImportantLabel(workOrder.Important, options?.dictionaries?.importanceOptions) },
        { key: "status", label: "状态", value: buildRepairWorkOrderStatusValue(workOrder.Status) },
        { key: "executors", label: "执行人", value: formatExecutors(workOrder.Executors) },
        { key: "repair-user", label: "维修人员", value: toText(workOrder.UserName, "-") },
        { key: "plan-name", label: "计划名称", value: toText(workOrder.PlanName, "-") },
        { key: "category-name", label: "检查项类别", value: toText(workOrder.CategoryName, "-") },
        {
          key: "category-content",
          label: "检查项分类说明",
          value: toText(workOrder.CategoryContent, "-"),
          truncate: false,
          valueClass: "leading-6",
        },
        { key: "inspection-item-name", label: "检查项", value: toText(workOrder.InspectionItemName, "-") },
        { key: "result", label: "检查结果", value: formatRepairResult(workOrder.Result) },
        {
          key: "content",
          label: "报修内容",
          value: toText(workOrder.Content, "-"),
          truncate: false,
          valueClass: "leading-6",
        },
        {
          key: "before-content",
          label: "报修前内容",
          value: formatTextList(workOrder.BeforeContent),
          truncate: false,
          valueClass: "leading-6",
        },
        ...buildMediaFileRows(workOrder.RepairFile, "需维修图片", "repair-file"),
        { key: "created-at", label: "创建时间", value: toText(workOrder.CreatedAt, "-") },
      ],
    },
    {
      key: "repair-work-order-customer",
      title: "客户信息",
      rows: [
        {
          key: "corp-name",
          label: "公司名称",
          value: toText(workOrder.CorpName, toText(customer?.CorpName, "-")),
          ...(options?.onOpenCustomer
            ? { linkAction: { onClick: options.onOpenCustomer } }
            : {}),
        },
        {
          key: "customer-name",
          label: "客户名称",
          value: toText(workOrder.CustomerName, toText(customer?.CorpName, "-")),
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
          key: "build-name",
          label: "建筑名称",
          value: toText(workOrder.BuildName, "-"),
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
        ...buildMediaFileRows(workOrder.BeforeRepairFile, "维修前图片", "before-repair-file"),
        ...buildMediaFileRows(workOrder.AfterRepairFile, "维修后图片", "after-repair-file"),
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

function formatTextList(value: unknown) {
  if (!Array.isArray(value)) {
    return "-"
  }

  const items = value
    .map(item => toText(item, ""))
    .filter(Boolean)

  return items.length ? items.join("\n") : "-"
}

function buildMediaFileRows(value: unknown, label: string, key: string) {
  const mediaFiles = normalizeWorkOrderMediaFiles(value, key, label)

  if (!mediaFiles.length) {
    return []
  }

  return [{
    key,
    label,
    value: `${mediaFiles.length} 个附件`,
    mediaFiles,
  }]
}

function normalizeWorkOrderMediaFiles(value: unknown, keyPrefix: string, altPrefix: string): DetailFieldMediaFile[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((file, index) => normalizeWorkOrderMediaFile(file, index, keyPrefix, altPrefix))
    .filter((file): file is DetailFieldMediaFile => file !== null)
}

function normalizeWorkOrderMediaFile(value: unknown, index: number, keyPrefix: string, altPrefix: string): DetailFieldMediaFile | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const file = value as WorkOrderFile
  const src = toText(file.Url)

  if (!src) {
    return null
  }

  return {
    key: `${keyPrefix}-${index}-${src}`,
    src,
    type: file.Type === 2 || /\.(mp4|mov|m4v|webm|ogg)(\?|#|$)/i.test(src) ? "video" : "image",
    alt: `${altPrefix} ${index + 1}`,
  }
}

function formatExecutors(value: unknown) {
  if (!Array.isArray(value)) {
    return "-"
  }

  const executors = value
    .map(item => toExecutorName(item))
    .filter(Boolean)

  return executors.length ? executors.join("、") : "-"
}

function toExecutorName(value: unknown) {
  const directValue = toText(value, "")

  if (directValue) {
    return directValue
  }

  if (!value || typeof value !== "object") {
    return ""
  }

  const record = value as Record<string, unknown>

  for (const key of ["Name", "name", "UserName", "userName", "ExecutorName", "executorName"]) {
    const name = toText(record[key], "")

    if (name) {
      return name
    }
  }

  return ""
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function formatRepairResult(value: unknown) {
  const result = toNumber(value)

  if (result === null || result === 0) return "未反馈"
  if (result === 1) return "正常"
  if (result === 2) return "轻微风险"
  if (result === 3) return "存在隐患"

  return `结果 ${result}`
}

function formatRepairWorkOrderStatus(value: unknown) {
  const status = toNumber(value)
  return getRepairWorkOrderStatusLabel(status, "-")
}

function buildRepairWorkOrderStatusValue(value: unknown): DetailStatusValue {
  return {
    kind: "status",
    value: formatRepairWorkOrderStatus(value),
    renderer: {
      kind: "status",
      map: repairWorkOrderStatusMap,
      fallback: { tone: "gray", icon: "dot" },
    },
  }
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
