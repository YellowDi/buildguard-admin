<script setup lang="ts">
import { useRoute } from "vue-router"

import TablePage from "@/components/table-page/TablePage.vue"
import { processStatusMap } from "@/components/table-page/statusPresets"
import { useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"

type InspectionPlanRecord = {
  id: string
  planName: string
  serviceName: string
  customerName: string
  inspectionScope: string
  cycle: string
  owner: string
  nextExecutionAt: string
  status: string
  note: string
}

const inspectionPlans: InspectionPlanRecord[] = [
  {
    id: "IP-202603-001",
    planName: "3月园区消防设施月检",
    serviceName: "消防安全检测",
    customerName: "宁波宏达物流有限公司",
    inspectionScope: "1号仓库、2号仓库、综合楼",
    cycle: "每月",
    owner: "王工",
    nextExecutionAt: "2026-03-28 09:00",
    status: "进行中",
    note: "优先核查喷淋泵房和火灾报警主机。",
  },
  {
    id: "IP-202603-002",
    planName: "危化品库区防雷季度检测",
    serviceName: "防雷防静电检测",
    customerName: "北仑盛安危运有限公司",
    inspectionScope: "甲类库区、装卸台、接地系统",
    cycle: "每季度",
    owner: "陈颖",
    nextExecutionAt: "2026-04-05 14:30",
    status: "未开始",
    note: "检测前需确认近三个月整改闭环记录。",
  },
  {
    id: "IP-202603-003",
    planName: "运输车辆罐体年度专项检测",
    serviceName: "车辆设备检测",
    customerName: "余姚安泰危货运输有限公司",
    inspectionScope: "12台危运车辆",
    cycle: "每年",
    owner: "刘洋",
    nextExecutionAt: "2026-04-12 08:30",
    status: "待审核",
    note: "待客户确认排班窗口后统一下发任务。",
  },
  {
    id: "IP-202603-004",
    planName: "园区电气火灾隐患复检",
    serviceName: "电气安全检测",
    customerName: "慈溪联运仓储有限公司",
    inspectionScope: "配电房、充电区、办公楼",
    cycle: "每半年",
    owner: "赵洁",
    nextExecutionAt: "2026-03-30 10:00",
    status: "已暂停",
    note: "客户申请延期，等待新的进场时间。",
  },
  {
    id: "IP-202603-005",
    planName: "重点企业年度综合检测计划",
    serviceName: "综合安全检测",
    customerName: "镇海鹏程危运有限公司",
    inspectionScope: "园区全域",
    cycle: "每年",
    owner: "孙博",
    nextExecutionAt: "2026-05-08 09:30",
    status: "已完成",
    note: "已完成首次年度检测，待归档报告。",
  },
]

const schema: TablePageSchema<InspectionPlanRecord> = {
  title: "检测计划",
  description: "检测计划静态列表，当前暂未接入接口。",
  rowKey: "id",
  data: inspectionPlans,
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

const page = useTablePage(schema)
const route = useRoute()

useRouteTableSearch(page, route)

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
  <TablePage :page="page" />
</template>
