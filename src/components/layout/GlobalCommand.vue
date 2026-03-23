<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import { useRouter, type RouteLocationRaw } from "vue-router"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import alarmArchivesData from "@/mocks/alarm-archives.json"
import alarmQueriesData from "@/mocks/alarm-queries.json"
import companiesData from "@/mocks/companies.json"
import usersData from "@/mocks/users.json"
import vehiclesData from "@/mocks/vehicles.json"

type SearchItem = {
  id: string
  label: string
  subtitle: string
  icon: string
  type: string
  value: string
  to: RouteLocationRaw
}

type CompanyRecord = {
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

type UserRecord = {
  id: number
  name: string
  phone: string
  company: string
  role: string
  district: string
  certificateLevel: string
  experienceYears: number
  joinedAt: string
  status: string
  note: string
}

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

type AlarmArchiveRecord = {
  id: number
  archiveNumber: string
  plateNumber: string
  company: string
  alarmType: string
  riskLevel: string
  archivedAt: string
  archiveStatus: string
  archivedBy: string
  note: string
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
}>()

const router = useRouter()

const dialogOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
})
const searchQuery = ref("")
const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0)
const MAX_RESULTS_PER_GROUP = 8
const groupLimits = reactive({
  companies: MAX_RESULTS_PER_GROUP,
  users: MAX_RESULTS_PER_GROUP,
  operatingVehicles: MAX_RESULTS_PER_GROUP,
  alarmVehicles: MAX_RESULTS_PER_GROUP,
  inspectionVehicles: MAX_RESULTS_PER_GROUP,
  alarmQueries: MAX_RESULTS_PER_GROUP,
  alarmArchives: MAX_RESULTS_PER_GROUP,
})

const pageSearchItems: SearchItem[] = [
  {
    id: "page-dashboard",
    label: "工作台",
    subtitle: "打开工作台首页",
    icon: "ri-home-5-line",
    type: "页面",
    value: "工作台 打开工作台首页 dashboard home workspace",
    to: "/",
  },
  {
    id: "page-customers",
    label: "客户",
    subtitle: "查看客户列表",
    icon: "ri-user-3-line",
    type: "页面",
    value: "客户 查看客户列表 customer client",
    to: "/customers",
  },
  {
    id: "page-companies",
    label: "企业",
    subtitle: "查看企业列表",
    icon: "ri-building-line",
    type: "页面",
    value: "企业 查看企业列表 company enterprise",
    to: "/companies",
  },
  {
    id: "page-buildings",
    label: "建筑",
    subtitle: "查看建筑列表",
    icon: "ri-building-line",
    type: "页面",
    value: "建筑 查看建筑列表 building buildings",
    to: "/buildings",
  },
  {
    id: "page-vehicles",
    label: "车辆",
    subtitle: "查看车辆列表",
    icon: "ri-truck-line",
    type: "页面",
    value: "车辆 查看车辆列表 vehicle truck",
    to: "/vehicles",
  },
  {
    id: "page-inspection-work-orders",
    label: "检修工单",
    subtitle: "查看检修工单列表",
    icon: "ri-file-list-3-line",
    type: "页面",
    value: "检修工单 查看检修工单列表 inspection work order work-order ticket",
    to: "/work-orders/inspection",
  },
  {
    id: "page-repair-work-orders",
    label: "维修工单",
    subtitle: "查看维修工单列表",
    icon: "ri-tools-line",
    type: "页面",
    value: "维修工单 查看维修工单列表 repair work order work-order ticket",
    to: "/work-orders/repair",
  },
  {
    id: "page-users",
    label: "从业人员",
    subtitle: "查看从业人员列表",
    icon: "ri-team-line",
    type: "页面",
    value: "从业人员 查看从业人员列表 users staff",
    to: "/users",
  },
  {
    id: "page-call-center-tasks",
    label: "外呼任务",
    subtitle: "查看呼叫中心外呼任务列表",
    icon: "ri-customer-service-2-line",
    type: "页面",
    value: "外呼任务 查看呼叫中心外呼任务列表 call center outbound tasks",
    to: "/call-center-tasks",
  },
  {
    id: "page-alarm-queries",
    label: "报警查询",
    subtitle: "查看待处理报警记录",
    icon: "ri-alarm-warning-line",
    type: "页面",
    value: "报警查询 查看待处理报警记录 alarm query",
    to: "/alarm-queries",
  },
  {
    id: "page-alarm-archives",
    label: "历史归档",
    subtitle: "查看历史归档记录",
    icon: "ri-archive-stack-line",
    type: "页面",
    value: "历史归档 查看历史归档记录 alarm archive",
    to: "/alarm-archives",
  },
]

