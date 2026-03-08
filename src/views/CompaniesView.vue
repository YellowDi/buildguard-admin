<script setup lang="ts">
import ResourcePage from "@/components/resource/ResourcePage.vue"
import { useResourceList } from "@/components/resource/useResourceList"
import type { ResourceListSchema } from "@/components/resource/types"
import companiesData from "@/data/companies.json"

// 1. 先定义“表格每一行”的数据结构。
// 新建同类页面时，优先把这里改成接口返回或本地 mock 的真实行类型。
type CompanyRecord = {
  id: number
  name: string
  type: string
  district: string
  vehicles: number
  legalPerson: string
  phone: string
  startDate: string
  serviceDays: number
  endDate: string
  lastUpdated: string
  note: string
}

type RawCompanyRecord = Omit<CompanyRecord, "startDate" | "endDate">

// 2. 准备列表数据。
// 当前示例先把原始 JSON 转成最终页面使用的数据结构；
// 接接口时也建议把这种轻量转换留在页面顶部，避免把业务脏数据传进 schema。
const companies = (companiesData as RawCompanyRecord[]).map((company) => {
  const startDate = extractDatePart(company.lastUpdated)
  const endDate = buildEndDate(company.serviceDays)

  return {
    ...company,
    startDate,
    endDate,
    serviceDays: getRemainingDays(endDate),
  }
})

// 3. 用一个 schema 描述整张资源表格页。
// 页面作者主要维护这里：
// - 顶部标题、行主键
// - columns: 列展示、列搜索、列筛选、列排序
// - filters: 不直接对应某一列的附加筛选
// - sort: 默认排序和排序持久化 key
// - tabs: 顶部标签页如何分组
//
// 这就是以后新建表格页时最主要的工作区，原则上不需要理解资源层内部实现。
const schema: ResourceListSchema<CompanyRecord> = {
  title: "企业",
  rowKey: "id",
  data: companies,
  primaryActionLabel: "添加企业",
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => console.info("查看企业详情", row),
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
      label: "企业名称",
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
      headerClass: "pr-3",
    },
    {
      key: "type",
      label: "企业类型",
      filterType: "tag",
      searchable: true,
      filter: {
        type: "tag",
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
      key: "vehicles",
      label: "车辆总数",
      filterType: "number",
      format: "numeric",
      searchable: row => `${row.vehicles}`,
      filter: {
        type: "number",
        placeholder: "输入车辆总数",
        defaultVisible: true,
      },
      sort: {
        kind: "metric",
      },
    },
    {
      key: "legalPerson",
      label: "法人信息",
      filterType: "contact",
      variant: "contact",
      searchable: row => `${row.legalPerson} ${row.phone}`,
      filter: {
        type: "text",
        placeholder: "输入法人或手机号",
        defaultVisible: true,
        value: row => `${row.legalPerson} ${row.phone}`,
      },
      sort: {
        label: "法人信息",
        value: row => `${row.legalPerson} ${row.phone}`,
      },
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "legalPerson",
        secondaryKey: "phone",
      },
    },
    {
      key: "serviceDays",
      label: "服务剩余时长",
      filterType: "number",
      variant: "metric",
      searchable: row => `${row.serviceDays}`,
      filter: {
        type: "number",
        placeholder: "输入剩余时长",
      },
      sort: {
        kind: "metric",
      },
      cellRenderer: {
        kind: "metric-unit",
        unit: "天",
      },
    },
    {
      key: "startDate",
      label: "开始日期",
      filterType: "time",
      format: "numeric",
      searchable: true,
      filter: {
        type: "date",
      },
      sort: true,
    },
    {
      key: "endDate",
      label: "结束日期",
      filterType: "time",
      format: "numeric",
      searchable: true,
      filter: {
        type: "date",
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
      searchable: true,
      cellRenderer: { kind: "note" },
    },
  ],
  // filters 用来放“不完全等于某一列”的筛选项。
  // 比如这里的“在页面中”本质是备注检索，所以单独声明为 fixed filter。
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
    storageKey: "companies-sort-preferences",
    initialField: "serviceDays",
    initialDirection: "desc",
  },
  // tabs 描述顶部标签页的来源。
  // 这里表示：按 type 字段自动生成“全部 + 各企业类型”标签。
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "type",
  },
}

// 4. 把 schema 交给通用资源控制器。
// 它会统一产出页面渲染所需的 tabs、filters、rows、sort state 等响应式状态。
const page = useResourceList(schema)

function buildEndDate(serviceDays: number) {
  const baseDate = new Date()
  baseDate.setHours(0, 0, 0, 0)
  baseDate.setDate(baseDate.getDate() + serviceDays)
  return toISODate(baseDate)
}

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function getRemainingDays(endDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) {
    return 0
  }

  const diff = targetDate.getTime() - today.getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}
</script>

<template>
  <!-- 5. 页面模板层保持极薄。
       以后新建同类页面时，理想状态就是：
       定义行类型 -> 准备数据 -> 写 schema -> 渲染 ResourcePage。 -->
  <ResourcePage :page="page" />
</template>
