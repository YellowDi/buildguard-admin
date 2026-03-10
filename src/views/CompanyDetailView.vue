<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import companiesData from "@/data/companies.json"

type RawCompanyRecord = {
  id: number
  name: string
  type: string
  district: string
  vehicles: number
  legalPerson: string
  phone: string
  serviceDays: number
  lastUpdated: string
  note: string
}

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function buildEndDate(serviceDays: number) {
  const baseDate = new Date()
  baseDate.setHours(0, 0, 0, 0)
  baseDate.setDate(baseDate.getDate() + serviceDays)
  return toISODate(baseDate)
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getRemainingDays(endDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) return 0
  const diff = targetDate.getTime() - today.getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
}

function formatDisplayDate(iso: string) {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  return `${y} / ${m} / ${d}`
}

const route = useRoute()
const router = useRouter()
const companyId = computed(() => Number(route.params.id))

const company = computed(() => {
  const list = companiesData as RawCompanyRecord[]
  const raw = list.find(c => c.id === companyId.value)
  if (!raw) return null
  const startDate = extractDatePart(raw.lastUpdated)
  const endDate = buildEndDate(raw.serviceDays)
  const remainingDays = getRemainingDays(endDate)
  return {
    ...raw,
    startDate,
    endDate,
    serviceDays: remainingDays,
  }
})

const baseInfoRows = computed(() => {
  const c = company.value
  if (!c) return []
  return [
    { label: "企业名称", value: c.name },
    { label: "企业类型", value: c.type },
    { label: "行政区域", value: c.district },
    { label: "法人姓名", value: c.legalPerson },
    { label: "联系电话", value: c.phone },
    { label: "监管开始时间", value: formatDisplayDate(c.startDate) },
    { label: "服务到期时间", value: formatDisplayDate(c.endDate) },
    { label: "服务剩余时长", value: `${c.serviceDays} 天` },
    { label: "备注", value: c.note || "—" },
  ]
})

const vehiclesGrouped = computed(() => {
  const c = company.value
  if (!c) return { expiring: [], overdue: [], normal: [] }
  const startDate = formatDisplayDate(c.startDate)
  const endDate = formatDisplayDate(c.endDate)
  return {
    expiring: [
      { plate: "浙B12345", operator: "华森", startDate, endDate },
      { plate: "浙B12345", operator: "华森", startDate, endDate },
    ],
    overdue: [
      { plate: "浙B12345", operator: "华森", startDate, endDate },
    ],
    normal: Array.from({ length: 5 }, () => ({
      plate: "浙B12345",
      operator: "华森",
      startDate,
      endDate,
    })),
  }
})

const driverRows = computed(() => [
  { name: "鲁文昊", phone: "13879024061", vehicle: "浙B12345" },
  { name: "范新建", phone: "18968349015", vehicle: "浙B12345" },
])

const escortRows = computed(() => [
  { name: "左佩玉", phone: "13366481428", vehicle: "浙B12345" },
  { name: "顾瑞堂", phone: "18962491315", vehicle: "浙B12345" },
])

const contactRows = computed(() => {
  const c = company.value
  if (!c) return []
  return [
    { label: "法人", value: `${c.legalPerson} ${c.phone}` },
  ]
})

const vehicleCount = computed(() => company.value?.vehicles ?? 0)

const employeeCount = computed(() => driverRows.value.length + escortRows.value.length)

function goBack() {
  router.push({ name: "companies" })
}

watch(company, c => { detailBreadcrumbTitle.value = c?.name ?? null }, { immediate: true })
onMounted(() => { if (company.value) detailBreadcrumbTitle.value = company.value.name })
onUnmounted(() => { detailBreadcrumbTitle.value = null })
</script>

