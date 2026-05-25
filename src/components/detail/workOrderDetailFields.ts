import type { DetailContactValue, DetailFieldSection, DetailStatusValue } from "@/components/detail/types"
import { workOrderStatusMap } from "@/components/table-page/statusPresets"
import type { CustomerDetailResult } from "@/lib/customers-api"
import { getWorkOrderStatusLabel } from "@/lib/work-order-status"
import type { WorkOrderBuildInfo, WorkOrderDetailResult } from "@/lib/work-orders-api"

export function buildWorkOrderPrimarySections(
  workOrder: WorkOrderDetailResult | null,
  customer: CustomerDetailResult | null,
  options: {
    onOpenCustomer?: () => void
    onOpenService?: () => void
    onOpenPlan?: () => void
    onOpenPark?: () => void
  } = {},
): DetailFieldSection[] {
  if (!workOrder) {
    return []
  }

  return [
    {
      key: "work-order-basic",
      title: "基本信息",
      rows: [
        {
          key: "service-name",
          label: "检测服务",
          value: toText(workOrder.ServiceName, "-"),
          linkAction: options.onOpenService && toText(workOrder.ServiceUuid, "") ? { onClick: options.onOpenService } : undefined,
        },
        {
          key: "plan-name",
          label: "检测计划",
          value: toText(workOrder.PlanName, "-"),
          linkAction: options.onOpenPlan && toText(workOrder.PlanUuid, "") ? { onClick: options.onOpenPlan } : undefined,
        },
        { key: "executor", label: "执行人", value: formatExecutors(workOrder.Executors, workOrder.Executor) },
        { key: "status", label: "工单状态", value: buildWorkOrderStatusValue(workOrder.Status) },
        { key: "deadline", label: "截止时间", value: formatDateOnly(toText(workOrder.Deadline, "-")) },
        { key: "end-time", label: "结束时间", value: formatDateOnly(toText(workOrder.EndTime, "-")) },
        { key: "created-at", label: "创建时间", value: toText(workOrder.CreatedAt, "-") },
        { key: "updated-at", label: "更新时间", value: toText(workOrder.UpdatedAt, "-") },
      ],
    },
    {
      key: "work-order-customer",
      title: "客户信息",
      rows: [
        {
          key: "corp-name",
          label: "公司名称",
          value: toText(workOrder.CorpName, toText(customer?.CorpName, "-")),
          linkAction: options.onOpenCustomer && toText(workOrder.CustomerUuid, "") ? { onClick: options.onOpenCustomer } : undefined,
        },
        { key: "customer-name", label: "客户名称", value: toText(workOrder.CustomerName, toText(customer?.CorpName, "-")) },
        {
          key: "park-name",
          label: "园区",
          value: toText(workOrder.ParkName, "-"),
          linkAction: options.onOpenPark && toText(workOrder.ParkUuid, "") ? { onClick: options.onOpenPark } : undefined,
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
      key: "work-order-result",
      title: "执行结果",
      rows: [
        { key: "score", label: "园区分数", value: formatWorkOrderScore(workOrder.Score) },
        { key: "result", label: "检测结果", value: formatWorkOrderResult(workOrder.Result) },
        {
          key: "builds",
          label: "建筑",
          value: formatBuilds(workOrder.Builds),
          truncate: false,
          valueClass: "leading-6",
        },
        { key: "inspection-progress", label: "检查进度", value: formatBuildInspectionProgress(workOrder.Builds) },
        { key: "build-results", label: "建筑结果", value: formatBuildResults(workOrder.Builds) },
        { key: "build-scores", label: "建筑分数", value: formatBuildScores(workOrder.Builds) },
        {
          key: "build-reports",
          label: "报告文件",
          value: formatBuildReports(workOrder.Builds),
          truncate: false,
          valueClass: "leading-6 break-all",
        },
        { key: "build-versions", label: "版本号", value: formatBuildVersions(workOrder.Builds) },
        {
          key: "remark",
          label: "备注",
          value: toText(workOrder.Remark, "-"),
          truncate: false,
          valueClass: "leading-6",
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

function formatDateOnly(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
}

function formatExecutors(value: unknown, fallback?: unknown) {
  if (Array.isArray(value)) {
    const normalized = value
      .map(item => toExecutorName(item))
      .filter(Boolean)

    if (normalized.length) {
      return normalized.join("、")
    }
  }

  return toText(fallback, "-")
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

function formatWorkOrderStatus(value: unknown) {
  const status = toNumber(value)
  return getWorkOrderStatusLabel(status, "-")
}

function buildWorkOrderStatusValue(value: unknown): DetailStatusValue {
  const label = formatWorkOrderStatus(value)

  return {
    kind: "status",
    value: label,
    renderer: {
      kind: "status",
      map: workOrderStatusMap,
    },
  }
}

function formatWorkOrderResult(value: unknown) {
  const result = toNumber(value)

  if (result === null) return "未反馈"
  if (result === 0) return "未反馈"
  if (result === 1) return "正常"
  if (result === 2) return "轻微风险"
  if (result === 3) return "存在隐患"

  return `结果 ${result}`
}

function formatWorkOrderScore(value: unknown) {
  const score = toNumber(value)
  return score === null ? "-" : String(score)
}

function formatBuilds(value: WorkOrderBuildInfo[] | undefined) {
  if (!Array.isArray(value) || value.length === 0) {
    return "-"
  }

  const names = value
    .map(build => toText(build.BuildName, toText(build.BuildUuid, "")))
    .filter(Boolean)

  return names.length ? names.join("、") : "-"
}

function formatBuildInspectionProgress(value: WorkOrderBuildInfo[] | undefined) {
  if (!Array.isArray(value) || value.length === 0) {
    return "-"
  }

  let passTotal = 0
  let itemTotal = 0

  for (const build of value) {
    const buildPassTotal = toNumber(build.ItemPassTotal)
    const buildItemTotal = toNumber(build.ItemTotal)

    if (buildPassTotal !== null) {
      passTotal += buildPassTotal
    }

    if (buildItemTotal !== null) {
      itemTotal += buildItemTotal
    }
  }

  return itemTotal > 0 ? `${passTotal}/${itemTotal} 项通过` : "-"
}

function formatBuildResults(value: WorkOrderBuildInfo[] | undefined) {
  return formatBuildValues(value, (build) => {
    const result = toNumber(build.Result)
    return result === null ? "" : formatWorkOrderResult(result)
  })
}

function formatBuildScores(value: WorkOrderBuildInfo[] | undefined) {
  return formatBuildValues(value, build => formatWorkOrderScore(build.Score))
}

function formatBuildReports(value: WorkOrderBuildInfo[] | undefined) {
  return formatBuildValues(value, build => toText(build.ReportUrl, ""))
}

function formatBuildVersions(value: WorkOrderBuildInfo[] | undefined) {
  return formatBuildValues(value, build => toText(build.Version, ""))
}

function formatBuildValues(value: WorkOrderBuildInfo[] | undefined, resolveValue: (build: WorkOrderBuildInfo) => string) {
  if (!Array.isArray(value) || value.length === 0) {
    return "-"
  }

  const items = value
    .map((build, index) => {
      const itemValue = resolveValue(build)

      if (!itemValue || itemValue === "-") {
        return ""
      }

      const buildName = toText(build.BuildName, `建筑${index + 1}`)
      return `${buildName}: ${itemValue}`
    })
    .filter(Boolean)

  return items.length ? items.join("、") : "-"
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