const quickSearchItems: SearchItem[] = [
  {
    id: "action-customer-create",
    label: "添加客户",
    subtitle: "进入客户新建流程",
    icon: "ri-add-circle-line",
    type: "新建",
    value: "添加客户 进入客户新建流程 create customer",
    to: "/customers/create",
  },
  {
    id: "action-company-create",
    label: "添加企业",
    subtitle: "进入企业新建流程",
    icon: "ri-add-circle-line",
    type: "新建",
    value: "添加企业 进入企业新建流程 create company",
    to: "/companies/create",
  },
  {
    id: "action-vehicle-create",
    label: "添加车辆",
    subtitle: "进入车辆新建流程",
    icon: "ri-add-circle-line",
    type: "新建",
    value: "添加车辆 进入车辆新建流程 create vehicle",
    to: "/vehicles/create",
  },
  {
    id: "action-user-create",
    label: "添加从业人员",
    subtitle: "进入人员新建流程",
    icon: "ri-add-circle-line",
    type: "新建",
    value: "添加从业人员 进入人员新建流程 create user staff",
    to: "/users/create",
  },
]

const companies = companiesData as CompanyRecord[]
const users = usersData as UserRecord[]
const vehicleBundle = vehiclesData as VehicleDataBundle
const alarmQueries = alarmQueriesData as AlarmQueryRecord[]
const alarmArchives = alarmArchivesData as AlarmArchiveRecord[]

const companyItems: SearchItem[] = companies.map(company => ({
  id: `company-${company.id}`,
  label: company.name,
  subtitle: `${company.district} · ${company.type} · ${company.legalPerson} · ${company.phone}`,
  icon: "ri-building-line",
  type: "企业",
  value: buildSearchValue(
    company.name,
    company.district,
    company.type,
    company.legalPerson,
    company.phone,
    company.note,
  ),
  to: { name: "company-detail", params: { id: String(company.id) } },
}))

const userItems: SearchItem[] = users.map(user => ({
  id: `user-${user.id}`,
  label: user.name,
  subtitle: `${user.company} · ${user.role} · ${user.phone}`,
  icon: "ri-team-line",
  type: "人员",
  value: buildSearchValue(
    user.name,
    user.phone,
    user.company,
    user.role,
    user.district,
    user.certificateLevel,
    user.status,
    user.note,
  ),
  to: { path: "/users", query: { q: user.phone } },
}))

const operatingVehicleItems: SearchItem[] = vehicleBundle.operating.map(vehicle => ({
  id: `vehicle-operating-${vehicle.plateNumber}`,
  label: vehicle.plateNumber,
  subtitle: `${vehicle.company} · ${vehicle.vehicleType} · ${vehicle.district}`,
  icon: "ri-truck-line",
  type: "运营车辆",
  value: buildSearchValue(
    vehicle.plateNumber,
    vehicle.company,
    vehicle.vehicleType,
    vehicle.district,
    vehicle.onlineRate,
    vehicle.note,
  ),
  to: { path: "/vehicles", query: { tab: "overview", q: vehicle.plateNumber } },
}))

const alarmVehicleItems: SearchItem[] = vehicleBundle.alarm.map(vehicle => ({
  id: `vehicle-alarm-${vehicle.plateNumber}`,
  label: vehicle.plateNumber,
  subtitle: `${vehicle.company} · ${vehicle.latestAlarm} · ${vehicle.status}`,
  icon: "ri-alarm-warning-line",
  type: "报警车辆",
  value: buildSearchValue(
    vehicle.plateNumber,
    vehicle.company,
    vehicle.riskLevel,
    vehicle.latestAlarm,
    vehicle.status,
    vehicle.note,
  ),
  to: { path: "/vehicles", query: { tab: "alarms", q: vehicle.plateNumber } },
}))

