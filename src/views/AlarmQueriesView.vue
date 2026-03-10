<script setup lang="ts">
import ResourcePage from "@/components/resource/ResourcePage.vue"
import { useResourceList } from "@/components/resource/useResourceList"
import type { ResourceListSchema } from "@/components/resource/types"
import vehiclesData from "@/data/vehicles.json"

type RawAlarmVehicleRecord = {
  plateNumber: string
  company: string
  riskLevel: string
  latestAlarm: string
  status: string
  note: string
}

type AlarmQueryRecord = {
  id: number
  plateNumber: string
  company: string
  riskLevel: string
  latestAlarm: string
  alarmTime: string
  status: string
  handler: string
  note: string
}

type VehicleDataBundle = {
  alarm: RawAlarmVehicleRecord[]
}

const { alarm: rawAlarmVehicles } = vehiclesData as VehicleDataBundle

const handlers = ["王立峰", "陈雨晴", "赵明昊", "李心妍"]
const alarmTimes = [
  "2026-03-10 09:18",
  "2026-03-10 08:46",
  "2026-03-10 08:12",
  "2026-03-10 07:55",
  "2026-03-09 22:41",
  "2026-03-09 21:33",
  "2026-03-09 19:28",
  "2026-03-09 18:06",
  "2026-03-09 16:44",
  "2026-03-09 15:09",
  "2026-03-09 11:27",
  "2026-03-09 10:18",
]

const alarmQueries: AlarmQueryRecord[] = rawAlarmVehicles.map((row, index) => ({
  id: index + 1,
  ...row,
  alarmTime: alarmTimes[index] ?? "2026-03-09 09:00",
  handler: handlers[index % handlers.length] ?? "未分配",
}))

const schema: ResourceListSchema<AlarmQueryRecord> = {
  title: "报警查询",
  rowKey: "id",
  data: alarmQueries,
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => console.info("查看报警详情", row),
    },
  ],
  columns: [
    {
      key: "plateNumber",
      label: "车牌号",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      searchable: true,
      filter: {
        type: "text",
        placeholder: "输入车牌号",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "company",
      label: "所属企业",
      filterType: "text",
      searchable: true,
      filter: {
        type: "text",
        placeholder: "输入企业名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "latestAlarm",
      label: "报警类型",
      filterType: "tag",
      searchable: true,
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "riskLevel",
      label: "风险等级",
      filterType: "tag",
      searchable: true,
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        value: row => getRiskLevelWeight(row.riskLevel),
      },
    },
    {
      key: "alarmTime",
      label: "报警时间",
      filterType: "time",
      format: "numeric",
      searchable: true,
      filter: {
        type: "date",
        defaultVisible: true,
        value: row => extractDatePart(row.alarmTime),
      },
      sort: true,
    },
    {
      key: "status",
      label: "处理状态",
      filterType: "tag",
      tone: "warning",
      searchable: true,
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "handler",
      label: "处理人",
      filterType: "text",
      searchable: true,
      filter: {
        type: "text",
        placeholder: "输入处理人",
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
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => `${row.note} ${row.handler}`,
    },
  ],
  sort: {
    storageKey: "alarm-queries-sort-preferences",
    initialField: "alarmTime",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "status",
  },
}

const page = useResourceList(schema)

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function getRiskLevelWeight(value: string) {
  if (value === "高") return 3
  if (value === "中") return 2
  if (value === "低") return 1
  return 0
}
</script>

<template>
  <ResourcePage :page="page" />
</template>
