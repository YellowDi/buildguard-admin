<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import SectionHeader from "@/components/layout/SectionHeader.vue"
import ExportTableDialog from "@/components/table-page/ExportTableDialog.vue"
import type { DetailContactValue, DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import DetailPageLoading from "@/components/loading/DetailPageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import SortPopover, { type SortRule } from "@/components/table-page/TableSortPopover.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import {
  exportTableData,
  SUPPORTED_TABLE_EXPORT_FORMATS,
  type TableExportFormat,
  type TableExportScope,
} from "@/components/table-page/export-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import { useDetailRouteTab } from "@/composables/useDetailRouteTab"
import DetailLayout from "@/layouts/DetailLayout.vue"
import inspectionServiceWorkOrdersData from "@/mocks/inspection-service-work-orders.json"
import { handleApiError } from "@/lib/api-errors"
import { fetchInspectionServiceDetail, type InspectionServiceListItem } from "@/lib/inspection-services-api"

type InspectionServiceDetailTab = "overview" | "plans" | "work-orders"
type InspectionServiceBuildRecord = {
  BuildUuid: string
  BuildId: number | null
  BuildName: string
  ParkUuid: string
  ParkId: number | null
  ParkName: string
}

type InspectionServiceDetailRecord = {
  uuid: string
  Name: string
  Level: string
  CustomerName: string
  ServiceStatus: string
  ExpireAt: string
  InspectionTotal: string
  InspectionRemaining: string
  ParkName: string
  BuildName: string
  CreatedAt: string
  UpdatedAt: string
  raw?: {
    customerUuid?: string
    managerName?: string
    managerPhone?: string
    templateUuid?: string
    templateName?: string
    remark?: string
    builds?: InspectionServiceBuildRecord[]
  }
}

type InspectionServiceBuildingRow = {
  id: string
  name: string
}

type InspectionServiceWorkOrderRow = {
  id: string
  uuid: string
  orderNo: string
  planName: string
  packageName: string
  customerName: string
  deadline: string
  executor: string
  statusValue: number | null
  statusLabel: string
  score: number | null
  scoreLabel: string
  resultValue: number | null
  resultLabel: string
  remark: string
  createdAt: string
  updatedAt: string
}

type InspectionServiceWorkOrderItem = {
  Uuid?: string
  Id?: number
  OrderNo?: string
  PlanName?: string
  PackageName?: string
  CustomerName?: string
  CorpName?: string
  Deadline?: string
  Executor?: string
  Status?: number
  Score?: number
  Result?: number
  Remark?: string
  CreatedAt?: string
  UpdatedAt?: string
}

const route = useRoute()
const router = useRouter()
const inspectionServiceDetailTabIds = ["overview", "plans", "work-orders"] as const
const detail = ref<InspectionServiceDetailRecord | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const workOrders = ref<InspectionServiceWorkOrderRow[]>([])
const workOrdersLoading = ref(false)
const workOrdersErrorMessage = ref("")
const workOrdersPageNum = ref(1)
const workOrdersPageSize = ref(10)
const workOrdersTotal = ref(0)
const workOrdersSortPopoverOpen = ref(false)
const workOrdersExportDialogOpen = ref(false)
const workOrdersExporting = ref(false)
let latestRequestId = 0
let latestWorkOrdersRequestId = 0

const inspectionServiceUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const { activeTab, setActiveTab } = useDetailRouteTab<InspectionServiceDetailTab>({
  route,
  router,
  tabs: inspectionServiceDetailTabIds,
  defaultTab: "overview",
})
const detailTabs = computed(() => [
  { id: "overview", label: "基础信息" },
  { id: "plans", label: "检测计划" },
  { id: "work-orders", label: "工单列表" },
])
const detailHeaderTabs = computed(() => detailTabs.value.map(tab => ({
  ...tab,
  active: activeTab.value === tab.id,
})))
const activeDetailTabId = computed(() => detailHeaderTabs.value.find(tab => tab.active)?.id ?? detailHeaderTabs.value[0]?.id ?? "")
const detailToolbarButtonClass =
  "inline-flex size-8 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground active:bg-surface-secondary"
const detailToolbarButtonActiveClass =
  "bg-transparent text-link hover:bg-surface-tertiary active:bg-surface-secondary"

const fieldSections = computed<DetailFieldSection[]>(() => {
  if (!detail.value) {
    return []
  }

  return [
    {
      key: "inspection-service-base",
      title: "服务信息",
      rows: [
        { key: "name", label: "服务名称", value: detail.value.Name },
        { key: "status", label: "服务状态", value: detail.value.ServiceStatus },
        { key: "expire-at", label: "到期时间", value: detail.value.ExpireAt },
        { key: "customer-name", label: "客户名称", value: detail.value.CustomerName },
        { key: "inspection-total", label: "套餐总检测次数", value: detail.value.InspectionTotal },
        { key: "inspection-remaining", label: "剩余次数", value: detail.value.InspectionRemaining },
        { key: "created-at", label: "创建时间", value: detail.value.CreatedAt },
        { key: "updated-at", label: "更新时间", value: detail.value.UpdatedAt },
        { key: "remark", label: "备注", value: toText(detail.value.raw?.remark, "-"), truncate: false, valueClass: "leading-6" },
      ],
    },
    {
      key: "inspection-service-manager",
      title: "负责人信息",
      rows: [
        {
          key: "manager",
          label: "负责人",
          value: buildContactValue(
            toText(detail.value.raw?.managerName, "未填写"),
            toText(detail.value.raw?.managerPhone, "-"),
          ),
        },
      ],
    },
  ]
})

const buildingModule = computed<DetailRelationModuleSchema<InspectionServiceBuildingRow>>(() => ({
  key: "inspection-service-buildings",
  title: "园区 / 建筑列表",
  count: detail.value?.raw?.builds?.length ?? 0,
  rowKey: "id",
  columns: [
    { key: "name", label: "建筑名称", cellClass: "truncate" },
  ],
  groups: buildParkGroups(detail.value?.raw?.builds),
  mobileMinWidth: "24rem",
  columnTemplateMobile: "minmax(12rem,1fr)",
  columnTemplateDesktop: "minmax(12rem,1fr)",
}))

const workOrdersTotalPages = computed(() => Math.max(1, Math.ceil(workOrdersTotal.value / workOrdersPageSize.value)))
const workOrdersSchema: TablePageSchema<InspectionServiceWorkOrderRow> = {
  title: "",
  description: "",
  rowKey: "uuid",
  data: [],
  showIndex: true,
  stickyHeader: true,
  wrapperClass: "rounded-none border-0 shadow-none",
  emptyState: {
    title: "暂无工单数据",
    description: "当前检测服务下暂无可展示的工单。",
    icon: "ri-file-list-3-line",
  },
  columns: [
    {
      key: "orderNo",
      label: "工单编号",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入工单编号",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "planName",
      label: "计划名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入计划名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "customerName",
      label: "客户名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入客户名称",
      },
      sort: true,
    },
    {
      key: "deadline",
      label: "截止时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.deadline),
      },
      sort: true,
    },
    {
      key: "executor",
      label: "执行人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入执行人",
      },
      sort: true,
    },
    {
      key: "statusLabel",
      label: "状态",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "状态",
        kind: "metric",
        value: row => row.statusValue ?? -1,
      },
    },
    {
      key: "scoreLabel",
      label: "评分",
      filterType: "number",
      format: "numeric",
      filter: {
        type: "number",
        value: row => row.score ?? -1,
      },
      sort: {
        label: "评分",
        kind: "metric",
        value: row => row.score ?? -1,
      },
    },
    {
      key: "resultLabel",
      label: "结果",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "结果",
        kind: "metric",
        value: row => row.resultValue ?? -1,
      },
    },
    {
      key: "updatedAt",
      label: "更新时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.updatedAt),
      },
      sort: true,
    },
    {
      key: "remark",
      label: "备注",
      filterType: "none",
      variant: "note",
      format: "note",
      tone: "muted",
      width: "fill",
      cellRenderer: { kind: "note" },
    },
  ],
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => buildWorkOrderFilterText(row),
    },
  ],
  sort: {
    storageKey: "inspection-service-detail-work-orders-sort-preferences",
    initialField: "updatedAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}
const workOrdersPage = useTablePage({
  ...createTablePageDefinition(workOrdersSchema),
  rows: workOrders,
})
const workOrdersAvailableExportFormats = [...SUPPORTED_TABLE_EXPORT_FORMATS]

watch(inspectionServiceUuid, (uuid) => {
  void loadInspectionServiceDetail(uuid)
}, { immediate: true })

watch(
  [activeTab, workOrdersPageNum, workOrdersPageSize, () => detail.value?.Name ?? ""],
  ([nextTab, nextPageNum, nextPageSize, nextPackageName], [previousTab, previousPageNum, previousPageSize, previousPackageName]) => {
    if (nextTab !== "work-orders") {
      return
    }

    if (
      nextTab === previousTab
      && nextPageNum === previousPageNum
      && nextPageSize === previousPageSize
      && nextPackageName === previousPackageName
      && workOrders.value.length
    ) {
      return
    }

    void loadWorkOrders()
  },
  { immediate: true },
)

watch(detail, (current) => {
  detailBreadcrumbTitle.value = current?.Name ?? null
})

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

async function loadInspectionServiceDetail(uuid: string) {
  const requestId = ++latestRequestId

  if (!uuid) {
    detail.value = null
    errorMessage.value = "检测服务详情参数缺失，无法加载详情。"
    return
  }

  try {
    loading.value = true
    errorMessage.value = ""

    const response = await fetchInspectionServiceDetail({
      Uuid: uuid,
    })

    if (requestId !== latestRequestId) {
      return
    }

    detail.value = normalizeInspectionServiceDetail(response)
    errorMessage.value = ""
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    detail.value = null
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测服务详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function goBack() {
  router.back()
}

async function loadWorkOrders() {
  const requestId = ++latestWorkOrdersRequestId
  const packageName = toText(detail.value?.Name)

  if (!packageName) {
    workOrders.value = []
    workOrdersTotal.value = 0
    workOrdersErrorMessage.value = "缺少服务名称，无法加载工单列表。"
    return
  }

  try {
    workOrdersLoading.value = true
    workOrdersErrorMessage.value = ""

    const allItems = getInspectionServiceWorkOrders()
      .filter(item => toText(item.PackageName) === packageName)
    const start = Math.max(workOrdersPageNum.value - 1, 0) * Math.max(workOrdersPageSize.value, 1)
    const end = start + Math.max(workOrdersPageSize.value, 1)

    if (requestId !== latestWorkOrdersRequestId) {
      return
    }

    workOrders.value = allItems.slice(start, end).map((item, index) => normalizeWorkOrderRow(item, index))
    workOrdersTotal.value = allItems.length
  } catch (error) {
    if (requestId !== latestWorkOrdersRequestId) {
      return
    }

    workOrders.value = []
    workOrdersTotal.value = 0
    workOrdersErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "工单列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestWorkOrdersRequestId) {
      workOrdersLoading.value = false
    }
  }
}

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return fallback
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
}

function normalizeInspectionServiceDetail(item: InspectionServiceListItem): InspectionServiceDetailRecord {
  const uuid = toText(item.Uuid, toText(item.Id))
  const builds = Array.isArray(item.Builds) ? item.Builds : []
  const parkNames = uniqueText(builds.map(build => toText(build.ParkName)).filter(Boolean))
  const buildNames = uniqueText(builds.map(build => toText(build.BuildName)).filter(Boolean))

  return {
    uuid,
    Name: toText(item.Name, "未命名服务"),
    Level: toText(item.Level, "未分级"),
    CustomerName: toText(item.CustomerName, "未绑定客户"),
    ServiceStatus: getFirstText(item, ["ServiceStatusLabel", "ServiceStatus", "StatusLabel", "StatusName", "Status"], "-"),
    ExpireAt: getFirstText(item, ["ExpireAt", "ExpiredAt", "EndAt", "ServiceEndAt", "PackageExpireAt", "DueAt"], "-"),
    InspectionTotal: getFirstText(item, ["TotalInspectionCount", "InspectionTotalCount", "PackageTotalInspectionCount", "TotalCount"], "-"),
    InspectionRemaining: getFirstText(item, ["RemainInspectionCount", "RemainingInspectionCount", "PackageRemainInspectionCount", "RemainCount"], "-"),
    ParkName: parkNames.length ? parkNames.join("、") : "-",
    BuildName: buildNames.length ? buildNames.join("、") : "-",
    CreatedAt: toText(item.CreatedAt, "-"),
    UpdatedAt: toText(item.UpdatedAt, "-"),
    raw: {
      customerUuid: toText(item.CustomerUuid, "-"),
      managerName: toText(item.ManagerName, "未填写"),
      managerPhone: toText(item.ManagerPhone, "-"),
      templateUuid: toText(item.TemplateUuid, "-"),
      templateName: toText(item.TemplateName, "未配置模板"),
      remark: toText(item.Remark, ""),
      builds: builds.map(build => ({
        BuildUuid: toText(build.BuildUuid, "-"),
        BuildId: toNumber(build.BuildId),
        BuildName: toText(build.BuildName, "-"),
        ParkUuid: toText(build.ParkUuid, "-"),
        ParkId: toNumber(build.ParkId),
        ParkName: toText(build.ParkName, "-"),
      })),
    },
  }
}

function formatBuilds(builds?: InspectionServiceBuildRecord[]) {
  if (!Array.isArray(builds) || !builds.length) {
    return "-"
  }

  return builds.map((build) => {
    const parkName = toText(build.ParkName, "未命名园区")
    const buildName = toText(build.BuildName, "未命名楼栋")

    return `${parkName} / ${buildName}`
  }).join("；")
}

function getFirstText(
  record: Record<string, unknown>,
  keys: string[],
  fallback = "",
) {
  for (const key of keys) {
    const value = toText(record[key])

    if (value) {
      return value
    }
  }

  return fallback
}

function buildParkGroups(builds?: InspectionServiceBuildRecord[]) {
  if (!Array.isArray(builds) || !builds.length) {
    return []
  }

  const parkMap = new Map<string, InspectionServiceBuildingRow[]>()

  for (const build of builds) {
    const parkName = toText(build.ParkName, "未命名园区")
    const nextRow = {
      id: toText(build.BuildUuid, `${parkName}-${toText(build.BuildName, "building")}`),
      name: toText(build.BuildName, "未命名建筑"),
    }

    const currentRows = parkMap.get(parkName) ?? []
    currentRows.push(nextRow)
    parkMap.set(parkName, currentRows)
  }

  return Array.from(parkMap.entries()).map(([parkName, rows]) => ({
    key: parkName,
    title: parkName,
    rows,
  }))
}

function normalizeWorkOrderRow(item: InspectionServiceWorkOrderItem, index: number): InspectionServiceWorkOrderRow {
  const uuid = toText(item.Uuid, toText(item.Id, `${workOrdersPageNum.value}-${index + 1}`))
  const fallbackId = toText(item.Id, `${workOrdersPageNum.value}-${index + 1}`)
  const statusValue = toNumber(item.Status)
  const score = toNumber(item.Score)
  const resultValue = toNumber(item.Result)

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    orderNo: toText(item.OrderNo, "-"),
    planName: toText(item.PlanName, "-"),
    packageName: toText(item.PackageName, "-"),
    // 接口字段从 CustomerName 调整为 CorpName
    customerName: toText(item.CorpName || item.CustomerName, "-"),
    deadline: toText(item.Deadline, "-"),
    executor: toText(item.Executor, "-"),
    statusValue,
    statusLabel: formatWorkOrderStatus(statusValue),
    score,
    scoreLabel: formatWorkOrderScore(score),
    resultValue,
    resultLabel: formatWorkOrderResult(resultValue),
    remark: toText(item.Remark, "-"),
    createdAt: toText(item.CreatedAt, "-"),
    updatedAt: toText(item.UpdatedAt, "-"),
  }
}

