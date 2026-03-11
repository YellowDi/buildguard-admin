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

const chartData = [
  { date: new Date("2024-04-01"), desktop: 222, mobile: 150 },
  { date: new Date("2024-04-02"), desktop: 97, mobile: 180 },
  { date: new Date("2024-04-03"), desktop: 167, mobile: 120 },
  { date: new Date("2024-04-04"), desktop: 242, mobile: 260 },
  { date: new Date("2024-04-05"), desktop: 373, mobile: 290 },
  { date: new Date("2024-04-06"), desktop: 301, mobile: 340 },
  { date: new Date("2024-04-07"), desktop: 245, mobile: 180 },
  { date: new Date("2024-04-08"), desktop: 409, mobile: 320 },
  { date: new Date("2024-04-09"), desktop: 59, mobile: 110 },
  { date: new Date("2024-04-10"), desktop: 261, mobile: 190 },
  { date: new Date("2024-04-11"), desktop: 327, mobile: 350 },
  { date: new Date("2024-04-12"), desktop: 292, mobile: 210 },
  { date: new Date("2024-04-13"), desktop: 342, mobile: 380 },
  { date: new Date("2024-04-14"), desktop: 137, mobile: 220 },
  { date: new Date("2024-04-15"), desktop: 120, mobile: 170 },
  { date: new Date("2024-04-16"), desktop: 138, mobile: 190 },
  { date: new Date("2024-04-17"), desktop: 446, mobile: 360 },
  { date: new Date("2024-04-18"), desktop: 364, mobile: 410 },
  { date: new Date("2024-04-19"), desktop: 243, mobile: 180 },
  { date: new Date("2024-04-20"), desktop: 89, mobile: 150 },
  { date: new Date("2024-04-21"), desktop: 137, mobile: 200 },
  { date: new Date("2024-04-22"), desktop: 224, mobile: 170 },
  { date: new Date("2024-04-23"), desktop: 138, mobile: 230 },
  { date: new Date("2024-04-24"), desktop: 387, mobile: 290 },
  { date: new Date("2024-04-25"), desktop: 215, mobile: 250 },
  { date: new Date("2024-04-26"), desktop: 75, mobile: 130 },
  { date: new Date("2024-04-27"), desktop: 383, mobile: 420 },
  { date: new Date("2024-04-28"), desktop: 122, mobile: 180 },
  { date: new Date("2024-04-29"), desktop: 315, mobile: 240 },
  { date: new Date("2024-04-30"), desktop: 454, mobile: 380 },
  { date: new Date("2024-05-01"), desktop: 165, mobile: 220 },
  { date: new Date("2024-05-02"), desktop: 293, mobile: 310 },
  { date: new Date("2024-05-03"), desktop: 247, mobile: 190 },
  { date: new Date("2024-05-04"), desktop: 385, mobile: 420 },
  { date: new Date("2024-05-05"), desktop: 481, mobile: 390 },
  { date: new Date("2024-05-06"), desktop: 498, mobile: 520 },
  { date: new Date("2024-05-07"), desktop: 388, mobile: 300 },
  { date: new Date("2024-05-08"), desktop: 149, mobile: 210 },
  { date: new Date("2024-05-09"), desktop: 227, mobile: 180 },
  { date: new Date("2024-05-10"), desktop: 293, mobile: 330 },
  { date: new Date("2024-05-11"), desktop: 335, mobile: 270 },
  { date: new Date("2024-05-12"), desktop: 197, mobile: 240 },
  { date: new Date("2024-05-13"), desktop: 197, mobile: 160 },
  { date: new Date("2024-05-14"), desktop: 448, mobile: 490 },
  { date: new Date("2024-05-15"), desktop: 473, mobile: 380 },
  { date: new Date("2024-05-16"), desktop: 338, mobile: 400 },
  { date: new Date("2024-05-17"), desktop: 499, mobile: 420 },
  { date: new Date("2024-05-18"), desktop: 315, mobile: 350 },
  { date: new Date("2024-05-19"), desktop: 235, mobile: 180 },
  { date: new Date("2024-05-20"), desktop: 177, mobile: 230 },
  { date: new Date("2024-05-21"), desktop: 82, mobile: 140 },
  { date: new Date("2024-05-22"), desktop: 81, mobile: 120 },
  { date: new Date("2024-05-23"), desktop: 252, mobile: 290 },
  { date: new Date("2024-05-24"), desktop: 294, mobile: 220 },
  { date: new Date("2024-05-25"), desktop: 201, mobile: 250 },
  { date: new Date("2024-05-26"), desktop: 213, mobile: 170 },
  { date: new Date("2024-05-27"), desktop: 420, mobile: 460 },
  { date: new Date("2024-05-28"), desktop: 233, mobile: 190 },
  { date: new Date("2024-05-29"), desktop: 78, mobile: 130 },
  { date: new Date("2024-05-30"), desktop: 340, mobile: 280 },
  { date: new Date("2024-05-31"), desktop: 178, mobile: 230 },
  { date: new Date("2024-06-01"), desktop: 178, mobile: 200 },
  { date: new Date("2024-06-02"), desktop: 470, mobile: 410 },
  { date: new Date("2024-06-03"), desktop: 103, mobile: 160 },
  { date: new Date("2024-06-04"), desktop: 439, mobile: 380 },
  { date: new Date("2024-06-05"), desktop: 88, mobile: 140 },
  { date: new Date("2024-06-06"), desktop: 294, mobile: 250 },
  { date: new Date("2024-06-07"), desktop: 323, mobile: 370 },
  { date: new Date("2024-06-08"), desktop: 385, mobile: 320 },
  { date: new Date("2024-06-09"), desktop: 438, mobile: 480 },
  { date: new Date("2024-06-10"), desktop: 155, mobile: 200 },
  { date: new Date("2024-06-11"), desktop: 92, mobile: 150 },
  { date: new Date("2024-06-12"), desktop: 492, mobile: 420 },
  { date: new Date("2024-06-13"), desktop: 81, mobile: 130 },
  { date: new Date("2024-06-14"), desktop: 426, mobile: 380 },
  { date: new Date("2024-06-15"), desktop: 307, mobile: 350 },
  { date: new Date("2024-06-16"), desktop: 371, mobile: 310 },
  { date: new Date("2024-06-17"), desktop: 475, mobile: 520 },
  { date: new Date("2024-06-18"), desktop: 107, mobile: 170 },
  { date: new Date("2024-06-19"), desktop: 341, mobile: 290 },
  { date: new Date("2024-06-20"), desktop: 408, mobile: 450 },
  { date: new Date("2024-06-21"), desktop: 169, mobile: 210 },
  { date: new Date("2024-06-22"), desktop: 317, mobile: 270 },
  { date: new Date("2024-06-23"), desktop: 480, mobile: 530 },
  { date: new Date("2024-06-24"), desktop: 132, mobile: 180 },
  { date: new Date("2024-06-25"), desktop: 141, mobile: 190 },
  { date: new Date("2024-06-26"), desktop: 434, mobile: 380 },
  { date: new Date("2024-06-27"), desktop: 448, mobile: 490 },
  { date: new Date("2024-06-28"), desktop: 149, mobile: 200 },
  { date: new Date("2024-06-29"), desktop: 103, mobile: 160 },
  { date: new Date("2024-06-30"), desktop: 446, mobile: 400 },
] as const

