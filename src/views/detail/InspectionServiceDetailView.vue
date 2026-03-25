<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import SectionHeader from "@/components/layout/SectionHeader.vue"
import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import type { DetailContactValue, DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import DetailPageLoading from "@/components/loading/DetailPageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchInspectionServiceDetail, type InspectionServiceListItem } from "@/lib/inspection-services-api"
import { fetchWorkOrders, type WorkOrderListItem } from "@/lib/work-orders-api"

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

const route = useRoute()
const router = useRouter()
const detail = ref<InspectionServiceDetailRecord | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const activeTab = ref<InspectionServiceDetailTab>("overview")
const workOrders = ref<InspectionServiceWorkOrderRow[]>([])
const workOrdersLoading = ref(false)
const workOrdersErrorMessage = ref("")
const workOrdersPageNum = ref(1)
const workOrdersPageSize = ref(10)
const workOrdersTotal = ref(0)
let latestRequestId = 0
let latestWorkOrdersRequestId = 0

const inspectionServiceUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const detailTabs = computed(() => [
  { id: "overview", label: "基础信息" },
  { id: "plans", label: "检测计划" },
  { id: "work-orders", label: "工单列表" },
])

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
        { key: "status", label: "服务状态", value: "-" },
        { key: "expire-at", label: "到期时间", value: "-" },
        { key: "customer-name", label: "客户名称", value: detail.value.CustomerName },
        { key: "inspection-total", label: "套餐总检测次数", value: "-" },
        { key: "inspection-remaining", label: "剩余次数", value: "-" },
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
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "statusLabel",
  },
}
const workOrdersPage = useTablePage({
  ...createTablePageDefinition(workOrdersSchema),
  rows: workOrders,
})

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
    activeTab.value = "overview"
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

    const result = await fetchWorkOrders({
      PackageName: packageName,
      PageNum: workOrdersPageNum.value,
      PageSize: workOrdersPageSize.value,
    })

    if (requestId !== latestWorkOrdersRequestId) {
      return
    }

    workOrders.value = result.list.map((item, index) => normalizeWorkOrderRow(item, index))
    workOrdersTotal.value = result.total
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

function normalizeWorkOrderRow(item: WorkOrderListItem, index: number): InspectionServiceWorkOrderRow {
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
    customerName: toText(item.CustomerName, "-"),
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

function buildContactValue(name: string, phone?: string): DetailContactValue {
  return {
    kind: "contact",
    name,
    phone,
  }
}

</script>

<template>
  <DetailPageLoading v-if="loading && !detail" />

  <section
    v-else-if="detail && activeTab === 'work-orders'"
    class="mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col px-0 sm:px-4 xl:px-8"
  >
    <div class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-4">
      <div class="px-4 py-5">
        <SectionHeader :title="detail.Name" :subtitle="detail.CustomerName" :has-actions="true">
          <template #actions>
            <Button variant="outline" size="sm" class="border-border/80 bg-background font-medium text-foreground shadow-none" @click="goBack">
              返回
            </Button>
          </template>
        </SectionHeader>

        <div class="mt-4">
          <TopTabSwitch
            :tabs="detailTabs"
            :model-value="activeTab"
            :collapse-inactive="false"
            tone="default"
            aria-label="检测服务详情页面切换"
            @update:model-value="activeTab = $event as InspectionServiceDetailTab"
          />
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
          <TablePage :page="workOrdersPage" />

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
    @back="goBack"
  >
    <template #actions>
      <Button variant="outline" size="sm" class="border-border/80 bg-background font-medium text-foreground shadow-none" @click="goBack">
        返回
      </Button>
    </template>

    <template #headerBottom>
      <TopTabSwitch
        :tabs="detailTabs"
        :model-value="activeTab"
        :collapse-inactive="false"
        tone="default"
        aria-label="检测服务详情页面切换"
        @update:model-value="activeTab = $event as InspectionServiceDetailTab"
      />
    </template>

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
</template>
