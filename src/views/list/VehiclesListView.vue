<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import TabbedTablePage from "@/components/table-page/TabbedTablePage.vue"
import { processStatusMap } from "@/components/table-page/statusPresets"
import { useTablePage } from "@/components/table-page/useTablePage"
import type { HeaderTab, TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import vehiclesData from "@/mocks/vehicles.json"

// 1. 先定义“表格每一行”的数据结构。
// 车辆页是多表格页，所以这里会有多种行类型，分别对应不同子表。
type OperatingVehicleRecord = {
  plateNumber: string
  company: string
  vehicleType: string
  district: string
  onlineRate: string
  note: string
}

type AlarmVehicleRecord = {
  plateNumber: string
  company: string
  riskLevel: string
  latestAlarm: string
  status: string
  note: string
}

type InspectionVehicleRecord = {
  plateNumber: string
  company: string
  annualCheck: string
  maintenance: string
  nextReview: string
  note: string
}

type VehicleDataBundle = {
  operating: OperatingVehicleRecord[]
  alarm: AlarmVehicleRecord[]
  inspection: InspectionVehicleRecord[]
}

// 2. 准备页面数据。
// 当前示例读取本地 JSON，并在进入 schema 前统一补齐 note 等派生字段。
const VEHICLE_TAB_OVERVIEW = "overview"
const VEHICLE_TAB_ALARMS = "alarms"
const VEHICLE_TAB_INSPECTIONS = "inspections"

const {
  operating: operatingVehicles,
  alarm: alarmVehicles,
  inspection: inspectionVehicles,
} = buildVehicleDataBundle(vehiclesData as VehicleDataBundle)
const route = useRoute()
const router = useRouter()

// 3. 多表格页的核心规则：
// 不是为整页写一个复杂 controller，而是“每个子表各写一个 schema”。
// 车辆页和单表格页的区别只在这里：
// - 单表格页：一个 schema -> 一个 page
// - 多表格页：多个 schema -> 多个 page -> 顶层 tab 决定当前显示哪个 page
//
// 每一个子表本身仍然遵循“数据 -> schema -> useTablePage”的唯一方式。
const operatingSchema: TablePageSchema<OperatingVehicleRecord> = {
  title: "车辆",
  rowKey: "plateNumber",
  data: operatingVehicles,
  primaryActionLabel: "添加车辆",
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => console.info("查看车辆详情", row),
    },
  ],
  columns: [
    // columns 的维护规则和单表格页完全一致。
    // 每个子表都只在这里声明：列展示、列筛选、列排序。
    {
      key: "plateNumber",
      label: "车牌号",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
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
      filter: {
        type: "text",
        placeholder: "输入企业名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "vehicleType",
      label: "车辆类型",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "district",
      label: "所属区域",
      filterType: "tag",
      filter: {
        type: "tag",
      },
      sort: true,
    },
    {
      key: "onlineRate",
      label: "在线率",
      filterType: "number",
      tone: "accent",
      format: "numeric",
      filter: {
        type: "number",
        placeholder: "输入在线率",
        value: row => parseRate(row.onlineRate),
      },
      sort: {
        kind: "metric",
        value: row => parseRate(row.onlineRate),
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
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => buildOperatingPageFilterText(row),
    },
  ],
  sort: {
    storageKey: "vehicles-operating-sort-preferences",
    initialField: "onlineRate",
    initialDirection: "desc",
  },
}

// 报警车辆子表 schema。
const alarmSchema: TablePageSchema<AlarmVehicleRecord> = {
  title: "车辆",
  rowKey: "plateNumber",
  data: alarmVehicles,
  primaryActionLabel: "添加车辆",
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => console.info("查看车辆详情", row),
    },
  ],
  columns: [
    {
      key: "plateNumber",
      label: "车牌号",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
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
      filter: {
        type: "text",
        placeholder: "输入企业名称",
      },
      sort: true,
    },
    {
      key: "riskLevel",
      label: "风险等级",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        value: row => getRiskLevelWeight(row.riskLevel),
      },
    },
    {
      key: "latestAlarm",
      label: "最新报警",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入报警类型",
      },
      sort: true,
    },
    {
      key: "status",
      label: "处理状态",
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
      value: row => buildAlarmPageFilterText(row),
    },
  ],
  sort: {
    storageKey: "vehicles-alarm-sort-preferences",
    initialField: "riskLevel",
    initialDirection: "desc",
  },
}

// 年检与维保子表 schema。
const inspectionSchema: TablePageSchema<InspectionVehicleRecord> = {
  title: "车辆",
  rowKey: "plateNumber",
  data: inspectionVehicles,
  primaryActionLabel: "添加车辆",
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => console.info("查看车辆详情", row),
    },
  ],
  columns: [
    {
      key: "plateNumber",
      label: "车牌号",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
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
      filter: {
        type: "text",
        placeholder: "输入企业名称",
      },
      sort: true,
    },
    {
      key: "annualCheck",
      label: "年检日期",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "maintenance",
      label: "最近维保",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
      },
      sort: true,
    },
    {
      key: "nextReview",
      label: "下次复核",
      filterType: "time",
      tone: "accent",
      format: "numeric",
      filter: {
        type: "date",
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
      value: row => buildInspectionPageFilterText(row),
    },
  ],
  sort: {
    storageKey: "vehicles-inspection-sort-preferences",
    initialField: "nextReview",
    initialDirection: "asc",
  },
}

