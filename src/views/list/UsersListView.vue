<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import { practitionerStatusMap } from "@/components/table-page/statusPresets"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { handleApiError } from "@/lib/api-errors"
import { listPractitioners, type PractitionerRecord } from "@/lib/practitioners-data"
const practitioners = ref<PractitionerRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const router = useRouter()

// 3. 用一个 schema 描述整张通用表格页。
// 页面作者主要维护这里：
// - 顶部标题、行主键
// - columns: 列展示、列筛选、列排序
// - filters: 不直接对应某一列的附加筛选
// - sort: 默认排序和排序持久化 key
// - tabs: 顶部标签页如何分组
//
// 这就是以后新建表格页时最主要的工作区，原则上不需要理解 table-page 层内部实现。
const schema: TablePageSchema<PractitionerRecord> = {
  title: "从业人员",
  description: "所有企业从业人员列表",
  rowKey: "id",
  data: [],
  primaryActionLabel: "添加从业人员",
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => console.info("查看从业人员详情", row),
    },
  ],
  columns: [
    // columns 决定“表格长什么样”，同时也顺带声明“这列怎么参与筛选/排序”。
    // 一个典型列通常只需要关心 4 件事：
    // - key: 对应哪一个字段
    // - label: 表头文案
    // - filter: 这列是否可以筛选
    // - sort: 这列是否参与排序
    {
      key: "name",
      label: "从业人员",
      filterType: "contact",
      variant: "contact",
      filter: {
        type: "text",
        placeholder: "输入姓名或手机号",
        defaultVisible: true,
        value: row => `${row.name} ${row.phone}`,
      },
      sort: {
        label: "从业人员",
        kind: "text",
        value: row => row.name,
      },
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "name",
        secondaryKey: "phone",
        primaryClass: "text-foreground",
        secondaryClass: "text-muted-foreground",
      },
    },
    {
      key: "company",
      label: "所属企业",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入企业名称",
        defaultVisible: true,
      },
      sort: true,
      cellClass: "font-medium text-foreground",
    },
    {
      key: "role",
      label: "岗位类型",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "district",
      label: "行政区域",
      filterType: "tag",
      filter: {
        type: "tag",
      },
      sort: true,
    },
    {
      key: "certificateLevel",
      label: "证件级别",
      filterType: "tag",
      filter: {
        type: "tag",
      },
      sort: true,
    },
    {
      key: "experienceYears",
      label: "从业年限",
      filterType: "number",
      variant: "metric",
      filter: {
        type: "number",
        placeholder: "输入从业年限",
      },
      sort: {
        label: "从业年限",
        kind: "metric",
      },
      cellRenderer: {
        kind: "metric-unit",
        unit: "年",
        valueClass: "tabular-nums text-link",
        unitClass: "ml-1 text-[12px] text-muted-foreground",
      },
    },
    {
      key: "joinedAt",
      label: "入职日期",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
      },
      sort: true,
    },
    {
      key: "status",
      label: "状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: practitionerStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
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
  // filters 用来放“不完全等于某一列”的筛选项。
  // 比如这里的“在页面中”本质是页面级关键字检索，所以单独声明为 fixed filter。
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
  // sort 只负责默认排序和本地持久化。
  // 如果某一列没声明 sort，它就不会出现在排序面板里。
  sort: {
    storageKey: "practitioners-sort-preferences",
    initialField: "experienceYears",
    initialDirection: "desc",
  },
  // tabs 描述顶部标签页的来源。
  // 这里表示：按 status 字段自动生成“全部 + 各状态”标签。
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "status",
  },
}

// 4. 把 schema 交给通用表格页控制器。
// 它会统一产出页面渲染所需的 tabs、filters、rows、sort state 等响应式状态。
const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: practitioners,
})
const route = useRoute()
const showInitialLoading = computed(() => loading.value && !practitioners.value.length && !errorMessage.value)

useRouteTableSearch(page, route)
onMounted(() => {
  void loadPractitioners()
})

function handleCreatePractitioner() {
  router.push({ name: "user-create" })
}

async function loadPractitioners() {
  loading.value = true
  errorMessage.value = ""

  try {
    practitioners.value = await listPractitioners()
  } catch (error) {
    practitioners.value = []
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "从业人员列表加载失败，请稍后重试。",
    })
  } finally {
    loading.value = false
  }
}

function buildPageFilterText(row: PractitionerRecord) {
  return [
    row.name,
    row.phone,
    row.company,
    row.role,
    row.district,
    row.certificateLevel,
    row.experienceYears,
    row.joinedAt,
    row.status,
    row.note,
  ].join(" ")
}
</script>

<template>
  <div class="space-y-4">
    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>从业人员加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <TablePageLoading v-if="showInitialLoading" />
    <TablePage v-else :page="page" @primary-action="handleCreatePractitioner" />
  </div>
</template>
