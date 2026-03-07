<script setup lang="ts">
import { computed, ref } from "vue"

import ResourceListHeader from "@/components/resource/ResourceListHeader.vue"
import ResourceTable from "@/components/resource/ResourceTable.vue"
import type { SortRule } from "@/components/resource/SortPopover.vue"
import type { ResourceHeaderTab, ResourceTableColumn } from "@/components/resource/types"

type OperatingVehicle = {
  plateNumber: string
  company: string
  vehicleType: string
  district: string
  onlineRate: string
}

type AlarmVehicle = {
  plateNumber: string
  company: string
  riskLevel: string
  latestAlarm: string
  status: string
}

type InspectionVehicle = {
  plateNumber: string
  company: string
  annualCheck: string
  maintenance: string
  nextReview: string
}

const VEHICLE_TAB_OVERVIEW = "overview"
const VEHICLE_TAB_ALARMS = "alarms"
const VEHICLE_TAB_INSPECTIONS = "inspections"

const activeTab = ref(VEHICLE_TAB_OVERVIEW)

const operatingVehicles: OperatingVehicle[] = [
  { plateNumber: "粤A12345", company: "穗安客运集团", vehicleType: "大型客车", district: "越秀区", onlineRate: "99.2%" },
  { plateNumber: "粤A35791", company: "城际旅游运输", vehicleType: "中型客车", district: "天河区", onlineRate: "97.8%" },
  { plateNumber: "粤A60218", company: "南粤巴士服务", vehicleType: "商务客车", district: "番禺区", onlineRate: "98.6%" },
  { plateNumber: "粤A66024", company: "湾区公交联运", vehicleType: "大型客车", district: "海珠区", onlineRate: "96.9%" },
  { plateNumber: "粤A78103", company: "白云城际客运", vehicleType: "中型客车", district: "白云区", onlineRate: "97.4%" },
  { plateNumber: "粤A80416", company: "广佛通勤巴士", vehicleType: "商务客车", district: "荔湾区", onlineRate: "98.1%" },
  { plateNumber: "粤A82577", company: "南沙旅运服务", vehicleType: "大型客车", district: "南沙区", onlineRate: "99.0%" },
  { plateNumber: "粤A84392", company: "城市快线运输", vehicleType: "中型客车", district: "黄埔区", onlineRate: "96.7%" },
  { plateNumber: "粤A88635", company: "增城会务出行", vehicleType: "商务客车", district: "增城区", onlineRate: "98.4%" },
  { plateNumber: "粤A90241", company: "穗北客运保障", vehicleType: "大型客车", district: "从化区", onlineRate: "97.6%" },
  { plateNumber: "粤A93158", company: "穗东通达客运", vehicleType: "中型客车", district: "黄埔区", onlineRate: "98.8%" },
  { plateNumber: "粤A95726", company: "珠江文旅巴士", vehicleType: "商务客车", district: "海珠区", onlineRate: "97.1%" },
]

const alarmVehicles: AlarmVehicle[] = [
  { plateNumber: "粤B88231", company: "鹏程危运", riskLevel: "高", latestAlarm: "疲劳驾驶", status: "待复核" },
  { plateNumber: "粤B91027", company: "海湾冷链运输", riskLevel: "中", latestAlarm: "超速报警", status: "处理中" },
  { plateNumber: "粤B73564", company: "深港危货联运", riskLevel: "高", latestAlarm: "偏航报警", status: "已派单" },
  { plateNumber: "粤B70186", company: "深南特种运输", riskLevel: "中", latestAlarm: "急加速报警", status: "待复核" },
  { plateNumber: "粤B72415", company: "湾区化工物流", riskLevel: "高", latestAlarm: "长时停车", status: "处理中" },
  { plateNumber: "粤B76803", company: "港城危品配送", riskLevel: "高", latestAlarm: "路线偏移", status: "已派单" },
  { plateNumber: "粤B79324", company: "大鹏冷运", riskLevel: "中", latestAlarm: "超速报警", status: "待复核" },
  { plateNumber: "粤B84517", company: "鹏海联运", riskLevel: "高", latestAlarm: "疲劳驾驶", status: "处理中" },
  { plateNumber: "粤B86752", company: "南湾危运服务", riskLevel: "中", latestAlarm: "异常熄火", status: "已派单" },
  { plateNumber: "粤B89361", company: "龙岗危货通", riskLevel: "高", latestAlarm: "偏航报警", status: "待复核" },
  { plateNumber: "粤B92640", company: "海港能源运输", riskLevel: "中", latestAlarm: "急减速报警", status: "处理中" },
  { plateNumber: "粤B95872", company: "鹏远特运", riskLevel: "高", latestAlarm: "超速报警", status: "已派单" },
]