function buildWorkOrderFilterText(row: InspectionServiceWorkOrderRow) {
  return [
    row.orderNo,
    row.planName,
    row.packageName,
    row.customerName,
    row.deadline,
    row.executor,
    row.statusLabel,
    row.scoreLabel,
    row.resultLabel,
    row.remark,
    row.createdAt,
    row.updatedAt,
  ].join(" ")
}

function formatWorkOrderStatus(status: number | null) {
  if (status === null) {
    return "未知状态"
  }

  switch (status) {
    case 1:
      return "待指派"
    case 2:
      return "待开始"
    case 3:
      return "进行中"
    case 4:
      return "报告生成中"
    case 5:
      return "已结单"
    default:
      return `状态 ${status}`
  }
}

function formatWorkOrderResult(result: number | null) {
  if (result === null) {
    return "未反馈"
  }

  switch (result) {
    case 0:
      return "未反馈"
    case 1:
      return "正常"
    case 2:
      return "异常"
    case 3:
      return "已驳回"
    default:
      return `结果 ${result}`
  }
}

function formatWorkOrderScore(score: number | null) {
  if (score === null) {
    return "-"
  }

  return String(score)
}

function handleWorkOrdersToolbarAddSort() {
  const sortFieldOptions = workOrdersPage.sortFieldOptions.value
  if (!sortFieldOptions.length) {
    return
  }

  if (!workOrdersPage.showControls.value) {
    workOrdersPage.showControls.value = true
  }

  if (!workOrdersPage.customSortEnabled.value || !workOrdersPage.sortRules.value.length) {
    const fallbackField = sortFieldOptions[0]?.value ?? ""
    const unusedField = sortFieldOptions.find((option) => !workOrdersPage.sortRules.value.some((rule) => rule.field === option.value))?.value
      ?? fallbackField
    const fieldMeta = sortFieldOptions.find(option => option.value === unusedField)

    const nextRule: SortRule = {
      id: `sort-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      field: unusedField,
      direction: fieldMeta?.kind === "metric" ? "desc" : "asc",
    }

    workOrdersPage.customSortEnabled.value = true
    workOrdersPage.sortRules.value = [nextRule]
  }

  workOrdersSortPopoverOpen.value = !workOrdersSortPopoverOpen.value
}

function handleWorkOrdersMobileActionSelect(key: string) {
  switch (key) {
    case "toggle-filters":
      workOrdersPage.showControls.value = !workOrdersPage.showControls.value
      return
    case "toggle-sort":
      if (workOrdersPage.customSortEnabled.value) {
        workOrdersPage.customSortEnabled.value = false
        return
      }

      const sortFieldOptions = workOrdersPage.sortFieldOptions.value
      if (!sortFieldOptions.length) {
        return
      }

      if (!workOrdersPage.showControls.value) {
        workOrdersPage.showControls.value = true
      }

      if (!workOrdersPage.sortRules.value.length) {
        const fallbackField = sortFieldOptions[0]?.value ?? ""
        const fieldMeta = sortFieldOptions.find(option => option.value === fallbackField)

        workOrdersPage.sortRules.value = [{
          id: `sort-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          field: fallbackField,
          direction: fieldMeta?.kind === "metric" ? "desc" : "asc",
        }]
      }

      workOrdersPage.customSortEnabled.value = true
      return
    case "export":
      workOrdersExportDialogOpen.value = true
      return
  }
}

