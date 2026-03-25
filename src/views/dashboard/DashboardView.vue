<script setup lang="ts">
import { computed, ref } from "vue"
import { VisArea, VisAxis, VisDonut, VisDonutSelectors, VisGroupedBar, VisLine, VisSingleContainer, VisStackedBar, VisXYContainer } from "@unovis/vue"

import type { ChartConfig } from "@/components/ui/chart"
import {
  ChartContainer,
  ChartCrosshair,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from "@/components/ui/chart"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import alarmArchivesData from "@/mocks/alarm-archives.json"
import alarmQueriesData from "@/mocks/alarm-queries.json"
import companiesData from "@/mocks/companies.json"
import customersData from "@/mocks/customers.json"
import inspectionPlansData from "@/mocks/inspection-plans.json"
import parksData from "@/mocks/parks.json"
import usersData from "@/mocks/users.json"

type TimeRange = "7d" | "3d" | "1d"

type CompanyRecord = {
  type: string
  district: string
  vehicles: number
  lastUpdated: string
}

type UserRecord = {
  role: string
  status: string
}

type AlarmQueryRecord = {
  alarmTime: string
  status: string
  riskLevel: string
}

type AlarmArchiveRecord = {
  archivedAt: string
  archiveStatus: string
}

type CustomerRecord = {
  packageCode: string
}

type ParkRecord = {
  buildingCount: number
}

type InspectionPlanRecord = {
  status: string
}

const companyRecords = companiesData as CompanyRecord[]
const customerRecords = customersData as CustomerRecord[]
const inspectionPlanRecords = inspectionPlansData as InspectionPlanRecord[]
const parkRecords = parksData as ParkRecord[]
const userRecords = usersData as UserRecord[]
const alarmQueryRecords = alarmQueriesData as AlarmQueryRecord[]
const alarmArchiveRecords = alarmArchivesData as AlarmArchiveRecord[]

const companyTrendData = Object.values(
  companyRecords.reduce<Record<string, { date: Date, passenger: number, dangerous: number }>>((acc, item) => {
    const dateKey = item.lastUpdated.slice(0, 10)

    acc[dateKey] ??= {
      date: new Date(`${dateKey}T00:00:00`),
      passenger: 0,
      dangerous: 0,
    }

    if (item.type.includes("旅客")) {
      acc[dateKey].passenger += item.vehicles
    }
    else {
      acc[dateKey].dangerous += item.vehicles
    }

    return acc
  }, {}),
).sort((a, b) => a.date.getTime() - b.date.getTime())

type CompanyTrendDatum = (typeof companyTrendData)[number]

const companyChartConfig = {
  passenger: {
    label: "客运车辆",
    color: "var(--chart-2)",
  },
  dangerous: {
    label: "危货车辆",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const svgDefs = `
  <linearGradient id="fillDangerous" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-dangerous)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-dangerous)" stop-opacity="0.1" />
  </linearGradient>
  <linearGradient id="fillPassenger" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-passenger)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-passenger)" stop-opacity="0.1" />
  </linearGradient>
`

const timeRange = ref<TimeRange>("7d")

const filteredCompanyTrendData = computed(() => {
  const referenceDate = companyTrendData[companyTrendData.length - 1]?.date ?? new Date("2026-03-07T00:00:00")
  const days = timeRange.value === "3d" ? 3 : timeRange.value === "1d" ? 1 : 7
  const startDate = new Date(referenceDate)

  startDate.setDate(startDate.getDate() - (days - 1))

  return companyTrendData.filter(item => item.date >= startDate)
})

const companyTrendMax = computed(() => {
  const max = Math.max(...filteredCompanyTrendData.value.map(item => item.passenger + item.dangerous), 0)
  return Math.max(500, Math.ceil(max / 500) * 500)
})

const alarmStatusTrendData = Object.values(
  [
    ...alarmQueryRecords.map(item => ({
      dateKey: item.alarmTime.slice(0, 10),
      pending: item.status === "待复核" ? 1 : 0,
      archived: 0,
    })),
    ...alarmArchiveRecords.map(item => ({
      dateKey: item.archivedAt.slice(0, 10),
      pending: 0,
      archived: item.archiveStatus === "已归档" ? 1 : 0,
    })),
  ].reduce<Record<string, { date: Date, pending: number, archived: number }>>((acc, item) => {
    acc[item.dateKey] ??= {
      date: new Date(`${item.dateKey}T00:00:00`),
      pending: 0,
      archived: 0,
    }

    acc[item.dateKey].pending += item.pending
    acc[item.dateKey].archived += item.archived

    return acc
  }, {}),
).sort((a, b) => a.date.getTime() - b.date.getTime())

type AlarmTrendDatum = (typeof alarmStatusTrendData)[number]

const alarmStatusChartConfig = {
  pending: {
    label: "待复核",
    color: "var(--chart-4)",
  },
  archived: {
    label: "已归档",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const alarmTrendMax = Math.max(
  4,
  Math.max(...alarmStatusTrendData.map(item => item.pending + item.archived), 0),
)

const personnelRoleData = Object.entries(
  userRecords.reduce<Record<string, number>>((acc, item) => {
    acc[item.role] = (acc[item.role] ?? 0) + 1
    return acc
  }, {}),
).map(([role, count]) => ({
  role,
  count,
}))

type PersonnelRoleDatum = (typeof personnelRoleData)[number]

const personnelRoleChartConfig = {
  count: {
    label: "人数",
    color: undefined,
  },
  安全员: {
    label: "安全员",
    color: "var(--chart-1)",
  },
  驾驶员: {
    label: "驾驶员",
    color: "var(--chart-2)",
  },
  押运员: {
    label: "押运员",
    color: "var(--chart-3)",
  },
  调度员: {
    label: "调度员",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

const districtEnterpriseData = Object.values(
  companyRecords.reduce<Record<string, { district: string, index: number, passenger: number, dangerous: number }>>((acc, item) => {
    acc[item.district] ??= {
      district: item.district,
      index: 0,
      passenger: 0,
      dangerous: 0,
    }

    if (item.type.includes("旅客")) {
      acc[item.district].passenger += 1
    }
    else {
      acc[item.district].dangerous += 1
    }

    return acc
  }, {}),
)
  .sort((a, b) => (b.passenger + b.dangerous) - (a.passenger + a.dangerous))
  .slice(0, 6)
  .map((item, index) => ({
    ...item,
    index: index + 1,
  }))

type DistrictEnterpriseDatum = (typeof districtEnterpriseData)[number]

const districtEnterpriseChartConfig = {
  passenger: {
    label: "客运企业",
    color: "var(--chart-1)",
  },
  dangerous: {
    label: "危货企业",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const numberFormatter = new Intl.NumberFormat("zh-CN")
const totalParkCount = parkRecords.length
const totalBuildingCount = parkRecords.reduce((sum, item) => sum + item.buildingCount, 0)
const signedContractCount = customerRecords.filter(item => item.packageCode).length
const activeInspectionPlanCount = inspectionPlanRecords.filter(item => item.status === "进行中").length

const statsCards = [
  {
    title: "平台客户总数",
    value: numberFormatter.format(customerRecords.length),
    unit: "家",
    detail: "当前平台已签约并接入的客户数量",
    highlight: `${numberFormatter.format(customerRecords.length)} 家客户正常服务中`,
  },
  {
    title: "空间覆盖",
    value: numberFormatter.format(totalParkCount),
    unit: "个园区",
    detail: "当前平台已接入的园区与建筑空间范围",
    highlight: `${numberFormatter.format(totalParkCount)} 个园区 / ${numberFormatter.format(totalBuildingCount)} 栋建筑`,
  },
  {
    title: "签约合同总数",
    value: numberFormatter.format(signedContractCount),
    unit: "份",
    detail: "按已签约客户套餐统计合同总量",
    highlight: `${numberFormatter.format(signedContractCount)} 份合同已完成签约归档`,
  },
  {
    title: "检测计划（执行中）",
    value: numberFormatter.format(activeInspectionPlanCount),
    unit: "个",
    detail: "当前状态为进行中的检测计划数量",
    highlight: `${numberFormatter.format(inspectionPlanRecords.length)} 个检测计划已纳入排期`,
  },
] as const

const chartShellClass = "group flex h-full min-w-0 w-full flex-col gap-2 rounded-xl p-0 transition-colors hover:bg-surface-tertiary sm:p-2"
const chartCardClass = "flex h-full min-w-0 w-full flex-col gap-0 overflow-hidden border-border/60 bg-surface-tertiary py-0 shadow-none transition-[background-color,box-shadow] group-hover:bg-card group-hover:shadow-sm"
const chartHeaderClass = "flex items-center px-0 sm:min-h-8 sm:pl-2 sm:pr-0"
const chartTitleClass = "text-sm font-semibold tracking-tight text-foreground"
const chartContentClass = "flex min-w-0 flex-1 flex-col p-2 sm:p-4"
const chartContainerClass = "aspect-auto min-w-0 w-full justify-start"
const chartBodyClass = "h-[260px] min-w-0 w-full sm:h-[300px]"
const chartMainBodyClass = "h-[220px] min-w-0 w-full sm:h-[250px]"

function getAxisLabel<T extends { index: number } & Record<K, string>, K extends string>(
  items: readonly T[],
  value: number,
  key: K,
) {
  return items.find(item => item.index === Math.round(value))?.[key] ?? ""
}

function formatShortDate(date: number | Date, locale = "zh-CN") {
  return new Date(date).toLocaleDateString(locale, {
    month: "numeric",
    day: "numeric",
  })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="stat in statsCards"
        :key="stat.title"
        :class="chartShellClass"
      >
        <CardHeader :class="chartHeaderClass">
          <CardTitle :class="chartTitleClass">
            {{ stat.title }}
          </CardTitle>
        </CardHeader>

        <Card :class="chartCardClass">
          <CardContent class="flex min-h-32 flex-col justify-between px-4 py-3">
            <div class="space-y-1.5">
              <div class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[1.875rem]">
                {{ stat.value }}
                <span class="ml-1 text-[1rem] font-medium text-muted-foreground sm:text-[1.125rem]">
                  {{ stat.unit }}
                </span>
              </div>
              <div class="text-sm text-muted-foreground">
                {{ stat.detail }}
              </div>
            </div>

            <div class="text-sm font-medium text-foreground">
              {{ stat.highlight }}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <div :class="chartShellClass">
      <CardHeader class="flex flex-col gap-2 px-0 sm:min-h-8 sm:flex-row sm:items-center sm:justify-between sm:pl-2 sm:pr-0">
        <CardTitle :class="chartTitleClass">
          企业车辆规模趋势
        </CardTitle>

        <Select v-model="timeRange">
          <SelectTrigger
            class="flex h-8 w-full rounded-lg sm:ml-auto sm:w-[132px]"
            aria-label="选择时间范围"
          >
            <SelectValue placeholder="最近 7 天" />
          </SelectTrigger>

          <SelectContent class="rounded-xl">
            <SelectItem value="7d" class="rounded-lg">
              最近 7 天
            </SelectItem>
            <SelectItem value="3d" class="rounded-lg">
              最近 3 天
            </SelectItem>
            <SelectItem value="1d" class="rounded-lg">
              最近 1 天
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <Card :class="chartCardClass">
        <CardContent :class="chartContentClass">
          <ChartContainer
            :config="companyChartConfig"
            :class="chartContainerClass"
            :cursor="false"
          >
            <div :class="chartMainBodyClass">
              <VisXYContainer
                :data="filteredCompanyTrendData"
                :svg-defs="svgDefs"
                :margin="{ left: -32 }"
                :y-domain="[0, companyTrendMax]"
              >
                <VisArea
                  :x="(d: CompanyTrendDatum) => d.date"
                  :y="[(d: CompanyTrendDatum) => d.passenger, (d: CompanyTrendDatum) => d.dangerous]"
                  :color="(_d: CompanyTrendDatum, i: number) => ['url(#fillPassenger)', 'url(#fillDangerous)'][i]"
                  :opacity="0.6"
                />

                <VisLine
                  :x="(d: CompanyTrendDatum) => d.date"
                  :y="[(d: CompanyTrendDatum) => d.passenger, (d: CompanyTrendDatum) => d.passenger + d.dangerous]"
                  :color="(_d: CompanyTrendDatum, i: number) => [companyChartConfig.passenger.color, companyChartConfig.dangerous.color][i]"
                  :line-width="1"
                />

                <VisAxis
                  type="x"
                  :x="(d: CompanyTrendDatum) => d.date"
                  :tick-line="false"
                  :domain-line="false"
                  :grid-line="false"
                  :num-ticks="6"
                  :tick-format="(d: number) => formatShortDate(d)"
                />

                <VisAxis
                  type="y"
                  :num-ticks="4"
                  :tick-line="false"
                  :domain-line="false"
                />

                <ChartTooltip />

                <ChartCrosshair
                  :template="componentToString(companyChartConfig, ChartTooltipContent, {
                    labelFormatter: (d) => formatShortDate(d),
                  })"
                  :color="(_d: CompanyTrendDatum, i: number) => [companyChartConfig.passenger.color, companyChartConfig.dangerous.color][i % 2]"
                />
              </VisXYContainer>
            </div>

            <ChartLegendContent />
          </ChartContainer>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div :class="chartShellClass">
        <CardHeader :class="chartHeaderClass">
          <CardTitle :class="chartTitleClass">
            报警处置趋势
          </CardTitle>
        </CardHeader>

        <Card :class="`${chartCardClass} flex-1`">
          <CardContent :class="chartContentClass">
            <ChartContainer :config="alarmStatusChartConfig" :class="chartContainerClass">
              <div :class="chartBodyClass">
                <VisXYContainer
                  :data="alarmStatusTrendData"
                  :padding="{ top: 10, bottom: 10, left: 10, right: 10 }"
                  :y-domain="[0, alarmTrendMax]"
                >
                  <VisStackedBar
                    :x="(d: AlarmTrendDatum) => d.date"
                    :y="[(d: AlarmTrendDatum) => d.pending, (d: AlarmTrendDatum) => d.archived]"
                    :color="[alarmStatusChartConfig.pending.color, alarmStatusChartConfig.archived.color]"
                    :rounded-corners="4"
                    :bar-padding="0.1"
                  />

                  <VisAxis
                    type="x"
                    :x="(d: AlarmTrendDatum) => d.date"
                    :tick-line="false"
                    :domain-line="false"
                    :grid-line="false"
                    :num-ticks="4"
                    :tick-format="(d: number) => formatShortDate(d)"
                    :tick-values="alarmStatusTrendData.map(d => d.date)"
                  />

                  <VisAxis
                    type="y"
                    :tick-line="false"
                    :domain-line="false"
                    :num-ticks="4"
                  />

                  <ChartTooltip />

                  <ChartCrosshair
                    :template="componentToString(alarmStatusChartConfig, ChartTooltipContent, {
                      labelFormatter: d => formatShortDate(d),
                    })"
                    color="#0000"
                  />
                </VisXYContainer>
              </div>

              <ChartLegendContent />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div :class="chartShellClass">
        <CardHeader :class="chartHeaderClass">
          <CardTitle :class="chartTitleClass">
            从业人员角色分布
          </CardTitle>
        </CardHeader>

        <Card :class="`${chartCardClass} flex-1`">
          <CardContent :class="chartContentClass">
            <ChartContainer
              :config="personnelRoleChartConfig"
              class="mx-auto flex min-w-0 w-full items-center justify-start"
            >
              <div :class="chartBodyClass">
                <VisSingleContainer
                  :data="personnelRoleData"
                  class="h-full w-full"
                  :margin="{ top: 30, bottom: 30 }"
                >
                  <VisDonut
                    :value="(d: PersonnelRoleDatum) => d.count"
                    :color="(d: PersonnelRoleDatum) => personnelRoleChartConfig[d.role as keyof typeof personnelRoleChartConfig].color"
                    :arc-width="30"
                  />
                  <ChartTooltip
                    :triggers="{
                      [VisDonutSelectors.segment]: componentToString(personnelRoleChartConfig, ChartTooltipContent, { hideLabel: true })!,
                    }"
                  />
                </VisSingleContainer>
              </div>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div :class="chartShellClass">
        <CardHeader :class="chartHeaderClass">
          <CardTitle :class="chartTitleClass">
            重点区域企业分布
          </CardTitle>
        </CardHeader>

        <Card :class="`${chartCardClass} flex-1`">
          <CardContent :class="chartContentClass">
            <ChartContainer
              :config="districtEnterpriseChartConfig"
              :class="chartContainerClass"
            >
              <div :class="chartBodyClass">
                <VisXYContainer
                  :data="districtEnterpriseData"
                  :margin="{ left: 8, right: 8, top: 8, bottom: 0 }"
                >
                  <VisGroupedBar
                    :x="(d: DistrictEnterpriseDatum) => d.index"
                    :y="[(d: DistrictEnterpriseDatum) => d.passenger, (d: DistrictEnterpriseDatum) => d.dangerous]"
                    :color="(_d: DistrictEnterpriseDatum, i: number) => [districtEnterpriseChartConfig.passenger.color, districtEnterpriseChartConfig.dangerous.color][i]"
                    :group-padding="0.2"
                    :bar-padding="0.15"
                    :rounded-corners="4"
                  />

                  <VisAxis
                    type="x"
                    :tick-line="false"
                    :domain-line="false"
                    :grid-line="false"
                    :num-ticks="6"
                    :tick-format="(value: number) => getAxisLabel(districtEnterpriseData, value, 'district')"
                  />

                  <VisAxis
                    type="y"
                    :tick-line="false"
                    :domain-line="false"
                    :num-ticks="4"
                  />
                </VisXYContainer>
              </div>

              <ChartLegendContent />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
