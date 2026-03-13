<script setup lang="ts">
import { computed, onUnmounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import type { DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import customersData from "@/mocks/customers.json"

type CustomerSummaryRecord = {
  id: number
  name: string
  level: string
  industry: string
  packageName: string
  packageCode: string
  remainingDays: number
  remainingFunds: number
  inspectionTimes: number
  inspectionCycle: string
  parkCount: number
  buildingCount: number
  riskHigh: number
  riskMedium: number
  riskLow: number
  packageDescription: string
}

type ContactInfo = {
  name: string
  phone: string
}

type CustomerProfile = CustomerSummaryRecord & {
  creditCode: string
  address: string
  invoiceInfo: string
  primaryContact: ContactInfo
  secondaryContact: ContactInfo
  contractEndDate: string
  remainingService: string
  contractFileName: string
  contractDownloadUrl: string
}

type HistoryConsumptionRow = {
  id: string
  serviceName: string
  consumedAt: string
  amount: string
}

type AssetArchiveRow = {
  id: string
  parkName: string
  completedAt: string
  launchedAt: string
  area: string
  contactName: string
  contactPhone: string
  location: string
  locationInfo: string
}

type BuildingRow = {
  id: string
  parkName: string
  name: string
  completedAt: string
  launchedAt: string
  area: string
  contactName: string
  contactPhone: string
  location: string
  riskLevel: "高风险" | "中风险" | "低风险"
}

const route = useRoute()
const router = useRouter()
const customerId = computed(() => Number(route.params.id))

const customer = computed<CustomerProfile | null>(() => {
  const list = customersData as CustomerSummaryRecord[]
  const summary = list.find(item => item.id === customerId.value)
  if (!summary) {
    return null
  }

  return createCustomerProfile(summary)
})

const fieldSections = computed<DetailFieldSection[]>(() => {
  const current = customer.value
  if (!current) {
    return []
  }

  return [
    {
      key: "base-info",
      title: "基础信息",
      rows: [
        { key: "name", label: "企业名称", value: current.name },
        { key: "credit-code", label: "信用代码", value: current.creditCode },
        { key: "address", label: "详细地址", value: current.address, truncate: false, valueClass: "leading-6" },
        { key: "invoice-info", label: "开票资料", value: current.invoiceInfo, truncate: false, valueClass: "leading-6" },
      ],
    },
    {
      key: "contacts",
      title: "联系人",
      rows: [
        { key: "primary-contact", label: "主要责任人", value: `${current.primaryContact.name} ${current.primaryContact.phone}` },
        { key: "secondary-contact", label: "次要负责人", value: `${current.secondaryContact.name} ${current.secondaryContact.phone}` },
      ],
    },
  ]
})

const historyGroups = computed(() => {
  const current = customer.value
  if (!current) {
    return []
  }

  return [
    {
      key: "base-package-services",
      title: "基础套餐服务",
      rows: buildBaseHistoryRows(current),
    },
    {
      key: "value-added-services",
      title: "额外增值服务",
      rows: buildValueAddedHistoryRows(current),
    },
  ]
})

const historyModule = computed<DetailRelationModuleSchema<HistoryConsumptionRow>>(() => ({
  key: "history-consumptions",
  title: "历史消费信息",
  rowKey: "id",
  columns: [
    { key: "serviceName", label: "服务名称", cellClass: "truncate" },
    { key: "consumedAt", label: "消费时间", cellClass: "whitespace-nowrap text-muted-foreground" },
    { key: "amount", label: "消费金额", slot: "history-amount-cell", cellClass: "flex justify-end" },
  ],
  groups: historyGroups.value,
  columnTemplateMobile: "minmax(12rem,1.5fr) minmax(8rem,1fr) minmax(7rem,0.8fr)",
  columnTemplateDesktop: "minmax(10rem,1.6fr) minmax(8rem,1fr) minmax(7rem,0.8fr)",
  columnGapMobile: "0.75rem",
  columnGapDesktop: "1rem",
}))

const assetGroups = computed(() => {
  const current = customer.value
  if (!current) {
    return []
  }

  return [
    {
      key: "asset-archives",
      title: "园区资产档案",
      rows: buildAssetArchiveRows(current),
    },
  ]
})

const assetModule = computed<DetailRelationModuleSchema<AssetArchiveRow>>(() => ({
  key: "asset-archives",
  title: "建筑资产档案",
  count: customer.value?.parkCount ?? 0,
  rowKey: "id",
  mobileMinWidth: "76rem",
  columnTemplateMobile: "minmax(10rem,1.4fr) minmax(7rem,0.9fr) minmax(8rem,1fr) minmax(7rem,0.9fr) minmax(7rem,0.9fr) minmax(8rem,1fr) minmax(10rem,1.2fr) minmax(12rem,1.5fr)",
  columnTemplateDesktop: "minmax(10rem,1.5fr) minmax(7rem,0.9fr) minmax(8rem,1fr) minmax(7rem,0.9fr) minmax(7rem,0.9fr) minmax(8rem,1fr) minmax(10rem,1.2fr) minmax(13rem,1.6fr)",
  columnGapMobile: "0.75rem",
  columnGapDesktop: "1rem",
  columns: [
    { key: "parkName", label: "园区名称", cellClass: "truncate" },
    { key: "completedAt", label: "建成时间", cellClass: "whitespace-nowrap text-muted-foreground" },
    { key: "launchedAt", label: "投入运营时间", cellClass: "whitespace-nowrap text-muted-foreground" },
    { key: "area", label: "建筑面积", cellClass: "whitespace-nowrap" },
    { key: "contactName", label: "联系人", cellClass: "truncate" },
    { key: "contactPhone", label: "联系方式", cellClass: "whitespace-nowrap text-muted-foreground" },
    { key: "location", label: "定位", cellClass: "truncate" },
    { key: "locationInfo", label: "位置信息", cellClass: "truncate text-muted-foreground" },
  ],
  groups: assetGroups.value,
}))

const buildingGroups = computed(() => {
  const current = customer.value
  if (!current) {
    return []
  }

  return buildBuildingGroups(current)
})

const buildingModule = computed<DetailRelationModuleSchema<BuildingRow>>(() => ({
  key: "buildings",
  title: "建筑列表",
  count: customer.value?.buildingCount ?? 0,
  rowKey: "id",
  mobileMinWidth: "72rem",
  columnTemplateMobile: "minmax(10rem,1.45fr) minmax(7rem,0.9fr) minmax(8rem,1fr) minmax(7rem,0.9fr) minmax(7rem,0.9fr) minmax(8rem,1fr) minmax(10rem,1.2fr) minmax(6rem,0.8fr)",
  columnTemplateDesktop: "minmax(10rem,1.5fr) minmax(7rem,0.9fr) minmax(8rem,1fr) minmax(7rem,0.9fr) minmax(7rem,0.9fr) minmax(8rem,1fr) minmax(10rem,1.2fr) minmax(6rem,0.8fr)",
  columnGapMobile: "0.75rem",
  columnGapDesktop: "1rem",
  columns: [
    { key: "name", label: "名称", cellClass: "truncate" },
    { key: "completedAt", label: "建成时间", cellClass: "whitespace-nowrap text-muted-foreground" },
    { key: "launchedAt", label: "投入运营时间", cellClass: "whitespace-nowrap text-muted-foreground" },
    { key: "area", label: "建筑面积", cellClass: "whitespace-nowrap" },
    { key: "contactName", label: "联系人", cellClass: "truncate" },
    { key: "contactPhone", label: "联系方式", cellClass: "whitespace-nowrap text-muted-foreground" },
    { key: "location", label: "定位", cellClass: "truncate" },
    { key: "riskLevel", label: "风险等级", slot: "building-risk-cell", cellClass: "flex justify-start" },
  ],
  groups: buildingGroups.value,
}))

function goBack() {
  router.push({ name: "customers" })
}

watch(
  customer,
  (current) => { detailBreadcrumbTitle.value = current?.name ?? null },
  { immediate: true },
)

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

function createCustomerProfile(summary: CustomerSummaryRecord): CustomerProfile {
  const city = resolveCity(summary.id)
  const district = resolveDistrict(summary.id)
  const primaryContact = buildPrimaryContact(summary)
  const secondaryContact = buildSecondaryContact(summary)
  const contractEndDate = buildContractEndDate(summary.remainingDays)
  const contractFileName = `${summary.name}-建筑体检服务合同.txt`
  const contractContent = [
    `客户名称：${summary.name}`,
    `套餐信息：${summary.packageName}（${summary.packageCode}）`,
    `到期时间：${contractEndDate}`,
    `资金余额：${summary.remainingFunds} 万元`,
    `剩余服务：${summary.inspectionTimes} 次检测 / ${summary.inspectionCycle}`,
  ].join("\n")

  return {
    ...summary,
    creditCode: buildCreditCode(summary.id),
    address: `${city}${district}${resolveRoad(summary.id)}${80 + (summary.id % 17) * 9}号 ${resolveBuilding(summary.id)}`,
    invoiceInfo: `${summary.name}；税号 ${buildCreditCode(summary.id)}；开户地址 ${city}${district}城市支行；账号 3100${summary.id}8829${summary.id}`,
    primaryContact,
    secondaryContact,
    contractEndDate,
    remainingService: `${summary.inspectionTimes} 次检测，覆盖 ${summary.parkCount} 个园区，当前执行周期为${summary.inspectionCycle}`,
    contractFileName,
    contractDownloadUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(contractContent)}`,
  }
}

function buildBaseHistoryRows(customerProfile: CustomerProfile): HistoryConsumptionRow[] {
  return [
    {
      id: `${customerProfile.id}-base-1`,
      serviceName: `${customerProfile.packageName}首期进场服务`,
      consumedAt: buildPastDate(customerProfile.remainingDays, 240),
      amount: formatAmount(Math.max(8, Math.round(customerProfile.remainingFunds * 0.26))),
    },
    {
      id: `${customerProfile.id}-base-2`,
      serviceName: "季度风险复盘与报告输出",
      consumedAt: buildPastDate(customerProfile.remainingDays, 120),
      amount: formatAmount(Math.max(4, Math.round(customerProfile.remainingFunds * 0.14))),
    },
  ]
}

function buildValueAddedHistoryRows(customerProfile: CustomerProfile): HistoryConsumptionRow[] {
  return [
    {
      id: `${customerProfile.id}-extra-1`,
      serviceName: "高风险楼栋专项复检",
      consumedAt: buildPastDate(customerProfile.remainingDays, 75),
      amount: formatAmount(Math.max(2, customerProfile.riskHigh * 3)),
    },
    {
      id: `${customerProfile.id}-extra-2`,
      serviceName: "园区资产台账补录服务",
      consumedAt: buildPastDate(customerProfile.remainingDays, 38),
      amount: formatAmount(Math.max(1, customerProfile.parkCount * 2)),
    },
  ]
}

function buildAssetArchiveRows(customerProfile: CustomerProfile): AssetArchiveRow[] {
  const count = Math.max(1, Math.min(customerProfile.parkCount, 4))

  return Array.from({ length: count }, (_, index) => {
    const parkIndex = index + 1
    const totalArea = Math.round(customerProfile.buildingCount * 1200 / count + parkIndex * 860)
    const location = `${resolveCity(customerProfile.id)}${resolveDistrict(customerProfile.id)}·${resolveParkArea(index)}`

    return {
      id: `${customerProfile.id}-park-${parkIndex}`,
      parkName: `${customerProfile.name.replace(/有限公司|集团|管理中心/g, "").trim()} ${parkIndex}号园区`,
      completedAt: `${2016 + ((customerProfile.id + parkIndex) % 6)}-0${(parkIndex % 3) + 4}-18`,
      launchedAt: `${2017 + ((customerProfile.id + parkIndex) % 6)}-1${parkIndex % 3}-08`,
      area: `${totalArea.toLocaleString("zh-CN")} m2`,
      contactName: index % 2 === 0 ? customerProfile.primaryContact.name : customerProfile.secondaryContact.name,
      contactPhone: index % 2 === 0 ? customerProfile.primaryContact.phone : customerProfile.secondaryContact.phone,
      location,
      locationInfo: `${location}，覆盖 ${Math.max(3, Math.round(customerProfile.buildingCount / count))} 栋重点建筑`,
    }
  })
}

function buildBuildingGroups(customerProfile: CustomerProfile) {
  const parkRows = buildAssetArchiveRows(customerProfile)

  return parkRows.map((park, parkIndex) => ({
    key: park.id,
    title: park.parkName,
    rows: Array.from({ length: 3 }, (_, buildingIndex) => {
      const sequence = parkIndex * 3 + buildingIndex + 1

      return {
        id: `${customerProfile.id}-building-${sequence}`,
        parkName: park.parkName,
        name: `${park.parkName} ${resolveBuildingLabel(buildingIndex)}`,
        completedAt: `${2017 + ((customerProfile.id + sequence) % 5)}-0${(buildingIndex % 3) + 5}-12`,
        launchedAt: `${2018 + ((customerProfile.id + sequence) % 5)}-1${buildingIndex % 3}-20`,
        area: `${(7800 + sequence * 640).toLocaleString("zh-CN")} m2`,
        contactName: buildingIndex % 2 === 0 ? customerProfile.primaryContact.name : customerProfile.secondaryContact.name,
        contactPhone: buildingIndex % 2 === 0 ? customerProfile.primaryContact.phone : customerProfile.secondaryContact.phone,
        location: `${resolveParkArea(parkIndex)} · ${resolveBuildingAxis(buildingIndex)}`,
        riskLevel: resolveBuildingRisk(customerProfile, sequence),
      } satisfies BuildingRow
    }),
  }))
}

function resolveBuildingRisk(customerProfile: CustomerProfile, sequence: number): BuildingRow["riskLevel"] {
  if (sequence <= customerProfile.riskHigh) {
    return "高风险"
  }

  if (sequence <= customerProfile.riskHigh + Math.max(1, Math.min(customerProfile.riskMedium, 3))) {
    return "中风险"
  }

  return "低风险"
}

function buildPrimaryContact(summary: CustomerSummaryRecord): ContactInfo {
  return {
    name: `${summary.name.slice(0, 2)}项目负责人`,
    phone: `138${String(summary.id).padStart(8, "0")}`,
  }
}

function buildSecondaryContact(summary: CustomerSummaryRecord): ContactInfo {
  return {
    name: `${summary.name.slice(0, 2)}运营经理`,
    phone: `139${String(summary.id + 27).padStart(8, "0")}`,
  }
}

function buildCreditCode(id: number) {
  return `91330${String(id).padStart(3, "0")}MA2CT${String(id + 48).padStart(4, "0")}X`
}

function buildContractEndDate(remainingDays: number) {
  const baseDate = new Date()
  baseDate.setHours(0, 0, 0, 0)
  baseDate.setDate(baseDate.getDate() + remainingDays)
  return toISODate(baseDate)
}

function buildPastDate(remainingDays: number, deltaDays: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + remainingDays - deltaDays)
  return toISODate(date)
}

function formatAmount(value: number) {
  return `${value.toLocaleString("zh-CN")} 万元`
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function resolveCity(id: number) {
  return ["上海市", "苏州市", "杭州市", "宁波市", "无锡市", "嘉兴市", "南京市", "绍兴市"][id % 8] ?? "上海市"
}

function resolveDistrict(id: number) {
  return ["浦东新区", "高新区", "滨江区", "前湾新区", "梁溪区", "海盐县", "浦口区", "镜湖新区"][id % 8] ?? "浦东新区"
}

function resolveRoad(id: number) {
  return ["创新大道", "智造路", "科苑路", "云谷路", "滨河路", "发展大道", "星海路", "临港路"][id % 8] ?? "创新大道"
}

function resolveBuilding(id: number) {
  return ["A座 8F", "B座 11F", "综合服务楼 6F", "企业中心 12F"][id % 4] ?? "A座 8F"
}

function resolveParkArea(index: number) {
  return ["东区", "西区", "南区", "北区"][index % 4] ?? "东区"
}

function resolveBuildingLabel(index: number) {
  return ["1号楼", "2号楼", "综合楼"][index % 3] ?? "1号楼"
}

function resolveBuildingAxis(index: number) {
  return ["经度 121.55 / 纬度 31.21", "经度 120.72 / 纬度 31.32", "经度 121.49 / 纬度 30.88"][index % 3] ?? "经度 121.55 / 纬度 31.21"
}
</script>

<template>
  <DetailLayout
    :title="customer?.name ?? '客户详情'"
    :subtitle="customer?.industry"
    :empty="!customer"
    empty-text="未找到该客户信息"
    @back="goBack"
  >
    <template #actions>
      <Button
        variant="outline"
        size="sm"
        class="border-border/80 bg-background font-medium text-foreground shadow-none"
        @click="goBack"
      >
        返回客户列表
      </Button>
    </template>

    <template #primary>
      <template v-if="customer">
        <DetailFieldSections :sections="fieldSections" />

        <Separator class="my-5 bg-border/80" />

        <Card class="gap-0 border-border/70 shadow-none">
          <CardHeader class="gap-2 pb-4">
            <CardDescription>套餐信息</CardDescription>
            <CardTitle class="text-[20px] leading-tight">{{ customer.packageName }}</CardTitle>
            <CardDescription>{{ customer.packageCode }} · {{ customer.packageDescription }}</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-lg bg-surface-tertiary px-4 py-3">
                <div class="text-xs text-muted-foreground">资金余额</div>
                <div class="mt-1 text-xl font-semibold text-foreground">{{ formatAmount(customer.remainingFunds) }}</div>
              </div>
              <div class="rounded-lg bg-surface-tertiary px-4 py-3">
                <div class="text-xs text-muted-foreground">到期时间</div>
                <div class="mt-1 text-xl font-semibold text-foreground">{{ customer.contractEndDate }}</div>
              </div>
            </div>

            <div class="grid gap-3 text-sm">
              <div class="rounded-lg border border-border/70 px-4 py-3">
                <div class="text-xs text-muted-foreground">当前购买套餐信息</div>
                <div class="mt-1 font-medium text-foreground">{{ customer.packageName }}</div>
                <div class="mt-1 text-muted-foreground">{{ customer.packageDescription }}</div>
              </div>

              <div class="rounded-lg border border-border/70 px-4 py-3">
                <div class="text-xs text-muted-foreground">剩余服务</div>
                <div class="mt-1 text-foreground">{{ customer.remainingService }}</div>
              </div>

              <div class="flex items-center justify-between rounded-lg border border-border/70 px-4 py-3">
                <div class="min-w-0">
                  <div class="text-xs text-muted-foreground">合同下载</div>
                  <div class="mt-1 truncate text-sm font-medium text-foreground">{{ customer.contractFileName }}</div>
                </div>
                <Button variant="outline" size="sm" as-child class="shrink-0">
                  <a :href="customer.contractDownloadUrl" :download="customer.contractFileName">
                    下载合同
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator class="my-5 bg-border/80" />

        <DetailRelationModule :schema="historyModule">
          <template #history-amount-cell="{ row }">
            <span class="font-medium text-foreground">{{ row.amount }}</span>
          </template>
        </DetailRelationModule>
      </template>
    </template>

    <template #secondary>
      <template v-if="customer">
        <div class="pb-5">
          <DetailRelationModule :schema="assetModule" />

          <Separator class="my-5 bg-border/80" />

          <DetailRelationModule :schema="buildingModule">
            <template #building-risk-cell="{ row }">
              <span
                :class="[
                  'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                  row.riskLevel === '高风险'
                    ? 'bg-[#FFF1F0] text-[#C53532]'
                    : row.riskLevel === '中风险'
                      ? 'bg-[#FFF8E8] text-[#B7791F]'
                      : 'bg-[#EDF7ED] text-[#2F855A]',
                ]"
              >
                {{ row.riskLevel }}
              </span>
            </template>
          </DetailRelationModule>
        </div>
      </template>
    </template>
  </DetailLayout>
</template>