type DataPoint = (typeof chartData)[number]
type TimeRange = "90d" | "30d" | "7d"

const chartConfig = {
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const svgDefs = `
  <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-desktop)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-desktop)" stop-opacity="0.1" />
  </linearGradient>
  <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-mobile)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-mobile)" stop-opacity="0.1" />
  </linearGradient>
`

const timeRange = ref<TimeRange>("90d")

const filteredChartData = computed(() => {
  const referenceDate = new Date("2024-06-30")
  const daysToSubtract = timeRange.value === "30d" ? 30 : timeRange.value === "7d" ? 7 : 90
  const startDate = new Date(referenceDate)

  startDate.setDate(startDate.getDate() - daysToSubtract)

  return chartData.filter(item => item.date >= startDate)
})

const barChartData = [
  { date: new Date("2024-07-15"), running: 450, swimming: 300 },
  { date: new Date("2024-07-16"), running: 380, swimming: 420 },
  { date: new Date("2024-07-17"), running: 520, swimming: 120 },
  { date: new Date("2024-07-18"), running: 140, swimming: 550 },
  { date: new Date("2024-07-19"), running: 600, swimming: 350 },
  { date: new Date("2024-07-20"), running: 480, swimming: 400 },
] as const

type BarChartDatum = (typeof barChartData)[number]

const horizontalBarChartData = [
  { label: "Windows", index: 1, sessions: 275 },
  { label: "macOS", index: 2, sessions: 200 },
  { label: "iOS", index: 3, sessions: 187 },
  { label: "Android", index: 4, sessions: 173 },
  { label: "Linux", index: 5, sessions: 90 },
] as const

type HorizontalBarChartDatum = (typeof horizontalBarChartData)[number]

const multipleBarChartData = [
  { month: "Jan", index: 1, desktop: 186, mobile: 80 },
  { month: "Feb", index: 2, desktop: 305, mobile: 200 },
  { month: "Mar", index: 3, desktop: 237, mobile: 120 },
  { month: "Apr", index: 4, desktop: 73, mobile: 190 },
  { month: "May", index: 5, desktop: 209, mobile: 130 },
  { month: "Jun", index: 6, desktop: 214, mobile: 140 },
] as const

type MultipleBarChartDatum = (typeof multipleBarChartData)[number]

const singleBarChartConfig = {
  running: {
    label: "Running",
    color: "var(--chart-1)",
  },
  swimming: {
    label: "Swimming",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const horizontalBarChartConfig = {
  sessions: {
    label: "Sessions",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const pieChartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
] as const

type PieChartDatum = (typeof pieChartData)[number]

const pieChartConfig = {
  visitors: {
    label: "Visitors",
    color: undefined,
  },
  chrome: {
    label: "Chrome",
    color: "var(--chart-1)",
  },
  safari: {
    label: "Safari",
    color: "var(--chart-2)",
  },
  firefox: {
    label: "Firefox",
    color: "var(--chart-3)",
  },
  edge: {
    label: "Edge",
    color: "var(--chart-4)",
  },
  other: {
    label: "Other",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

const multipleBarChartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const chartShellClass = "flex h-full min-w-0 w-full flex-col gap-2 rounded-xl p-0 transition-colors hover:bg-surface-tertiary sm:p-2"
const chartCardClass = "gap-0 min-w-0 w-full overflow-hidden border-border/60 py-0 shadow-sm"
const chartHeaderClass = "px-0 sm:pl-2 sm:pr-0"
const chartTitleClass = "text-sm font-semibold tracking-tight text-foreground"
const chartContentClass = "min-w-0 px-3 pt-3 pb-4 sm:px-5 sm:pt-4"
const chartBodyClass = "h-full min-h-[220px] min-w-0 w-full sm:min-h-[240px]"

function getAxisLabel<T extends { index: number } & Record<K, string>, K extends string>(
  items: readonly T[],
  value: number,
  key: K,
) {
  return items.find(item => item.index === Math.round(value))?.[key] ?? ""
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div class="h-full min-h-40 bg-muted/50" />
      <div class="h-full min-h-40 bg-muted/50" />
      <div class="h-full min-h-40 bg-muted/50" />
    </div>

    <div :class="chartShellClass">
      <CardHeader class="flex flex-col gap-2 px-0 sm:flex-row sm:items-center sm:justify-between sm:pl-2 sm:pr-0">
        <CardTitle :class="chartTitleClass">
          Area Chart - Interactive
        </CardTitle>

        <Select v-model="timeRange">
          <SelectTrigger
            class="flex h-8 w-full rounded-lg sm:ml-auto sm:w-[148px]"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>

          <SelectContent class="rounded-xl">
            <SelectItem value="90d" class="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" class="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" class="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <Card :class="chartCardClass">
        <CardContent :class="chartContentClass">
          <ChartContainer
            :config="chartConfig"
            class="aspect-auto h-[220px] w-full sm:h-[250px]"
            :cursor="false"
          >
            <VisXYContainer
              :data="filteredChartData"
              :svg-defs="svgDefs"
              :margin="{ left: -40 }"
              :y-domain="[0, 1200]"
            >
              <VisArea
                :x="(d: DataPoint) => d.date"
                :y="[(d: DataPoint) => d.mobile, (d: DataPoint) => d.desktop]"
                :color="(_d: DataPoint, i: number) => ['url(#fillMobile)', 'url(#fillDesktop)'][i]"
                :opacity="0.6"
              />

              <VisLine
                :x="(d: DataPoint) => d.date"
                :y="[(d: DataPoint) => d.mobile, (d: DataPoint) => d.mobile + d.desktop]"
                :color="(_d: DataPoint, i: number) => [chartConfig.mobile.color, chartConfig.desktop.color][i]"
                :line-width="1"
              />

              <VisAxis
                type="x"
                :x="(d: DataPoint) => d.date"
                :tick-line="false"
                :domain-line="false"
                :grid-line="false"
                :num-ticks="6"
                :tick-format="(d: number) => new Date(d).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })"
              />

              <VisAxis
                type="y"
                :num-ticks="3"
                :tick-line="false"
                :domain-line="false"
              />

              <ChartTooltip />

              <ChartCrosshair
                :template="componentToString(chartConfig, ChartTooltipContent, {
                  labelFormatter: (d) => new Date(d).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  }),
                })"
                :color="(_d: DataPoint, i: number) => [chartConfig.mobile.color, chartConfig.desktop.color][i % 2]"
              />
            </VisXYContainer>

            <ChartLegendContent />
          </ChartContainer>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div :class="chartShellClass">
        <CardHeader :class="chartHeaderClass">
          <CardTitle :class="chartTitleClass">
            Tooltip - Default
          </CardTitle>
        </CardHeader>

        <Card :class="`${chartCardClass} flex flex-1 flex-col`">
          <CardContent :class="`${chartContentClass} flex flex-1`">
            <ChartContainer :config="singleBarChartConfig" :class="chartBodyClass">
              <VisXYContainer
                :data="barChartData"
                :padding="{ top: 10, bottom: 10, left: 10, right: 10 }"
              >
                <VisStackedBar
                  :x="(d: BarChartDatum) => d.date"
                  :y="[(d: BarChartDatum) => d.running, (d: BarChartDatum) => d.swimming]"
                  :color="[singleBarChartConfig.running.color, singleBarChartConfig.swimming.color]"
                  :rounded-corners="4"
                  :bar-padding="0.1"
                />

                <VisAxis
                  type="x"
                  :x="(d: BarChartDatum) => d.date"
                  :tick-line="false"
                  :domain-line="false"
                  :grid-line="false"
                  :num-ticks="6"
                  :tick-format="(d: number) => new Date(d).toLocaleDateString('en-US', {
                    weekday: 'short',
                  })"
                  :tick-values="barChartData.map(d => d.date)"
                />

                <ChartTooltip />

                <ChartCrosshair
                  :template="componentToString(singleBarChartConfig, ChartTooltipContent, {
                    labelFormatter(d) {
                      return new Date(d).toLocaleDateString('sv-SE')
                    },
                  })"
                  color="#0000"
                />
              </VisXYContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div :class="chartShellClass">
        <CardHeader :class="chartHeaderClass">
          <CardTitle :class="chartTitleClass">
            Pie Chart
          </CardTitle>
        </CardHeader>

        <Card :class="`${chartCardClass} flex flex-1 flex-col`">
          <CardContent :class="`${chartContentClass} flex flex-1 pb-0`">
            <ChartContainer
              :config="pieChartConfig"
              class="mx-auto flex h-full min-h-[220px] w-full items-center justify-center sm:min-h-[240px]"
            >
              <VisSingleContainer
                :data="pieChartData"
                class="h-full w-full"
                :margin="{ top: 30, bottom: 30 }"
              >
                <VisDonut
                  :value="(d: PieChartDatum) => d.visitors"
                  :color="(d: PieChartDatum) => pieChartConfig[d.browser as keyof typeof pieChartConfig].color"
                  :arc-width="30"
                />
                <ChartTooltip
                  :triggers="{
                    [VisDonutSelectors.segment]: componentToString(pieChartConfig, ChartTooltipContent, { hideLabel: true })!,
                  }"
                />
              </VisSingleContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div :class="chartShellClass">
        <CardHeader :class="chartHeaderClass">
          <CardTitle :class="chartTitleClass">
            Bar Chart - Multiple
          </CardTitle>
        </CardHeader>

        <Card :class="`${chartCardClass} flex flex-1 flex-col`">
          <CardContent :class="`${chartContentClass} flex flex-1`">
            <ChartContainer
              :config="multipleBarChartConfig"
              :class="chartBodyClass"
            >
              <VisXYContainer
                :data="multipleBarChartData"
                :margin="{ left: 8, right: 8, top: 8, bottom: 0 }"
                :y-domain="[0, 360]"
              >
                <VisGroupedBar
                  :x="(d: MultipleBarChartDatum) => d.index"
                  :y="[(d: MultipleBarChartDatum) => d.desktop, (d: MultipleBarChartDatum) => d.mobile]"
                  :color="(_d: MultipleBarChartDatum, i: number) => [multipleBarChartConfig.desktop.color, multipleBarChartConfig.mobile.color][i]"
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
                  :tick-format="(value: number) => getAxisLabel(multipleBarChartData, value, 'month')"
                />

                <VisAxis
                  type="y"
                  :tick-line="false"
                  :domain-line="false"
                  :num-ticks="4"
                />
              </VisXYContainer>

              <ChartLegendContent />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
