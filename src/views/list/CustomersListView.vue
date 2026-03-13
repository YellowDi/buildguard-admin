<script setup lang="ts">
import { useRoute, useRouter, RouterLink } from "vue-router"

import TablePage from "@/components/table-page/TablePage.vue"
import { useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
import { Button } from "@/components/ui/button"
import customersData from "@/mocks/customers.json"

type RawCustomerRecord = {
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

type CustomerRecord = RawCustomerRecord & {
  inspectionPlan: string
  buildingHealth: string
  riskLevel: string
  contractEndDate: string
}

const customers = (customersData as RawCustomerRecord[]).map(customer => ({
  ...customer,
  inspectionPlan: `${customer.inspectionTimes} 次 / ${customer.inspectionCycle}`,
  buildingHealth: `园区 ${customer.parkCount} 个，建筑 ${customer.buildingCount} 栋，高 ${customer.riskHigh} / 中 ${customer.riskMedium} / 低 ${customer.riskLow}`,
  riskLevel: resolveRiskLevel(customer),
  contractEndDate: buildContractEndDate(customer.remainingDays),
}))

const router = useRouter()

const schema: TablePageSchema<CustomerRecord> = {
  title: "客户",
  rowKey: "id",
  data: customers,
  showIndex: true,
  stickyHeader: true,
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => router.push({ name: "customer-detail", params: { id: String((row as CustomerRecord).id) } }),
    },
  ],
  columns: [
    {
      key: "name",
      label: "客户名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        label: "名称",
        placeholder: "输入客户名称",
        defaultVisible: true,
      },
      sort: true,
      slot: "cell-name",
    },
    {
      key: "level",
      label: "客户等级",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "industry",
      label: "所属行业",
      filterType: "tag",
      filter: {
        type: "tag",
        label: "行业",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "packageName",
      label: "套餐信息",
      filterType: "tag",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "tag",
        label: "套餐",
        defaultVisible: true,
      },
      sort: true,
      slot: "cell-packageName",
    },
    {
      key: "remainingDays",
      label: "剩余时间",
      filterType: "number",
      variant: "metric",
      sort: {
        kind: "metric",
      },
      cellRenderer: {
        kind: "metric-unit",
        unit: "天",
      },
    },
    {
      key: "remainingFunds",
      label: "剩余资金",
      filterType: "number",
      variant: "metric",
      sort: {
        kind: "metric",
      },
      cellRenderer: {
        kind: "metric-unit",
        unit: "万",
      },
    },
    {
      key: "inspectionPlan",
      label: "检测计划",
      filterType: "none",
      slot: "cell-inspectionPlan",
      sort: {
        label: "检测次数",
        kind: "metric",
        value: row => row.inspectionTimes,
      },
    },
    {
      key: "buildingHealth",
      label: "建筑体检状态",
      filterType: "none",
      width: "fill",
      slot: "cell-buildingHealth",
      sort: {
        label: "建筑数量",
        kind: "metric",
        value: row => row.buildingCount,
      },
    },
  ],
  filters: [
    {
      key: "园区",
      label: "园区",
      type: "number",
      defaultVisible: true,
      placeholder: "输入园区数量",
      value: row => row.parkCount,
    },
    {
      key: "风险",
      label: "风险",
      type: "tag",
      defaultVisible: true,
      value: row => row.riskLevel,
    },
    {
      key: "合同到期时间",
      label: "合同到期时间",
      type: "date",
      defaultVisible: true,
      value: row => row.contractEndDate,
    },
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
    storageKey: "customers-sort-preferences",
    initialField: "remainingDays",
    initialDirection: "asc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "level",
  },
}

const page = useTablePage(schema)
const route = useRoute()

useRouteTableSearch(page, route)

function buildPageFilterText(row: CustomerRecord) {
  return [
    row.name,
    row.level,
    row.industry,
    row.packageName,
    row.packageCode,
    row.riskLevel,
    row.contractEndDate,
    row.remainingDays,
    row.remainingFunds,
    row.inspectionPlan,
    row.buildingHealth,
    row.packageDescription,
  ].join(" ")
}

function resolveRiskLevel(customer: RawCustomerRecord) {
  if (customer.riskHigh > 0) {
    return "高风险"
  }

  if (customer.riskMedium > 0) {
    return "中风险"
  }

  return "低风险"
}

function buildContractEndDate(remainingDays: number) {
  const baseDate = new Date()
  baseDate.setHours(0, 0, 0, 0)
  baseDate.setDate(baseDate.getDate() + remainingDays)
  return toISODate(baseDate)
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}
</script>

<template>
  <TablePage :page="page">
    <template #cell-name="{ row }">
      <Button
        variant="link"
        size="sm"
        as-child
        class="h-auto justify-start px-0 py-0 text-left text-[#2457F5]"
      >
        <RouterLink :to="{ name: 'customer-detail', params: { id: String(row.id) } }">
          {{ row.name }}
        </RouterLink>
      </Button>
    </template>

    <template #cell-packageName="{ row }">
      <div class="flex min-w-[12rem] flex-col gap-1">
        <Button
          variant="link"
          size="sm"
          as-child
          class="h-auto justify-start px-0 py-0 text-[#2457F5]"
        >
          <RouterLink :to="{ name: 'customer-detail', params: { id: String(row.id) } }">
            {{ row.packageName }}
          </RouterLink>
        </Button>
        <span class="text-xs text-muted-foreground">
          {{ row.packageCode }} · {{ row.packageDescription }}
        </span>
      </div>
    </template>

    <template #cell-inspectionPlan="{ row }">
      <div class="flex min-w-[11rem] flex-col gap-0.5">
        <span class="font-medium text-foreground">{{ row.inspectionTimes }} 次</span>
        <span class="text-xs text-muted-foreground">{{ row.inspectionCycle }}</span>
      </div>
    </template>

    <template #cell-buildingHealth="{ row }">
      <div class="flex min-w-[15rem] flex-col gap-1.5">
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <span class="font-medium text-foreground">园区 {{ row.parkCount }}</span>
          <span class="font-medium text-foreground">建筑 {{ row.buildingCount }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[#C53532]">高 {{ row.riskHigh }}</span>
          <span class="rounded-full bg-[#FFF8E8] px-2 py-0.5 text-[#B7791F]">中 {{ row.riskMedium }}</span>
          <span class="rounded-full bg-[#EDF7ED] px-2 py-0.5 text-[#2F855A]">低 {{ row.riskLow }}</span>
        </div>
      </div>
    </template>
  </TablePage>
</template>