const inspectionVehicles: InspectionVehicle[] = [
  { plateNumber: "粤C11328", company: "珠西运输", annualCheck: "2026-02-18", maintenance: "2026-03-01", nextReview: "2026-03-20" },
  { plateNumber: "粤C44862", company: "珠澳城配", annualCheck: "2026-02-25", maintenance: "2026-03-03", nextReview: "2026-03-24" },
  { plateNumber: "粤C77519", company: "湾区旅运", annualCheck: "2026-03-02", maintenance: "2026-03-05", nextReview: "2026-03-28" },
  { plateNumber: "粤C12654", company: "香洲通勤服务", annualCheck: "2026-02-16", maintenance: "2026-02-28", nextReview: "2026-03-18" },
  { plateNumber: "粤C23871", company: "斗门城配", annualCheck: "2026-02-20", maintenance: "2026-03-02", nextReview: "2026-03-21" },
  { plateNumber: "粤C34219", company: "横琴旅运", annualCheck: "2026-02-27", maintenance: "2026-03-04", nextReview: "2026-03-23" },
  { plateNumber: "粤C41783", company: "珠港会展客运", annualCheck: "2026-03-01", maintenance: "2026-03-06", nextReview: "2026-03-26" },
  { plateNumber: "粤C56308", company: "金湾巴士服务", annualCheck: "2026-03-03", maintenance: "2026-03-07", nextReview: "2026-03-29" },
  { plateNumber: "粤C68142", company: "高栏港运输", annualCheck: "2026-03-04", maintenance: "2026-03-08", nextReview: "2026-03-30" },
  { plateNumber: "粤C73460", company: "珠海机场快线", annualCheck: "2026-03-05", maintenance: "2026-03-09", nextReview: "2026-03-31" },
  { plateNumber: "粤C85217", company: "湾西公务出行", annualCheck: "2026-03-06", maintenance: "2026-03-10", nextReview: "2026-04-02" },
  { plateNumber: "粤C91845", company: "珠中跨城运务", annualCheck: "2026-03-07", maintenance: "2026-03-11", nextReview: "2026-04-04" },
]

const tabs = computed<ResourceHeaderTab[]>(() => [
  {
    label: "运营车辆",
    value: VEHICLE_TAB_OVERVIEW,
    active: activeTab.value === VEHICLE_TAB_OVERVIEW,
  },
  {
    label: "报警车辆",
    value: VEHICLE_TAB_ALARMS,
    active: activeTab.value === VEHICLE_TAB_ALARMS,
  },
  {
    label: "年检与维保",
    value: VEHICLE_TAB_INSPECTIONS,
    active: activeTab.value === VEHICLE_TAB_INSPECTIONS,
  },
])

const emptySortRules: SortRule[] = []

const operatingColumns: ResourceTableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "vehicleType", label: "车辆类型", filterType: "tag" },
  { key: "district", label: "所属区域", filterType: "tag" },
  { key: "onlineRate", label: "在线率", filterType: "number", headerClass: "w-full", cellClass: "w-full text-[#3559E0]" },
]

const alarmColumns: ResourceTableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "riskLevel", label: "风险等级", filterType: "tag" },
  { key: "latestAlarm", label: "最新报警", filterType: "text" },
  { key: "status", label: "处理状态", filterType: "tag", headerClass: "w-full", cellClass: "w-full text-[#B65A2A]" },
]

const inspectionColumns: ResourceTableColumn[] = [
  { key: "plateNumber", label: "车牌号", filterType: "text", cellClass: "font-medium text-[#1F1F1F]" },
  { key: "company", label: "所属企业", filterType: "text" },
  { key: "annualCheck", label: "年检日期", filterType: "time" },
  { key: "maintenance", label: "最近维保", filterType: "time" },
  { key: "nextReview", label: "下次复核", filterType: "time", headerClass: "w-full", cellClass: "w-full text-[#3559E0]" },
]

const activeCount = computed(() => {
  if (activeTab.value === VEHICLE_TAB_ALARMS) {
    return alarmVehicles.length
  }

  if (activeTab.value === VEHICLE_TAB_INSPECTIONS) {
    return inspectionVehicles.length
  }

  return operatingVehicles.length
})

function handleTabClick(tab: { value?: string | number; label: string }) {
  activeTab.value = `${tab.value ?? tab.label}`
}
</script>

<template>
  <section class="-mx-4 flex min-h-0 flex-1 flex-col bg-white">
    <div class="flex min-h-0 flex-1 flex-col pb-3 pt-3">
      <div class="flex min-h-0 flex-1 flex-col">
        <ResourceListHeader
          title="车辆"
          :count="activeCount"
          :tabs="tabs"
          :fields="[]"
          :show-controls="false"
          :custom-sort-enabled="false"
          :sort-rules="emptySortRules"
          search-query=""
          @tab-click="handleTabClick"
          @set-custom-sort-enabled="() => {}"
          @update-sort-rules="() => {}"
          @toggle-controls="() => {}"
          @update-search-query="() => {}"
        />

        <div class="min-h-0 flex-1">
          <div class="inline-block min-w-full pr-8 align-top">
            <ResourceTable
              v-if="activeTab === VEHICLE_TAB_OVERVIEW"
              :columns="operatingColumns"
              :rows="operatingVehicles"
              row-key="plateNumber"
              show-index
              sticky-header
              wrapper-class="overflow-visible"
              table-class="min-w-full w-max table-auto border-collapse bg-white text-[14px]"
            />
            <ResourceTable
              v-else-if="activeTab === VEHICLE_TAB_ALARMS"
              :columns="alarmColumns"
              :rows="alarmVehicles"
              row-key="plateNumber"
              show-index
              sticky-header
              wrapper-class="overflow-visible"
              table-class="min-w-full w-max table-auto border-collapse bg-white text-[14px]"
            />
            <ResourceTable
              v-else
              :columns="inspectionColumns"
              :rows="inspectionVehicles"
              row-key="plateNumber"
              show-index
              sticky-header
              wrapper-class="overflow-visible"
              table-class="min-w-full w-max table-auto border-collapse bg-white text-[14px]"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