<template>
  <section class="mx-auto flex w-full max-w-[1440px] min-w-0 flex-1 flex-col px-4 pb-10 xl:px-8">
    <template v-if="company">
      <div class="sticky -top-4 z-10 -mx-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div class="px-8 py-5">
          <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <h1 class="flex flex-wrap items-end gap-x-3 gap-y-2 text-[24px] tracking-[-0.04em] text-foreground md:text-[28px]">
                <span class="font-semibold leading-none">{{ company.name }}</span>
                <span class="text-[20px] font-normal leading-none text-muted-foreground md:text-[22px]">
                  {{ company.type }}
                </span>
              </h1>
            </div>
            <div class="flex w-full items-center justify-start md:w-auto md:justify-end">
              <Button
                variant="outline"
                class="h-10 rounded-md border-border/80 bg-background px-5 text-[15px] font-medium text-foreground shadow-none"
              >
                编辑企业资料
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-1 gap-0 px-3 pt-8 xl:grid-cols-[1fr_1px_0.98fr] xl:px-4">
        <div class="min-w-0 pr-0 xl:pr-8">
          <div class="pb-7">
            <h2 class="mb-4 px-3 text-[14px] font-semibold leading-none text-foreground md:text-[15px]">
              企业基础信息
            </h2>
            <div>
              <div
                v-for="(row, index) in baseInfoRows"
                :key="`base-${index}`"
                class="group grid grid-cols-[180px_minmax(0,1fr)] items-center py-1.5 text-[14px] leading-6 transition-colors hover:bg-accent/35"
              >
                <div class="px-3 text-muted-foreground transition-colors group-hover:text-foreground">{{ row.label }}</div>
                <div class="truncate pr-5 text-foreground">{{ row.value }}</div>
              </div>
            </div>
          </div>

          <Separator class="bg-border/80" />

          <div class="pt-5">
            <h2 class="mb-4 px-3 text-[14px] font-semibold leading-none text-foreground md:text-[15px]">
              企业联系人
            </h2>
            <div>
              <div
                v-for="(row, idx) in contactRows"
                :key="`contact-${idx}`"
                class="group grid grid-cols-[180px_minmax(0,1fr)] items-center py-1.5 text-[14px] leading-6 transition-colors hover:bg-accent/35"
              >
                <div class="px-3 text-muted-foreground">{{ row.label }}</div>
                <div class="pr-5 text-foreground">{{ row.value }}</div>
              </div>
            </div>
          </div>
        </div>

        <Separator orientation="vertical" class="hidden h-auto bg-border/80 xl:block" />

        <div class="min-w-0 pt-8 xl:pt-0 xl:pl-8">
          <div class="pb-5">
            <div class="mb-2 grid grid-cols-[minmax(0,1fr)_96px_128px_128px_28px] items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="text-[15px] font-semibold leading-none text-foreground">关联车辆</span>
                <span class="inline-flex min-w-6 items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-[12px] font-medium leading-none text-muted-foreground">
                  {{ vehicleCount }}
                </span>
              </div>
              <div class="text-[12px] text-muted-foreground">运营商</div>
              <div class="text-[12px] text-muted-foreground">监管开始时间</div>
              <div class="text-[12px] text-muted-foreground">服务到期时间</div>
              <div />
            </div>

            <div class="space-y-4">
              <div>
                <div class="mb-1 flex items-center gap-3">
                  <div class="shrink-0 text-[14px] font-medium text-muted-foreground">即将到期</div>
                  <div class="h-px flex-1 bg-border/80" />
                </div>
                <div
                  v-for="(row, idx) in vehiclesGrouped.expiring"
                  :key="`expiring-${idx}`"
                  class="grid min-h-[44px] grid-cols-[minmax(0,1fr)_96px_128px_128px_28px] items-center gap-4 text-[14px] transition-colors hover:bg-accent/35"
                >
                  <div class="flex min-w-0 items-center gap-2 text-foreground">
                    <i class="ri-time-fill text-[18px] text-[#F97316]" />
                    <span class="truncate">{{ row.plate }}</span>
                  </div>
                  <div class="text-foreground">{{ row.operator }}</div>
                  <div class="text-foreground">{{ row.startDate }}</div>
                  <div class="text-foreground">{{ row.endDate }}</div>
                  <Button variant="ghost" size="icon-sm" class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground">
                    <i class="ri-more-line text-[18px]" />
                  </Button>
                </div>
              </div>

              <div>
                <div class="mb-1 flex items-center gap-3">
                  <div class="shrink-0 text-[14px] font-medium text-muted-foreground">已逾期</div>
                  <div class="h-px flex-1 bg-border/80" />
                </div>
                <div
                  v-for="(row, idx) in vehiclesGrouped.overdue"
                  :key="`overdue-${idx}`"
                  class="grid min-h-[44px] grid-cols-[minmax(0,1fr)_96px_128px_128px_28px] items-center gap-4 text-[14px] transition-colors hover:bg-accent/35"
                >
                  <div class="flex min-w-0 items-center gap-2 text-foreground">
                    <i class="ri-close-circle-fill text-[18px] text-[#EF4444]" />
                    <span class="truncate">{{ row.plate }}</span>
                  </div>
                  <div class="text-foreground">{{ row.operator }}</div>
                  <div class="text-foreground">{{ row.startDate }}</div>
                  <div class="text-foreground">{{ row.endDate }}</div>
                  <Button variant="ghost" size="icon-sm" class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground">
                    <i class="ri-more-line text-[18px]" />
                  </Button>
                </div>
              </div>

              <div>
                <div class="mb-1 flex items-center gap-3">
                  <div class="shrink-0 text-[14px] font-medium text-muted-foreground">正常</div>
                  <div class="h-px flex-1 bg-border/80" />
                </div>
                <div
                  v-for="(row, idx) in vehiclesGrouped.normal"
                  :key="`normal-${idx}`"
                  class="grid min-h-[44px] grid-cols-[minmax(0,1fr)_96px_128px_128px_28px] items-center gap-4 text-[14px] transition-colors hover:bg-accent/35"
                >
                  <div class="flex min-w-0 items-center gap-2 text-foreground">
                    <i class="ri-checkbox-circle-fill text-[18px] text-[#22C55E]" />
                    <span class="truncate">{{ row.plate }}</span>
                  </div>
                  <div class="text-foreground">{{ row.operator }}</div>
                  <div class="text-foreground">{{ row.startDate }}</div>
                  <div class="text-foreground">{{ row.endDate }}</div>
                  <Button variant="ghost" size="icon-sm" class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground">
                    <i class="ri-more-line text-[18px]" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator class="bg-border/80" />

          <div class="pt-5">
            <div class="mb-2 grid grid-cols-[minmax(0,1fr)_160px_28px] items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="text-[15px] font-semibold leading-none text-foreground">关联从业人员</span>
                <span class="inline-flex min-w-6 items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-[12px] font-medium leading-none text-muted-foreground">
                  {{ employeeCount }}
                </span>
              </div>
              <div class="text-[12px] text-muted-foreground">绑定车辆</div>
              <div />
            </div>

            <div class="space-y-4">
              <div>
                <div class="mb-1 flex items-center gap-3">
                  <div class="shrink-0 text-[14px] font-medium text-muted-foreground">司机</div>
                  <div class="h-px flex-1 bg-border/80" />
                </div>
                <div
                  v-for="(row, idx) in driverRows"
                  :key="`driver-${idx}`"
                  class="grid min-h-[44px] grid-cols-[minmax(0,1fr)_160px_32px] items-center gap-4 text-[14px] transition-colors hover:bg-accent/35"
                >
                  <div class="truncate text-foreground">{{ row.name }} {{ row.phone }}</div>
                  <div class="text-foreground">{{ row.vehicle }}</div>
                  <Button variant="ghost" size="icon-sm" class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                    <i class="ri-more-line text-[18px]" />
                  </Button>
                </div>
              </div>

              <div>
                <div class="mb-1 flex items-center gap-3">
                  <div class="shrink-0 text-[14px] font-medium text-muted-foreground">押运员</div>
                  <div class="h-px flex-1 bg-border/80" />
                </div>
                <div
                  v-for="(row, idx) in escortRows"
                  :key="`escort-${idx}`"
                  class="grid min-h-[44px] grid-cols-[minmax(0,1fr)_160px_32px] items-center gap-4 text-[14px] transition-colors hover:bg-accent/35"
                >
                  <div class="truncate text-foreground">{{ row.name }} {{ row.phone }}</div>
                  <div class="text-foreground">{{ row.vehicle }}</div>
                  <Button variant="ghost" size="icon-sm" class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                    <i class="ri-more-line text-[18px]" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="mx-auto w-full max-w-[1440px] min-w-0">
        <div class="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          <p>未找到该企业信息</p>
          <Button variant="link" class="ml-2" @click="goBack">返回列表</Button>
        </div>
      </div>
    </template>
  </section>
</template>