const inspectionVehicleItems: SearchItem[] = vehicleBundle.inspection.map(vehicle => ({
  id: `vehicle-inspection-${vehicle.plateNumber}`,
  label: vehicle.plateNumber,
  subtitle: `${vehicle.company} · 下次复核 ${vehicle.nextReview}`,
  icon: "ri-calendar-event-line",
  type: "年检维保",
  value: buildSearchValue(
    vehicle.plateNumber,
    vehicle.company,
    vehicle.annualCheck,
    vehicle.maintenance,
    vehicle.nextReview,
    vehicle.note,
  ),
  to: { path: "/vehicles", query: { tab: "inspections", q: vehicle.plateNumber } },
}))

const alarmQueryItems: SearchItem[] = alarmQueries.map(record => ({
  id: `alarm-query-${record.id}`,
  label: record.plateNumber,
  subtitle: `${record.company} · ${record.latestAlarm} · ${record.status}`,
  icon: "ri-file-search-line",
  type: "报警记录",
  value: buildSearchValue(
    record.plateNumber,
    record.company,
    record.riskLevel,
    record.latestAlarm,
    record.alarmTime,
    record.status,
    record.handler,
    record.note,
  ),
  to: { path: "/alarm-queries", query: { q: record.plateNumber } },
}))

const alarmArchiveItems: SearchItem[] = alarmArchives.map(record => ({
  id: `alarm-archive-${record.id}`,
  label: record.archiveNumber,
  subtitle: `${record.plateNumber} · ${record.company} · ${record.alarmType}`,
  icon: "ri-archive-line",
  type: "归档记录",
  value: buildSearchValue(
    record.archiveNumber,
    record.plateNumber,
    record.company,
    record.alarmType,
    record.riskLevel,
    record.archiveStatus,
    record.archivedBy,
    record.note,
  ),
  to: { path: "/alarm-archives", query: { q: record.archiveNumber } },
}))

const matchedCompanyItems = computed(() => getMatchedItems(companyItems))
const matchedUserItems = computed(() => getMatchedItems(userItems))
const matchedOperatingVehicleItems = computed(() => getMatchedItems(operatingVehicleItems))
const matchedAlarmVehicleItems = computed(() => getMatchedItems(alarmVehicleItems))
const matchedInspectionVehicleItems = computed(() => getMatchedItems(inspectionVehicleItems))
const matchedAlarmQueryItems = computed(() => getMatchedItems(alarmQueryItems))
const matchedAlarmArchiveItems = computed(() => getMatchedItems(alarmArchiveItems))

const visibleCompanyItems = computed(() => matchedCompanyItems.value.slice(0, groupLimits.companies))
const visibleUserItems = computed(() => matchedUserItems.value.slice(0, groupLimits.users))
const visibleOperatingVehicleItems = computed(() => matchedOperatingVehicleItems.value.slice(0, groupLimits.operatingVehicles))
const visibleAlarmVehicleItems = computed(() => matchedAlarmVehicleItems.value.slice(0, groupLimits.alarmVehicles))
const visibleInspectionVehicleItems = computed(() => matchedInspectionVehicleItems.value.slice(0, groupLimits.inspectionVehicles))
const visibleAlarmQueryItems = computed(() => matchedAlarmQueryItems.value.slice(0, groupLimits.alarmQueries))
const visibleAlarmArchiveItems = computed(() => matchedAlarmArchiveItems.value.slice(0, groupLimits.alarmArchives))

function handleCommandSelect(to: RouteLocationRaw) {
  dialogOpen.value = false
  router.push(to)
}

function handleGlobalKeydown(event: KeyboardEvent) {
  const isCommandShortcut = (event.metaKey || event.ctrlKey)
    && !event.altKey
    && !event.shiftKey
    && event.key.toLowerCase() === "k"

  if (!isCommandShortcut) {
    return
  }

  event.preventDefault()
  dialogOpen.value = true
}

