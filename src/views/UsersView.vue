<script setup lang="ts">
import { useRouter } from "vue-router"

import ResourcePage from "@/components/resource/ResourcePage.vue"
import { useResourceList } from "@/components/resource/useResourceList"
import type { ResourceListSchema } from "@/components/resource/types"
import usersData from "@/data/users.json"

// 1. 先定义“表格每一行”的数据结构。
// 新建同类页面时，优先把这里改成接口返回或本地 mock 的真实行类型。
type PractitionerRecord = {
  id: number
  name: string
  phone: string
  company: string
  role: string
  district: string
  certificateLevel: string
  experienceYears: number
  joinedAt: string
  status: string
  note: string
}

// 2. 准备列表数据。
// 当前示例直接读取本地 JSON；未来接接口时，只要最终得到同结构的数组即可。
const practitioners = usersData as PractitionerRecord[]
const router = useRouter()

// 3. 用一个 schema 描述整张资源表格页。
// 页面作者主要维护这里：
// - 顶部标题、行主键
// - columns: 列展示、列搜索、列筛选、列排序
// - filters: 不直接对应某一列的附加筛选
// - sort: 默认排序和排序持久化 key
// - tabs: 顶部标签页如何分组
//
// 这就是以后新建表格页时最主要的工作区，原则上不需要理解资源层内部实现。
const schema: ResourceListSchema<PractitionerRecord> = {
  title: "从业人员",
  rowKey: "id",
  data: practitioners,
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
    // columns 决定“表格长什么样”，同时也顺带声明“这列怎么参与搜索/筛选/排序”。
    // 一个典型列通常只需要关心 4 件事：
    // - key: 对应哪一个字段
    // - label: 表头文案
    // - filter: 这列是否可以筛选
    // - sort/searchable: 这列是否参与排序或全文搜索
    {
      key: "name",
      label: "从业人员",
      filterType: "contact",
      variant: "contact",
      searchable: row => `${row.name} ${row.phone}`,
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
      searchable: true,
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
      searchable: true,
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
      searchable: true,
      filter: {
        type: "tag",
      },
      sort: true,
    },
    {
      key: "certificateLevel",
      label: "证件级别",
      filterType: "tag",
      searchable: true,
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
      searchable: row => `${row.experienceYears}`,
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
      searchable: true,
      filter: {
        type: "date",
      },
      sort: true,
    },
    {
      key: "status",
      label: "状态",
      filterType: "tag",
      searchable: true,
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
      searchable: true,
      cellRenderer: { kind: "note" },
    },
  ],
  // filters 用来放“不完全等于某一列”的筛选项。
  // 比如这里的“在页面中”本质是全页备注检索，所以单独声明为 fixed filter。
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => row.note,
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

// 4. 把 schema 交给通用资源控制器。
// 它会统一产出页面渲染所需的 tabs、filters、rows、sort state 等响应式状态。
const page = useResourceList(schema)

function handleCreatePractitioner() {
  router.push({ name: "user-create" })
}
</script>

<template>
  <!-- 5. 页面模板层保持极薄。
       以后新建同类页面时，理想状态就是：
       定义行类型 -> 准备数据 -> 写 schema -> 渲染 ResourcePage。 -->
  <ResourcePage :page="page" @primary-action="handleCreatePractitioner" />
</template>