function handleWorkOrdersExportConfirm(payload: { scope: TableExportScope; format: TableExportFormat }) {
  if (workOrdersExporting.value) {
    return
  }

  const exportRows = payload.scope === "selected"
    ? workOrdersPage.selectedRows.value
    : workOrdersPage.filteredRows.value

  if (!exportRows.length) {
    return
  }

  workOrdersExporting.value = true

  try {
    exportTableData({
      title: detail.value?.Name ? `${detail.value.Name}-工单列表` : "工单列表",
      columns: workOrdersPage.columns,
      rows: exportRows,
      format: payload.format,
    })
    workOrdersExportDialogOpen.value = false
  } catch (error) {
    handleApiError(error, {
      title: "导出失败",
      fallback: "导出失败，请稍后重试。",
    })
  } finally {
    workOrdersExporting.value = false
  }
}

function buildContactValue(name: string, phone?: string): DetailContactValue {
  return {
    kind: "contact",
    name,
    phone,
  }
}

function getInspectionServiceWorkOrders() {
  return inspectionServiceWorkOrdersData as InspectionServiceWorkOrderItem[]
}

</script>

<template>
  <DetailPageLoading v-if="loading && !detail" />

  <section
    v-else-if="detail && activeTab === 'work-orders'"
    class="detail-layout mx-auto flex min-h-0 w-full max-w-[1440px] min-w-0 flex-1 flex-col px-0 sm:px-4 xl:px-8"
  >
    <div class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-4">
      <div class="px-1 pt-4 sm:px-4 sm:pt-5">
        <SectionHeader :title="detail.Name" :subtitle="detail.CustomerName">
          <template #leading>
            <button
              type="button"
              class="inline-flex size-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="返回"
              @click="goBack"
            >
              <i class="ri-arrow-left-line text-[18px]" />
            </button>
          </template>
        </SectionHeader>

        <div class="mt-4 border-b border-border text-muted-foreground">
          <div class="flex items-center gap-2 pb-2 sm:hidden">
            <Select :model-value="activeDetailTabId" @update:model-value="setActiveTab($event as InspectionServiceDetailTab)">
              <SelectTrigger class="h-9 min-w-0 flex-1 rounded-md bg-background text-[14px]">
                <SelectValue placeholder="选择分页" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="tab in detailHeaderTabs"
                  :key="tab.id"
                  :value="tab.id"
                >
                  {{ tab.label }}
                </SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" size="sm" class="h-9 gap-1 px-3 text-[14px]">
                  <i class="ri-more-2-line text-base" />
                  操作
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" class="w-52 rounded-xl p-1.5 sm:hidden">
                <DropdownMenuItem class="rounded-lg px-2.5 py-2" @select="handleWorkOrdersMobileActionSelect('toggle-filters')">
                  <i class="ri-filter-3-line mr-2 text-base text-muted-foreground" />
                  {{ workOrdersPage.showControls.value ? "隐藏筛选" : "显示筛选" }}
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-lg px-2.5 py-2" @select="handleWorkOrdersMobileActionSelect('toggle-sort')">
                  <i class="ri-sort-asc mr-2 text-base text-muted-foreground" />
                  {{ workOrdersPage.customSortEnabled.value ? "关闭排序" : "启用排序" }}
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-lg px-2.5 py-2" @select="handleWorkOrdersMobileActionSelect('export')">
                  <i class="ri-download-line mr-2 text-base text-muted-foreground" />
                  导出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div class="hidden min-w-0 flex-row flex-wrap items-end gap-x-6 gap-y-3 sm:flex">
            <nav class="flex min-w-0 flex-[999_1_24rem] flex-wrap items-center text-[14px]" aria-label="检测服务详情页面切换">
            <button
              v-for="tab in detailHeaderTabs"
              :key="tab.id"
              type="button"
              :aria-pressed="tab.active"
              :class="[
                'group relative px-3 pb-[11px] text-muted-foreground transition-colors hover:text-foreground',
                tab.active ? 'font-semibold text-foreground' : '',
              ]"
              @click="setActiveTab(tab.id as InspectionServiceDetailTab)"
            >
              <span class="relative isolate inline-block">
                <span class="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-md transition-colors group-hover:bg-surface-tertiary" />
                <span class="relative z-10">{{ tab.label }}</span>
              </span>
              <span
                v-if="tab.active"
                class="absolute inset-x-0 bottom-0 h-0.5 bg-foreground"
              />
            </button>
            </nav>

            <div class="flex min-w-0 w-auto flex-[0_0_auto] items-center justify-end gap-1 pb-2 text-muted-foreground">
            <button
              type="button"
              :class="[
                detailToolbarButtonClass,
                workOrdersPage.showControls.value ? detailToolbarButtonActiveClass : '',
              ]"
              @click="workOrdersPage.showControls.value = !workOrdersPage.showControls.value"
            >
              <i :class="['ri-filter-3-line text-[17px]', workOrdersPage.showControls.value ? 'text-link' : '']" />
            </button>

            <Popover :open="workOrdersSortPopoverOpen" @update:open="workOrdersSortPopoverOpen = $event">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  :class="[
                    detailToolbarButtonClass,
                    workOrdersPage.customSortEnabled.value ? detailToolbarButtonActiveClass : '',
                  ]"
                  @click="handleWorkOrdersToolbarAddSort"
                >
                  <i :class="['ri-sort-asc text-[17px]', workOrdersPage.customSortEnabled.value ? 'text-link' : '']" />
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                :side-offset="10"
                class="w-auto border-0 bg-transparent p-0 shadow-none"
              >
                <SortPopover
                  :enabled="workOrdersPage.customSortEnabled.value"
                  :rules="workOrdersPage.sortRules.value"
                  :field-options="workOrdersPage.sortFieldOptions.value"
                  @close="workOrdersSortPopoverOpen = false"
                  @set-enabled="workOrdersPage.customSortEnabled.value = $event"
                  @update-rules="workOrdersPage.sortRules.value = $event"
                />
              </PopoverContent>
            </Popover>

            <button type="button" :class="detailToolbarButtonClass">
              <i class="ri-more-line text-base" />
            </button>

            <Button
              variant="outline"
              class="h-8 gap-1 px-3 text-[14px]"
              @click="workOrdersExportDialogOpen = true"
            >
              <i class="ri-download-line text-base" />
              导出
            </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col">
      <Alert v-if="errorMessage" variant="destructive" class="mx-4 mb-5 sm:mx-0">
        <AlertTitle>检测服务详情加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div class="flex min-h-0 flex-1 flex-col gap-5">
        <div v-if="workOrdersErrorMessage" class="px-4 sm:px-0">
          <Alert variant="destructive">
            <AlertTitle>工单列表加载失败</AlertTitle>
            <AlertDescription>{{ workOrdersErrorMessage }}</AlertDescription>
          </Alert>
        </div>

        <div v-if="workOrdersLoading" class="px-4 py-5 text-sm text-muted-foreground sm:px-0">
          正在加载当前检测服务下的工单列表。
        </div>

        <div v-else-if="workOrders.length" class="flex min-h-0 flex-1 flex-col">
          <TablePage :page="workOrdersPage" :show-toolbar-actions="false" :list-level-table="false" class="-mt-3 sm:-mx-4 xl:-mx-8" />

          <div class="mt-auto flex items-center justify-end gap-3 px-4 pt-4 sm:px-0">
            <span class="text-sm text-muted-foreground">
              第 {{ workOrdersPageNum }} / {{ workOrdersTotalPages }} 页，共 {{ workOrdersTotal }} 条
            </span>
            <Button
              variant="outline"
              size="sm"
              :disabled="workOrdersLoading || workOrdersPageNum <= 1"
              @click="workOrdersPageNum -= 1"
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="workOrdersLoading || workOrdersPageNum >= workOrdersTotalPages"
              @click="workOrdersPageNum += 1"
            >
              下一页
            </Button>
          </div>
        </div>

        <div v-else class="px-4 py-6 text-sm text-muted-foreground sm:px-0">
          当前服务下暂无工单数据。
        </div>
      </div>
    </div>
  </section>

  <DetailLayout
    v-else
    :title="detail?.Name || '检测服务详情'"
    :subtitle="detail?.CustomerName || ''"
    :empty="!detail"
    empty-text="未找到该检测服务信息"
    :secondary-visible="activeTab === 'overview'"
    :tabs="detailHeaderTabs"
    tabs-aria-label="检测服务详情页面切换"
    @back="goBack"
    @tab-click="setActiveTab($event as InspectionServiceDetailTab)"
  >
    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>检测服务详情加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div v-if="detail" class="space-y-5">
        <DetailFieldSections v-if="activeTab === 'overview'" :sections="fieldSections" />

        <section v-else-if="activeTab === 'plans'" class="space-y-3">
          <div class="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
            <div class="text-sm font-medium text-foreground">
              检测计划内容待接入
            </div>
            <div class="mt-1 text-xs text-muted-foreground">
              当前已预留详情页子页面结构，后续可接计划列表、计划状态、执行周期等信息。
            </div>
          </div>
          <p class="text-sm leading-6 text-muted-foreground">
            建议后续在这里承载计划表格或计划详情模块，而不是继续把所有内容堆在基础信息页。
          </p>
        </section>

      </div>
    </template>

    <template #secondary>
      <div v-if="detail && activeTab === 'overview'" class="pb-5">
        <DetailRelationModule :schema="buildingModule" />
      </div>
    </template>
  </DetailLayout>

  <ExportTableDialog
    :open="workOrdersExportDialogOpen"
    table-title="工单列表"
    :selected-rows-count="workOrdersPage.selectedRowsCount.value"
    :current-page-rows-count="workOrdersPage.currentPageRowsCount.value"
    :filtered-rows-count="workOrdersPage.filteredRowsCount.value"
    :total-rows-count="workOrdersPage.totalRowsCount.value"
    :current-filters-summary="workOrdersPage.activeFilterSummary.value"
    :is-exporting="workOrdersExporting"
    :available-formats="workOrdersAvailableExportFormats"
    @update:open="workOrdersExportDialogOpen = $event"
    @confirm="handleWorkOrdersExportConfirm"
  />
</template>