onMounted(() => {
  window.addEventListener("keydown", handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown)
})

function buildSearchValue(...parts: Array<string | number | undefined>) {
  return parts.filter(Boolean).join(" ")
}

function getMatchedItems(items: SearchItem[]) {
  const keyword = searchQuery.value.trim().toLowerCase()

  if (!keyword) {
    return []
  }

  return items.filter(item => item.value.toLowerCase().includes(keyword))
}

function canLoadMore(group: keyof typeof groupLimits, total: number) {
  return total > groupLimits[group]
}

function handleLoadMore(group: keyof typeof groupLimits) {
  groupLimits[group] += MAX_RESULTS_PER_GROUP
}

function handleLoadMoreVehicles() {
  handleLoadMore("operatingVehicles")
  handleLoadMore("alarmVehicles")
  handleLoadMore("inspectionVehicles")
}

function resetGroupLimits() {
  groupLimits.companies = MAX_RESULTS_PER_GROUP
  groupLimits.users = MAX_RESULTS_PER_GROUP
  groupLimits.operatingVehicles = MAX_RESULTS_PER_GROUP
  groupLimits.alarmVehicles = MAX_RESULTS_PER_GROUP
  groupLimits.inspectionVehicles = MAX_RESULTS_PER_GROUP
  groupLimits.alarmQueries = MAX_RESULTS_PER_GROUP
  groupLimits.alarmArchives = MAX_RESULTS_PER_GROUP
}

watch(dialogOpen, (open) => {
  if (!open) {
    searchQuery.value = ""
    resetGroupLimits()
  }
})

watch(() => searchQuery.value.trim(), () => {
  resetGroupLimits()
})
</script>

