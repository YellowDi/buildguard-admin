<script setup lang="ts">
import { computed, onUnmounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import type { DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import companiesData from "@/mocks/companies.json"
import DetailLayout from "@/layouts/DetailLayout.vue"

// 企业详情页是当前详情体系的样板页。
// 新建其他详情页时，优先照这个结构做：
// 1. 从本地 JSON 或接口结果取出原始数据
// 2. 在页面顶部做格式化和字段补齐
// 3. 产出 fieldSections / relationModule schema
// 4. 用 DetailLayout + DetailFieldSections + DetailRelationModule 组装页面
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

type VehicleRelationRow = {
  id: string
  status: "expiring" | "overdue" | "normal"
  plate: string
  operator: string
  startDate: string
  endDate: string
}

type EmployeeRelationRow = {
  id: string
  role: "driver" | "escort"
  name: string
  phone: string
  vehicle: string
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

function createVehicleRow(
  id: string,
  status: VehicleRelationRow["status"],
  startDate: string,
  endDate: string,
): VehicleRelationRow {
  return {
    id,
    status,
    plate: "浙B12345",
    operator: "华森",
    startDate,
    endDate,
  }
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

// 左侧字段块 schema。
// 新页面如果也是“标题 + 普通字段列表”，只需要产出同结构的 sections。
const fieldSections = computed<DetailFieldSection[]>(() => {
  const c = company.value
  if (!c) return []

  return [
    {
      key: "base-info",
      title: "企业基础信息",
      rows: [
        { key: "name", label: "企业名称", value: c.name },
        { key: "type", label: "企业类型", value: c.type },
        { key: "district", label: "行政区域", value: c.district },
        { key: "legal-person", label: "法人姓名", value: c.legalPerson },
        { key: "phone", label: "联系电话", value: c.phone },
        { key: "start-date", label: "监管开始时间", value: formatDisplayDate(c.startDate) },
        { key: "end-date", label: "服务到期时间", value: formatDisplayDate(c.endDate) },
        { key: "service-days", label: "服务剩余时长", value: `${c.serviceDays} 天` },
        { key: "note", label: "备注", value: c.note || "—" },
      ],
    },
    {
      key: "contacts",
      title: "企业联系人",
      rows: [
        { key: "legal-contact", label: "法人", value: `${c.legalPerson} ${c.phone}` },
      ],
    },
  ]
})

// 右侧关系块的分组数据先在页面内整理好，再交给通用模块渲染。
const vehicleGroups = computed(() => {
  const c = company.value
  if (!c) return []

  const startDate = formatDisplayDate(c.startDate)
  const endDate = formatDisplayDate(c.endDate)

  return [
    {
      key: "expiring",
      title: "即将到期",
      rows: [
        createVehicleRow("expiring-1", "expiring", startDate, endDate),
        createVehicleRow("expiring-2", "expiring", startDate, endDate),
      ],
    },
    {
      key: "overdue",
      title: "已逾期",
      rows: [
        createVehicleRow("overdue-1", "overdue", startDate, endDate),
      ],
    },
    {
      key: "normal",
      title: "正常",
      rows: Array.from({ length: 5 }, (_, index) =>
        createVehicleRow(`normal-${index + 1}`, "normal", startDate, endDate),
      ),
    },
  ]
})

const employeeGroups = computed(() => [
  {
    key: "drivers",
    title: "司机",
    rows: [
      { id: "driver-1", role: "driver", name: "鲁文昊", phone: "13879024061", vehicle: "浙B12345" },
      { id: "driver-2", role: "driver", name: "范新建", phone: "18968349015", vehicle: "浙B12345" },
    ] satisfies EmployeeRelationRow[],
  },
  {
    key: "escorts",
    title: "押运员",
    rows: [
      { id: "escort-1", role: "escort", name: "左佩玉", phone: "13366481428", vehicle: "浙B12345" },
      { id: "escort-2", role: "escort", name: "顾瑞堂", phone: "18962491315", vehicle: "浙B12345" },
    ] satisfies EmployeeRelationRow[],
  },
])

// 关系模块 schema 决定列头、分组、列模板和横向滚动宽度。
// 新详情页如果结构类似，优先新增一个 module computed，而不是直接复制模板。
const vehicleModule = computed<DetailRelationModuleSchema<VehicleRelationRow>>(() => ({
  key: "vehicles",
  title: "关联车辆",
  rowKey: "id",
  mobileMinWidth: "39rem",
  columnTemplateMobile: "minmax(8.5rem, 1.55fr) minmax(4.5rem, 0.65fr) minmax(8rem, 0.95fr) minmax(8rem, 0.95fr) 2rem",
  columnTemplateDesktop: "minmax(6rem, 2fr) minmax(3.5rem, 0.6fr) minmax(6.75rem, 0.92fr) minmax(6.75rem, 0.92fr) 2rem",
  columnGapMobile: "0.75rem",
  columnGapDesktop: "1rem",
  columns: [
    { key: "plate", label: "车辆", slot: "vehicle-status-cell" },
    { key: "operator", label: "运营商" },
    { key: "startDate", label: "监管开始时间" },
    { key: "endDate", label: "服务到期时间" },
    { key: "actions", label: "", slot: "vehicle-action-cell", cellClass: "flex justify-end" },
  ],
  groups: vehicleGroups.value,
}))

const employeeModule = computed<DetailRelationModuleSchema<EmployeeRelationRow>>(() => ({
  key: "employees",
  title: "关联从业人员",
  rowKey: "id",
  mobileMinWidth: "24rem",
  columnTemplateMobile: "12rem 7rem 2rem",
  columnTemplateDesktop: "minmax(0, 1.5fr) minmax(0, 1fr) 2rem",
  columnGapMobile: "1rem",
  columnGapDesktop: "1rem",
  columns: [
    {
      key: "contact",
      label: "从业人员",
      value: row => `${row.name} ${row.phone}`,
      cellClass: "truncate",
    },
    { key: "vehicle", label: "绑定车辆" },
    { key: "actions", label: "", slot: "employee-action-cell", cellClass: "flex justify-end" },
  ],
  groups: employeeGroups.value,
}))

function goBack() {
  router.push({ name: "companies" })
}

watch(
  company,
  (c) => { detailBreadcrumbTitle.value = c?.name ?? null },
  { immediate: true },
)

onUnmounted(() => { detailBreadcrumbTitle.value = null })
</script>

<template>
  <DetailLayout
    :title="company?.name ?? '企业详情'"
    :subtitle="company?.type"
    :empty="!company"
    empty-text="未找到该企业信息"
    @back="goBack"
  >
    <template #actions>
      <Button
        variant="outline"
        size="sm"
        class="border-border/80 bg-background font-medium text-foreground shadow-none"
      >
        编辑企业资料
      </Button>
    </template>

    <template #primary>
      <DetailFieldSections v-if="company" :sections="fieldSections" />
    </template>

    <template #secondary>
      <template v-if="company">
        <div class="pb-5">
          <DetailRelationModule :schema="vehicleModule">
            <!-- 特殊列通过 slot 覆盖；普通文本列继续走 schema 默认渲染。 -->
            <template #vehicle-status-cell="{ row }">
              <div class="flex min-w-0 items-center gap-2 text-foreground">
                <i
                  :class="[
                    'text-[18px]',
                    row.status === 'expiring'
                      ? 'ri-time-fill text-[#F97316]'
                      : row.status === 'overdue'
                        ? 'ri-close-circle-fill text-[#EF4444]'
                        : 'ri-checkbox-circle-fill text-[#22C55E]',
                  ]"
                />
                <span class="truncate">{{ row.plate }}</span>
              </div>
            </template>

            <template #vehicle-action-cell>
              <Button variant="ghost" size="icon-sm" class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground">
                <i class="ri-more-line text-[18px]" />
              </Button>
            </template>
          </DetailRelationModule>

          <Separator class="my-5 bg-border/80" />

          <DetailRelationModule :schema="employeeModule">
            <template #employee-action-cell>
              <Button variant="ghost" size="icon-sm" class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                <i class="ri-more-line text-[18px]" />
              </Button>
            </template>
          </DetailRelationModule>
        </div>
      </template>
    </template>
  </DetailLayout>
</template>
