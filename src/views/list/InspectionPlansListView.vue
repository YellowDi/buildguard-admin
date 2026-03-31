<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { handleApiError } from "@/lib/api-errors"
import { listInspectionPlanRecords, type InspectionPlanRecord } from "@/lib/inspection-plan-records"

const inspectionPlans = ref<InspectionPlanRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")

const inspectionPlanStatusMap = {
  未开始: { tone: "gray", icon: "dot" },
  进行中: { tone: "green", icon: "clock" },
  待审核: { tone: "orange", icon: "clock" },
  已暂停: { tone: "gray", icon: "minus" },
  已完成: { tone: "green", icon: "check" },
} as const

const inspectionPlanEnableStatusMap = {
  启用: { tone: "green", icon: "check" },
  禁用: { tone: "gray", icon: "minus" },
} as const

const schema: TablePageSchema<InspectionPlanRecord> = {
  title: "检测计划",
  description: "检测计划列表",
  primaryActionLabel: "添加检测计划",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无检测计划数据",
    description: "当前接口暂未返回可展示的检测计划列表。",
    icon: "ri-calendar-schedule-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => console.info("查看检测计划详情", row),
    },
  ],
  columns: [
    {
      key: "code",
      label: "计划编号",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入计划编号",
      },
      sort: true,
    },
    {
      key: "planName",
      label: "计划名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入计划名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "contractCode",
      label: "合同编号",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入合同编号",
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
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "serviceName",
      label: "服务名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入服务名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "cycle",
      label: "执行频率",
      filterType: "text",
      filter: {
        type: "text",
        defaultVisible: true,
        placeholder: "输入执行频率",
      },
      sort: true,
    },
    {
      key: "firstExecutionAt",
      label: "首次执行时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.firstExecutionAt),
      },
      sort: true,
    },
    {
      key: "latestExecutionAt",
      label: "最近执行时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.latestExecutionAt),
      },
      sort: true,
    },
    {
      key: "latestOrderNo",
      label: "最近执行订单号",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入最近执行订单号",
      },
      sort: true,
    },
    {
      key: "nextExecutionAt",
      label: "下次执行时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
        value: row => extractDatePart(row.nextExecutionAt),
      },
      sort: true,
    },
    {
      key: "creator",
      label: "创建人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入创建人",
      },
      sort: true,
    },
    {
      key: "createdAt",
      label: "创建时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.createdAt),
      },
      sort: true,
    },
    {
      key: "planStatus",
      label: "计划状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: inspectionPlanStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "enableStatus",
      label: "启用状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: inspectionPlanEnableStatusMap,
        fallback: { tone: "gray", icon: "minus" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
  ],
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => buildPageFilterText(row),
    },
  ],
  sort: {
    storageKey: "inspection-plans-sort-preferences",
    initialField: "nextExecutionAt",
    initialDirection: "asc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "enableStatus",
    order: ["启用", "禁用"],
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: inspectionPlans,
})
const route = useRoute()
const router = useRouter()
const showInitialLoading = computed(() => loading.value && !inspectionPlans.value.length && !errorMessage.value)

useRouteTableSearch(page, route)
onMounted(() => {
  void loadInspectionPlans()
})

async function loadInspectionPlans() {
  loading.value = true
  errorMessage.value = ""

  try {
    inspectionPlans.value = await listInspectionPlanRecords()
  } catch (error) {
    inspectionPlans.value = []
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测计划列表加载失败，请稍后重试。",
    })
  } finally {
    loading.value = false
  }
}

function handleCreateInspectionPlan() {
  void router.push({ name: "inspection-plan-create" })
}

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function buildPageFilterText(row: InspectionPlanRecord) {
  return [
    row.id,
    row.uuid,
    row.code,
    row.contractCode,
    row.planName,
    row.serviceName,
    row.customerName,
    row.cycle,
    row.firstExecutionAt,
    row.latestExecutionAt,
    row.latestOrderNo,
    row.nextExecutionAt,
    row.creator,
    row.createdAt,
    row.planStatus,
    row.enableStatus,
  ].join(" ")
}
</script>

<template>
  <div class="space-y-4">
    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>检测计划加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <TablePageLoading v-if="showInitialLoading" />
    <TablePage v-else :page="page" @primary-action="handleCreateInspectionPlan" />
  </div>
</template>