<template>
  <CommandDialog
    v-model:open="dialogOpen"
    title="搜索"
    description="搜索页面、企业、车辆、从业人员与报警记录"
    :prevent-close-auto-focus="true"
    content-class="h-[min(680px,calc(100vh-2rem))] [&>[data-slot=dialog-close]]:top-0.5 [&>[data-slot=dialog-close]]:right-2 [&>[data-slot=dialog-close]]:flex [&>[data-slot=dialog-close]]:h-8 [&>[data-slot=dialog-close]]:w-8 [&>[data-slot=dialog-close]]:items-center [&>[data-slot=dialog-close]]:justify-center [&>[data-slot=dialog-close]]:rounded-md [&>[data-slot=dialog-close]]:bg-transparent [&>[data-slot=dialog-close]]:opacity-100 [&>[data-slot=dialog-close]]:ring-0 [&>[data-slot=dialog-close]]:transition-colors [&>[data-slot=dialog-close]]:focus:ring-0 [&>[data-slot=dialog-close]]:focus:ring-offset-0 [&>[data-slot=dialog-close]]:focus:outline-none [&>[data-slot=dialog-close]]:data-[state=open]:bg-transparent [&>[data-slot=dialog-close]]:data-[state=open]:text-sidebar-foreground/52 [&>[data-slot=dialog-close]]:hover:bg-transparent [&>[data-slot=dialog-close]]:hover:text-sidebar-accent-foreground [&>[data-slot=dialog-close]]:before:absolute [&>[data-slot=dialog-close]]:before:inset-0 [&>[data-slot=dialog-close]]:before:rounded-md [&>[data-slot=dialog-close]]:before:bg-[var(--top-tab-switch-active-surface)] [&>[data-slot=dialog-close]]:before:opacity-0 [&>[data-slot=dialog-close]]:before:scale-[0.94] [&>[data-slot=dialog-close]]:before:transition-[opacity,transform] [&>[data-slot=dialog-close]]:before:duration-[120ms,220ms] [&>[data-slot=dialog-close]]:before:ease-out [&>[data-slot=dialog-close]]:hover:before:opacity-100 [&>[data-slot=dialog-close]]:hover:before:scale-100 [&>[data-slot=dialog-close]]:focus-visible:before:opacity-100 [&>[data-slot=dialog-close]]:focus-visible:before:scale-100 [&>[data-slot=dialog-close]>svg]:relative [&>[data-slot=dialog-close]>svg]:z-10"
  >
    <CommandInput v-model="searchQuery" placeholder="搜索..." class="pr-12" />
    <CommandList class="min-h-0 flex-1 max-h-none">
      <CommandEmpty>没有找到匹配结果。</CommandEmpty>

      <CommandGroup heading="页面">
        <CommandItem
          v-for="item in pageSearchItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator />

      <CommandGroup heading="快捷操作">
        <CommandItem
          v-for="item in quickSearchItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator v-if="hasSearchQuery" />

      <CommandGroup v-if="hasSearchQuery" heading="企业">
        <CommandItem
          v-for="item in visibleCompanyItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>

        <button
          v-if="canLoadMore('companies', matchedCompanyItems.length)"
          type="button"
          class="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-2 text-left text-sm transition-colors"
          @click="handleLoadMore('companies')"
        >
          加载更多企业
        </button>
      </CommandGroup>

      <CommandSeparator v-if="hasSearchQuery" />

      <CommandGroup v-if="hasSearchQuery" heading="从业人员">
        <CommandItem
          v-for="item in visibleUserItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>

        <button
          v-if="canLoadMore('users', matchedUserItems.length)"
          type="button"
          class="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-2 text-left text-sm transition-colors"
          @click="handleLoadMore('users')"
        >
          加载更多从业人员
        </button>
      </CommandGroup>

      <CommandSeparator v-if="hasSearchQuery" />

      <CommandGroup v-if="hasSearchQuery" heading="车辆">
        <CommandItem
          v-for="item in visibleOperatingVehicleItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>

        <CommandItem
          v-for="item in visibleAlarmVehicleItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>

        <CommandItem
          v-for="item in visibleInspectionVehicleItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>

        <button
          v-if="canLoadMore('operatingVehicles', matchedOperatingVehicleItems.length) || canLoadMore('alarmVehicles', matchedAlarmVehicleItems.length) || canLoadMore('inspectionVehicles', matchedInspectionVehicleItems.length)"
          type="button"
          class="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-2 text-left text-sm transition-colors"
          @click="handleLoadMoreVehicles"
        >
          加载更多车辆结果
        </button>
      </CommandGroup>

      <CommandSeparator v-if="hasSearchQuery" />

      <CommandGroup v-if="hasSearchQuery" heading="报警记录">
        <CommandItem
          v-for="item in visibleAlarmQueryItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>

        <button
          v-if="canLoadMore('alarmQueries', matchedAlarmQueryItems.length)"
          type="button"
          class="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-2 text-left text-sm transition-colors"
          @click="handleLoadMore('alarmQueries')"
        >
          加载更多报警记录
        </button>
      </CommandGroup>

      <CommandSeparator v-if="hasSearchQuery" />

      <CommandGroup v-if="hasSearchQuery" heading="历史归档">
        <CommandItem
          v-for="item in visibleAlarmArchiveItems"
          :key="item.id"
          :value="item.value"
          class="items-start py-2.5"
          @select="handleCommandSelect(item.to)"
        >
          <i :class="[item.icon, 'mt-0.5 text-base leading-none']" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ item.type }}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.subtitle }}</p>
          </div>
        </CommandItem>

        <button
          v-if="canLoadMore('alarmArchives', matchedAlarmArchiveItems.length)"
          type="button"
          class="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-2 text-left text-sm transition-colors"
          @click="handleLoadMore('alarmArchives')"
        >
          加载更多归档记录
        </button>
      </CommandGroup>
    </CommandList>

    <div class="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
      <div class="flex items-center gap-2">
        <KbdGroup>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </KbdGroup>
        <span>移动选择</span>
      </div>

      <div class="flex items-center gap-2">
        <Kbd>Enter</Kbd>
        <span>执行</span>
      </div>

      <div class="flex items-center gap-2">
        <Kbd>Esc</Kbd>
        <span>关闭</span>
      </div>
    </div>
  </CommandDialog>
</template>
