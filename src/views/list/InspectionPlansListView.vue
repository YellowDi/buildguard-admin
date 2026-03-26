<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute } from "vue-router"

import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { processStatusMap } from "@/components/table-page/statusPresets"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { handleApiError } from "@/lib/api-errors"
import { listInspectionPlanRecords, type InspectionPlanRecord } from "@/lib/inspection-plan-records"

const inspectionPlans = ref<InspectionPlanRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")

const schema: TablePageSchema<InspectionPlanRecord> = {
  title: "检测计划",
  description: "检测计划列表",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => console.info("查看检测计划详情", row),
    },
  ],
  columns: [
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
      key: "serviceName",
      label: "关联服务",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入服务名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "customerName",
      label: "所属客户",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入客户名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "inspectionScope",
      label: "检测范围",
      filterType: "text",
      width: "fill",
      filter: {
        type: "text",
        placeholder: "输入检测范围",
      },
      sort: true,
    },
    {
      key: "cycle",
      label: "执行周期",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "owner",
      label: "负责人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入负责人",
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
      key: "status",
      label: "状态",
      filterType: "tag",
      tone: "warning",
      cellRenderer: {
        kind: "status",
        map: processStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "note",
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
    field: "status",
    order: ["未开始", "进行中", "待审核", "已暂停", "已完成"],
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: inspectionPlans,
})
const route = useRoute()
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

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function buildPageFilterText(row: InspectionPlanRecord) {
  return [
    row.id,
    row.planName,
    row.serviceName,
    row.customerName,
    row.inspectionScope,
    row.cycle,
    row.owner,
    row.nextExecutionAt,
    row.status,
    row.note,
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
    <TablePage v-else :page="page" />
  </div>
</template>