// 4. 每个 schema 各自生成一个 page。
// 这一步之后，每个子表都已经拥有完整的筛选、排序和表格状态。
const operatingPage = useTablePage(operatingSchema)
const alarmPage = useTablePage(alarmSchema)
const inspectionPage = useTablePage(inspectionSchema)

useRouteTableSearch(operatingPage, route)
useRouteTableSearch(alarmPage, route)
useRouteTableSearch(inspectionPage, route)

const activeTab = ref(VEHICLE_TAB_OVERVIEW)

// 5. 顶层 tabs 只负责“切换当前看哪个子表”，不负责子表内部筛选逻辑。
const tabs = computed<HeaderTab[]>(() => [
  {
    label: "运营车辆",
    value: VEHICLE_TAB_OVERVIEW,
    count: operatingVehicles.length,
    active: activeTab.value === VEHICLE_TAB_OVERVIEW,
  },
  {
    label: "报警车辆",
    value: VEHICLE_TAB_ALARMS,
    count: alarmVehicles.length,
    active: activeTab.value === VEHICLE_TAB_ALARMS,
  },
  {
    label: "年检与维保",
    value: VEHICLE_TAB_INSPECTIONS,
    count: inspectionVehicles.length,
    active: activeTab.value === VEHICLE_TAB_INSPECTIONS,
  },
])

// 6. pageRegistry 是多表格页最关键的组织方式。
// 新建类似页面时，推荐一直沿用这个模式：
// - 把多个 page 收到一个 registry
// - 通过 activeTab 选出 activePage
// - 模板只渲染 TabbedTablePage
const pageRegistry = {
  [VEHICLE_TAB_OVERVIEW]: operatingPage,
  [VEHICLE_TAB_ALARMS]: alarmPage,
  [VEHICLE_TAB_INSPECTIONS]: inspectionPage,
} as const

const activePage = computed(() => pageRegistry[activeTab.value as keyof typeof pageRegistry] ?? operatingPage)

function handleTopLevelTabClick(tab: HeaderTab) {
  activeTab.value = `${tab.value ?? tab.label}`
}

watch(
  () => route.query.tab,
  (value) => {
    if (value === VEHICLE_TAB_OVERVIEW || value === VEHICLE_TAB_ALARMS || value === VEHICLE_TAB_INSPECTIONS) {
      activeTab.value = value
    }
  },
  { immediate: true },
)

function handleCreateVehicle() {
  router.push({ name: "vehicle-create" })
}

function parseRate(value: string) {
  return Number.parseFloat(value.replace("%", "")) || 0
}

function getRiskLevelWeight(value: string) {
  if (value === "高") return 3
  if (value === "中") return 2
  if (value === "低") return 1
  return 0
}

function buildVehicleDataBundle(bundle: VehicleDataBundle): VehicleDataBundle {
  return {
    operating: bundle.operating.map(row => ({
      ...row,
      note: buildOperatingNote(row),
    })),
    alarm: bundle.alarm.map(row => ({
      ...row,
      note: buildAlarmNote(row),
    })),
    inspection: bundle.inspection.map(row => ({
      ...row,
      note: buildInspectionNote(row),
    })),
  }
}

function buildOperatingNote(row: Omit<OperatingVehicleRecord, "note">) {
  const rate = parseRate(row.onlineRate)
  if (rate >= 99) return "在线状态稳定，近 7 日无离线波动"
  if (rate >= 98) return "偶发短时离线，建议持续关注终端状态"
  return "在线率偏低，建议排查终端与网络链路"
}

function buildOperatingPageFilterText(row: OperatingVehicleRecord) {
  return [
    row.plateNumber,
    row.company,
    row.vehicleType,
    row.district,
    row.onlineRate,
    row.note,
  ].join(" ")
}

function buildAlarmNote(row: Omit<AlarmVehicleRecord, "note">) {
  if (row.status === "待复核") return "报警记录待人工复核，建议优先核查处置结论"
  if (row.status === "处理中") return "事件已进入处置流程，需持续跟进反馈结果"
  return "工单已下发，等待现场回传处理结果"
}

function buildAlarmPageFilterText(row: AlarmVehicleRecord) {
  return [
    row.plateNumber,
    row.company,
    row.riskLevel,
    row.latestAlarm,
    row.status,
    row.note,
  ].join(" ")
}

function buildInspectionNote(row: Omit<InspectionVehicleRecord, "note">) {
  const remainingDays = getDaysUntil(row.nextReview)
  if (remainingDays <= 7) return "复核临近，请提前准备年检与维保材料"
  if (remainingDays <= 14) return "建议本周内确认复核排期，避免临近堆积"
  return "当前检维状态正常，可按计划推进下次复核"
}

function buildInspectionPageFilterText(row: InspectionVehicleRecord) {
  return [
    row.plateNumber,
    row.company,
    row.annualCheck,
    row.maintenance,
    row.nextReview,
    row.note,
  ].join(" ")
}

function getDaysUntil(dateString: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(`${dateString}T00:00:00`)

  if (Number.isNaN(targetDate.getTime())) {
    return Number.POSITIVE_INFINITY
  }

  return Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
</script>

<template>
  <!-- 7. 页面模板层保持极薄。
       多表格页也不要自己桥接每种筛选事件，而是把当前 activePage 交给统一页面壳。 -->
  <TabbedTablePage
    title="车辆"
    description="所有企业车辆列表"
    :tabs="tabs"
    :active-page="activePage"
    @tab-click="handleTopLevelTabClick"
    @primary-action="handleCreateVehicle"
  />
</template>
