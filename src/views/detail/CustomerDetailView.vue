<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import DetailAccordionModule from "@/components/detail/DetailAccordionModule.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import type { DetailContactValue, DetailFieldSection, DetailRelationModuleSchema } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { deleteCustomer, fetchCustomerDetail, type CustomerDetailPerson, type CustomerDetailResult } from "@/lib/customers-api"
import customersData from "@/mocks/customers.json"
import { fetchParkDetail, fetchParks, type ParkDetailResult, type ParkListItem } from "@/lib/parks-api"

type BuildingRow = {
  key: string
  uuid: string
  parkUuid: string
  name: string
  address: string
  status: "一切正常" | "需重点关注" | "存在风险"
}

type ParkBuildingGroup = {
  key: string
  title: string
  meta: string
  details: DetailFieldSection[]
  buildingModule: DetailRelationModuleSchema<BuildingRow>
  parkUuid: string
  customerUuid: string
}

type MaintenanceRecordRow = {
  id: string
  status: "pending" | "processing" | "completed"
  location: string
  item: string
  principal: string
  updatedAt: string
}

type CustomerPackageMockRecord = {
  name: string
  packageName: string
  packageCode: string
  remainingDays: number
  remainingFunds: number
  inspectionTimes: number
  inspectionCycle: string
}

type CustomerDetailTab = "basic-info" | "building-assets" | "work-orders" | "monitoring" | "sub-accounts"

const route = useRoute()
const router = useRouter()

const customer = ref<CustomerDetailResult | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const activeTab = ref<CustomerDetailTab>("basic-info")
const deleteSubmitting = ref(false)
const relationsLoading = ref(false)
const relationErrorMessage = ref("")
const parkBuildingGroups = ref<ParkBuildingGroup[]>([])
const parkDetailSheetOpen = ref(false)
const parkDetailLoading = ref(false)
const parkDetailErrorMessage = ref("")
const activeParkDetail = ref<ParkDetailResult | null>(null)
let latestRequestId = 0
let latestRelationsRequestId = 0
let latestParkDetailRequestId = 0

const customerUuid = computed(() => {
  const value = route.params.id
  return typeof value === "string" ? value.trim() : ""
})

const pageTitle = computed(() => customer.value?.CorpName?.trim() || "客户详情")
const pageSubtitle = computed(() => customer.value?.Business?.trim() || "")
const isEmpty = computed(() => !loading.value && !customer.value)
const detailTabs = computed(() => [
  { id: "basic-info", label: "基本信息" },
  { id: "building-assets", label: "建筑资产" },
  { id: "work-orders", label: "工单列表" },
  { id: "monitoring", label: "监控" },
  { id: "sub-accounts", label: "子账号" },
])
const detailHeaderTabs = computed(() => detailTabs.value.map(tab => ({
  ...tab,
  active: activeTab.value === tab.id,
})))

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
        { key: "corp-name", label: "企业名称", value: toDisplayText(current.CorpName) },
        { key: "business", label: "所属行业", value: toDisplayText(current.Business) },
        { key: "business-license", label: "营业执照照片", value: current.UsciFile ? null : "—", imageUrl: current.UsciFile || null, truncate: false },
        { key: "usci", label: "信用代码", value: toDisplayText(current.Usci) },
        { key: "address", label: "详细地址", value: toDisplayText(current.Address), truncate: false, valueClass: "leading-6" },
        { key: "invoice", label: "开票资料", value: toDisplayText(current.Invoice), truncate: false, valueClass: "leading-6" },
      ],
    },
    {
      key: "contacts",
      title: "客户联系人",
      rows: buildContactFieldRows(current.People),
    },
    {
      key: "package-info",
      title: "套餐信息",
      rows: buildPackageFieldRows(current),
    },
  ]
})

const parkBuildingAccordion = computed(() => ({
  key: "customer-buildings",
  title: "园区 / 建筑列表概览",
  count: parkBuildingGroups.value.length,
  emptyText: "暂无园区和建筑数据。",
  items: parkBuildingGroups.value,
}))

const maintenanceModule = computed<DetailRelationModuleSchema<MaintenanceRecordRow>>(() => {
  const current = customer.value

  if (!current) {
    return {
      key: "maintenance-records",
      title: "检修维护记录概览",
      rowKey: "id",
      columns: [
        { key: "location", label: "位置" },
        { key: "item", label: "检修项" },
        { key: "principal", label: "负责人" },
        { key: "updatedAt", label: "更新时间" },
        { key: "actions", label: "", slot: "maintenance-action-cell", cellClass: "flex justify-end" },
      ],
      groups: [],
      mobileMinWidth: "44rem",
      columnTemplateMobile: "minmax(10rem,1.15fr) minmax(9rem,1fr) minmax(7rem,0.8fr) minmax(8rem,0.85fr) 2.5rem",
      columnTemplateDesktop: "minmax(10rem,1.15fr) minmax(9rem,1fr) minmax(7rem,0.8fr) minmax(8rem,0.85fr) 2.5rem",
      columnGapMobile: "0.75rem",
      columnGapDesktop: "1rem",
    }
  }

  return {
    key: "maintenance-records",
    title: "检修维护记录概览",
    rowKey: "id",
    columns: [
      { key: "location", label: "位置", slot: "maintenance-status-cell" },
      { key: "item", label: "检修项" },
      { key: "principal", label: "负责人" },
      { key: "updatedAt", label: "更新时间" },
      { key: "actions", label: "", slot: "maintenance-action-cell", cellClass: "flex justify-end" },
    ],
    groups: buildMaintenanceGroups(current),
    mobileMinWidth: "44rem",
    columnTemplateMobile: "minmax(10rem,1.15fr) minmax(9rem,1fr) minmax(7rem,0.8fr) minmax(8rem,0.85fr) 2.5rem",
    columnTemplateDesktop: "minmax(10rem,1.15fr) minmax(9rem,1fr) minmax(7rem,0.8fr) minmax(8rem,0.85fr) 2.5rem",
    columnGapMobile: "0.75rem",
    columnGapDesktop: "1rem",
  }
})

const parkDetailSheetSections = computed<DetailFieldSection[]>(() => {
  const current = activeParkDetail.value

  if (!current) {
    return []
  }

  return [
    {
      key: "park-sheet-fields",
      title: "园区信息",
      rows: [
        { key: "name", label: "园区名称", value: toDisplayText(current.Name, "未命名园区") },
        { key: "built-time", label: "建成时间", value: toDisplayText(current.BuiltTime, "-") },
        { key: "operation-time", label: "投运时间", value: toDisplayText(current.OperationTime, "-") },
        { key: "building-area", label: "建筑面积", value: toDisplayText(current.BuildArea, "-") },
        { key: "contact", label: "联系人", value: buildContactValue(toDisplayText(current.Contact, "未填写"), toDisplayText(current.ContactPhone, "-")) },
        { key: "address", label: "地址", value: toDisplayText(current.Address, "-"), truncate: false, valueClass: "leading-6" },
      ],
    },
  ]
})

watch(customer, (current) => {
  detailBreadcrumbTitle.value = current?.CorpName?.trim() || null
})

watch(customerUuid, (uuid) => {
  activeTab.value = "basic-info"
  void loadCustomerDetail(uuid)
  void loadParkBuildings(uuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

function goBack() {
  router.push({ name: "customers" })
}

function goToCustomerEdit() {
  if (!customerUuid.value) {
    return
  }

  router.push({
    name: "customer-edit",
    params: { id: customerUuid.value },
  })
}

function goToCreatePark() {
  if (!customerUuid.value) {
    return
  }

  router.push({
    name: "customer-park-create",
    params: { id: customerUuid.value },
    query: { customerName: toDisplayText(customer.value?.CorpName, "当前客户") },
  })
}

function handleContractDownload() {
  toast.info("合同下载接口暂未接入")
}

async function handleDeleteCustomer() {
  if (!customerUuid.value || deleteSubmitting.value) {
    return
  }

  deleteSubmitting.value = true

  try {
    await deleteCustomer({ Uuid: customerUuid.value })
    toast.success("客户已删除")
    await router.push({ name: "customers" })
  } catch (error) {
    handleApiError(error, {
      title: "客户删除失败",
      fallback: "客户删除失败，请稍后重试。",
    })
  } finally {
    deleteSubmitting.value = false
  }
}

async function goToParkDetail(parkUuid: string) {
  if (!parkUuid) {
    return
  }

  const requestId = ++latestParkDetailRequestId
  parkDetailSheetOpen.value = true
  parkDetailLoading.value = true
  parkDetailErrorMessage.value = ""
  activeParkDetail.value = null

  try {
    const detail = await fetchParkDetail({ Uuid: parkUuid })

    if (requestId !== latestParkDetailRequestId) {
      return
    }

    activeParkDetail.value = detail
  } catch (error) {
    if (requestId !== latestParkDetailRequestId) {
      return
    }

    parkDetailErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "园区详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestParkDetailRequestId) {
      parkDetailLoading.value = false
    }
  }
}

function goToParkEdit(parkUuid: string, currentCustomerUuid: string) {
  if (!parkUuid) {
    return
  }

  router.push({
    name: "park-edit",
    params: { id: parkUuid },
    query: currentCustomerUuid
      ? {
          customerUuid: currentCustomerUuid,
          customerName: toDisplayText(customer.value?.CorpName, "当前客户"),
        }
      : undefined,
  })
}

function handleParkDetailSheetOpenChange(open: boolean) {
  parkDetailSheetOpen.value = open

  if (!open) {
    parkDetailLoading.value = false
    parkDetailErrorMessage.value = ""
    activeParkDetail.value = null
  }
}

function getGroupParkUuid(group: unknown) {
  if (group && typeof group === "object" && "parkUuid" in group) {
    const value = (group as { parkUuid?: unknown }).parkUuid
    return typeof value === "string" ? value : ""
  }

  return ""
}

function getGroupCustomerUuid(group: unknown) {
  if (group && typeof group === "object" && "customerUuid" in group) {
    const value = (group as { customerUuid?: unknown }).customerUuid
    return typeof value === "string" ? value : ""
  }

  return ""
}

function getItemDetails(item: unknown): DetailFieldSection[] {
  if (item && typeof item === "object" && "details" in item) {
    const value = (item as { details?: unknown }).details
    return Array.isArray(value) ? value as DetailFieldSection[] : []
  }

  return []
}

function getItemBuildingModule(item: unknown): DetailRelationModuleSchema<BuildingRow> | null {
  if (item && typeof item === "object" && "buildingModule" in item) {
    const value = (item as { buildingModule?: unknown }).buildingModule
    return value && typeof value === "object" ? value as DetailRelationModuleSchema<BuildingRow> : null
  }

  return null
}

function getRowUuid(row: unknown) {
  if (row && typeof row === "object" && "uuid" in row) {
    const value = (row as { uuid?: unknown }).uuid
    return typeof value === "string" ? value : ""
  }

  return ""
}

function getRowParkUuid(row: unknown) {
  if (row && typeof row === "object" && "parkUuid" in row) {
    const value = (row as { parkUuid?: unknown }).parkUuid
    return typeof value === "string" ? value : ""
  }

  return ""
}

function goToBuildingDetail(buildingUuid: string, parkUuid: string) {
  if (!buildingUuid || !parkUuid || !customerUuid.value) {
    return
  }

  router.push({
    name: "building-detail",
    params: { id: buildingUuid },
    query: { parkUuid, customerUuid: customerUuid.value },
  })
}

async function loadCustomerDetail(uuid: string) {
  const requestId = ++latestRequestId

  if (!uuid) {
    customer.value = null
    errorMessage.value = "客户 Uuid 缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchCustomerDetail({ Uuid: uuid })

    if (requestId !== latestRequestId) {
      return
    }

    customer.value = result
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    customer.value = null
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function loadParkBuildings(uuid: string) {
  const requestId = ++latestRelationsRequestId

  if (!uuid) {
    parkBuildingGroups.value = []
    relationErrorMessage.value = "客户 Uuid 缺失，无法加载园区和建筑列表。"
    return
  }

  relationsLoading.value = true
  relationErrorMessage.value = ""

  try {
    const parksResult = await fetchParks({ CustomerUuid: uuid })

    if (requestId !== latestRelationsRequestId) {
      return
    }

    const groups = await Promise.all(
      parksResult.list.map(async (park, parkIndex) => {
        const parkUuid = toDisplayText(park.Uuid, "")
        const buildingsResult = parkUuid
          ? await fetchBuildings({ ParkUuid: parkUuid })
          : { list: [], total: 0 }

        return {
          key: parkUuid || `park-${parkIndex + 1}`,
          title: toDisplayText(park.Name, "未命名园区"),
          meta: "",
          details: buildParkFieldSections(park),
          buildingModule: buildParkBuildingModule(park, buildingsResult.list),
          parkUuid,
          customerUuid: uuid,
        }
      }),
    )

    if (requestId !== latestRelationsRequestId) {
      return
    }

    parkBuildingGroups.value = groups
  } catch (error) {
    if (requestId !== latestRelationsRequestId) {
      return
    }

    parkBuildingGroups.value = []
    relationErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "园区和建筑列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRelationsRequestId) {
      relationsLoading.value = false
    }
  }
}

function resolveContactRole(isMain: unknown, index: number) {
  if (Number(isMain) === 1) {
    return "主要责任人"
  }

  return index === 0 ? "责任人" : "协同联系人"
}

function buildContactFieldRows(people: CustomerDetailResult["People"]) {
  if (!Array.isArray(people) || !people.length) {
    return [
      { key: "contact-empty", label: "联系人", value: "未填写" },
    ]
  }

  return people.map((person, index) => createContactFieldRow(person, index))
}

function createContactFieldRow(person: CustomerDetailPerson, index: number) {
  const name = toDisplayText(person.Name)
  const phone = toDisplayText(person.Phone, "-")

  return {
    key: `contact-${index + 1}`,
    label: resolveContactRole(person.IsMain, index),
    value: buildContactValue(name, phone),
  }
}

function buildContactValue(name: string, phone?: string): DetailContactValue {
  return {
    kind: "contact",
    name,
    phone,
  }
}

function buildPackageFieldRows(detail: CustomerDetailResult) {
  const packageRecord = getCustomerPackageMockRecord(detail)

  return [
    { key: "balance", label: "资金余额", value: formatFunds(packageRecord?.remainingFunds ?? null) },
    { key: "current-package", label: "当前购买套餐信息", value: formatPackageInfo(packageRecord?.packageName ?? "-", packageRecord?.packageCode ?? "") },
    { key: "expire-at", label: "到期时间", value: formatExpireDate(packageRecord?.remainingDays ?? null) },
    { key: "contract-download", label: "合同下载", value: null, action: { label: "下载合同", onClick: handleContractDownload } },
    { key: "remaining-service", label: "剩余服务", value: formatRemainingService(packageRecord), truncate: false, valueClass: "leading-6" },
  ]
}

function getCustomerPackageMockRecord(detail: CustomerDetailResult): CustomerPackageMockRecord | null {
  const customerName = typeof detail.CorpName === "string" ? detail.CorpName.trim() : ""

  if (!customerName) {
    return null
  }

  const record = (customersData as CustomerPackageMockRecord[]).find(item => item.name.trim() === customerName)
  return record ?? null
}

function formatPackageInfo(packageName: string, packageCode: string) {
  if (!packageName || packageName === "-") {
    return "—"
  }

  return packageCode ? `${packageName} (${packageCode})` : packageName
}

function formatFunds(value: number | null) {
  if (value === null) {
    return "—"
  }

  return `${value} 万`
}

function formatExpireDate(remainingDays: number | null) {
  if (remainingDays === null) {
    return "—"
  }

  if (remainingDays < 0) {
    return "已过期"
  }

  const expireDate = new Date()
  expireDate.setHours(0, 0, 0, 0)
  expireDate.setDate(expireDate.getDate() + remainingDays)

  const year = expireDate.getFullYear()
  const month = String(expireDate.getMonth() + 1).padStart(2, "0")
  const day = String(expireDate.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatRemainingService(record: CustomerPackageMockRecord | null) {
  if (!record) {
    return "—"
  }

  return `${record.inspectionTimes} 次巡检，${record.inspectionCycle}`
}

function buildMaintenanceGroups(current: CustomerDetailResult) {
  const records: MaintenanceRecordRow[] = [
    {
      id: "pending-1",
      status: "pending",
      location: `${toDisplayText(current.CorpName, "客户")} / 1 号楼`,
      item: "消防泵房月检",
      principal: "王工",
      updatedAt: "2026-03-20 14:30",
    },
    {
      id: "processing-1",
      status: "processing",
      location: `${toDisplayText(current.CorpName, "客户")} / 2 号楼`,
      item: "配电室温感排查",
      principal: "刘洋",
      updatedAt: "2026-03-21 09:45",
    },
    {
      id: "completed-1",
      status: "completed",
      location: `${toDisplayText(current.CorpName, "客户")} / 5 号楼`,
      item: "电梯机房巡检",
      principal: "陈峰",
      updatedAt: "2026-03-22 16:10",
    },
    {
      id: "completed-2",
      status: "completed",
      location: `${toDisplayText(current.CorpName, "客户")} / 地下车库`,
      item: "排烟系统复检",
      principal: "赵敏",
      updatedAt: "2026-03-23 11:20",
    },
  ]

  return [
    {
      key: "pending",
      title: "待处理",
      rows: records.filter(record => record.status === "pending"),
    },
    {
      key: "processing",
      title: "处理中",
      rows: records.filter(record => record.status === "processing"),
    },
    {
      key: "completed",
      title: "已完成",
      rows: records.filter(record => record.status === "completed"),
    },
  ].filter(group => group.rows.length)
}

function normalizeBuildingRow(building: BuildingListItem, park: ParkListItem, index: number): BuildingRow {
  const parkUuid = toDisplayText(park.Uuid, "park")

  return {
    key: toDisplayText(building.Uuid, `${parkUuid}-${index + 1}`),
    uuid: toDisplayText(building.Uuid, `${parkUuid}-${index + 1}`),
    parkUuid,
    name: toDisplayText(building.Name, "未命名建筑"),
    address: toDisplayText(building.Address, "-"),
    // 接口暂未返回检测状态，先用默认值占位，后续可直接替换成真实字段映射。
    status: "一切正常",
  }
}

function buildBuildingStatusGroups(buildings: BuildingListItem[], park: ParkListItem) {
  const rows = buildings.map((building, index) => normalizeBuildingRow(building, park, index))

  return [
    {
      key: "normal",
      title: "一切正常",
      rows: rows.filter(row => row.status === "一切正常"),
    },
    {
      key: "attention",
      title: "需重点关注",
      rows: rows.filter(row => row.status === "需重点关注"),
    },
    {
      key: "risk",
      title: "存在风险",
      rows: rows.filter(row => row.status === "存在风险"),
    },
  ].filter(group => group.rows.length)
}

function buildParkFieldSections(park: ParkListItem): DetailFieldSection[] {
  return [
    {
      key: "park-fields",
      title: "",
      rows: [
        { key: "built-time", label: "建成时间", value: toDisplayText(park.BuiltTime, "-") },
        { key: "operation-time", label: "投入运营时间", value: toDisplayText(park.OperationTime, "-") },
        { key: "address", label: "地址", value: toDisplayText(park.Address, "-"), truncate: false, valueClass: "leading-6" },
      ],
    },
  ]
}

function buildParkBuildingModule(park: ParkListItem, buildings: BuildingListItem[]): DetailRelationModuleSchema<BuildingRow> {
  const groups = buildBuildingStatusGroups(buildings, park)

  return {
    key: `park-buildings-${toDisplayText(park.Uuid, "park")}`,
    title: "建筑列表",
    count: groups.reduce((sum, group) => sum + group.rows.length, 0),
    rowKey: "key",
    columns: [
      { key: "name", label: "名称", slot: "building-status-cell" },
      { key: "address", label: "地址", cellClass: "truncate text-muted-foreground" },
      { key: "actions", label: "", slot: "building-action-cell", cellClass: "flex justify-end" },
    ],
    groups,
    mobileMinWidth: "40rem",
    columnTemplateMobile: "minmax(10rem,1.1fr) minmax(14rem,1.8fr) 6rem",
    columnTemplateDesktop: "minmax(10rem,1.1fr) minmax(14rem,1.8fr) 6rem",
    columnGapMobile: "0.75rem",
    columnGapDesktop: "1rem",
  }
}

function toDisplayText(value: unknown, fallback = "未填写") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}
</script>

<template>
  <DetailLayout
    :title="pageTitle"
    :subtitle="pageSubtitle"
    :empty="isEmpty"
    empty-text="未找到该客户信息"
    :secondary-visible="activeTab === 'basic-info'"
    :tabs="detailHeaderTabs"
    tabs-aria-label="客户详情页面切换"
    @back="goBack"
    @tab-click="activeTab = $event as CustomerDetailTab"
  >
    <template #actions>
      <AlertDialog>
        <AlertDialogTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="border-destructive/30 bg-background font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
          >
            删除用户
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除当前用户？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，该操作会移除当前客户资料。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel :disabled="deleteSubmitting">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              :disabled="deleteSubmitting"
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              @click="handleDeleteCustomer"
            >
              {{ deleteSubmitting ? "删除中..." : "确认删除" }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button
        variant="outline"
        size="sm"
        class="border-border/80 bg-background font-medium text-foreground shadow-none"
        @click="goToCreatePark"
      >
        添加园区
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="border-border/80 bg-background font-medium text-foreground shadow-none"
        @click="goToCustomerEdit"
      >
        修改客户信息
      </Button>
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
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>客户详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div v-if="loading" class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground">
        正在获取客户详情数据。
      </div>

      <template v-else-if="customer">
        <div class="space-y-5 pb-5">
          <DetailFieldSections v-if="activeTab === 'basic-info'" :sections="fieldSections" />

          <template v-else-if="activeTab === 'building-assets'">
            <Alert v-if="relationErrorMessage" variant="destructive">
              <AlertTitle>园区/建筑接口加载失败</AlertTitle>
              <AlertDescription>{{ relationErrorMessage }}</AlertDescription>
            </Alert>

            <div
              v-if="relationsLoading"
              class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground"
            >
              正在获取园区和建筑列表数据。
            </div>

            <template v-else-if="parkBuildingGroups.length">
              <DetailAccordionModule :schema="parkBuildingAccordion">
                <template #item-actions="{ item }">
                  <div class="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-8 rounded-md"
                      @click="goToParkEdit(getGroupParkUuid(item), getGroupCustomerUuid(item))"
                    >
                      编辑园区
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-8 rounded-md"
                      @click="goToParkDetail(getGroupParkUuid(item))"
                    >
                      查看详情
                    </Button>
                  </div>
                </template>

                <template #expanded-content="{ item }">
                  <DetailFieldSections :sections="getItemDetails(item)" compact />

                  <div v-if="getItemBuildingModule(item)">
                    <DetailRelationModule :schema="getItemBuildingModule(item)!">
                      <template #building-status-cell="{ row }">
                        <div class="flex min-w-0 items-center gap-2 text-foreground">
                          <i
                            :class="[
                              'text-[18px]',
                              row.status === '存在风险'
                                ? 'ri-close-circle-fill text-[#EF4444]'
                                : row.status === '需重点关注'
                                  ? 'ri-time-fill text-[#F97316]'
                                  : 'ri-checkbox-circle-fill text-[#22C55E]',
                            ]"
                          />
                          <span class="truncate">{{ row.name }}</span>
                        </div>
                      </template>

                      <template #building-action-cell="{ row }">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                          @click="goToBuildingDetail(getRowUuid(row), getRowParkUuid(row))"
                        >
                          <i class="ri-more-line text-[18px]" />
                        </Button>
                      </template>
                    </DetailRelationModule>
                  </div>
                </template>
              </DetailAccordionModule>
            </template>

            <div
              v-else
              class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground"
            >
              暂无园区和建筑数据。
            </div>
          </template>

          <DetailRelationModule v-else-if="activeTab === 'work-orders'" :schema="maintenanceModule">
            <template #maintenance-status-cell="{ row }">
              <div class="flex min-w-0 items-center gap-2 text-foreground">
                <i
                  :class="[
                    'text-[18px]',
                    row.status === 'pending'
                      ? 'ri-time-fill text-[#F59E0B]'
                      : row.status === 'processing'
                        ? 'ri-loader-4-line text-[#2563EB]'
                        : 'ri-checkbox-circle-fill text-[#22C55E]',
                  ]"
                />
                <span class="truncate">{{ row.location }}</span>
              </div>
            </template>

            <template #maintenance-action-cell>
              <Button variant="ghost" size="icon-sm" class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                <i class="ri-more-line text-[18px]" />
              </Button>
            </template>
          </DetailRelationModule>

          <section v-else-if="activeTab === 'monitoring'" class="space-y-3">
            <div class="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
              <div class="text-sm font-medium text-foreground">
                监控模块待接入
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                当前已预留客户监控页签，后续可接设备在线状态、告警汇总、监控画面和巡检联动信息。
              </div>
            </div>
            <p class="text-sm leading-6 text-muted-foreground">
              建议后续把实时监控和告警数据聚合在此处，避免继续堆叠到客户基本资料页。
            </p>
          </section>

          <section v-else-if="activeTab === 'sub-accounts'" class="space-y-3">
            <div class="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
              <div class="text-sm font-medium text-foreground">
                子账号模块待接入
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                当前已预留客户子账号页签，后续可接成员列表、角色权限、启停状态和登录信息。
              </div>
            </div>
            <p class="text-sm leading-6 text-muted-foreground">
              仓库已有成员接口封装，但当前客户详情页缺少明确的客户维度绑定参数，先保留独立页签结构，避免误接错误数据。
            </p>
          </section>
        </div>
      </template>
    </template>

    <template #secondary>
      <template v-if="!loading && customer && activeTab === 'basic-info'">
        <div class="pb-5">
          <Alert v-if="relationErrorMessage" variant="destructive" class="mb-5">
            <AlertTitle>园区/建筑接口加载失败</AlertTitle>
            <AlertDescription>{{ relationErrorMessage }}</AlertDescription>
          </Alert>

          <div
            v-if="relationsLoading"
            class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground"
          >
            正在获取园区和建筑列表数据。
          </div>

          <template v-else-if="parkBuildingGroups.length">
            <DetailAccordionModule :schema="parkBuildingAccordion">
              <template #item-actions="{ item }">
                <div class="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-8 rounded-md"
                    @click="goToParkEdit(getGroupParkUuid(item), getGroupCustomerUuid(item))"
                  >
                    编辑园区
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-8 rounded-md"
                    @click="goToParkDetail(getGroupParkUuid(item))"
                  >
                    查看详情
                  </Button>
                </div>
              </template>

              <template #expanded-content="{ item }">
                <DetailFieldSections :sections="getItemDetails(item)" compact />

                <div v-if="getItemBuildingModule(item)">
                  <DetailRelationModule :schema="getItemBuildingModule(item)!">
                    <template #building-status-cell="{ row }">
                      <div class="flex min-w-0 items-center gap-2 text-foreground">
                        <i
                          :class="[
                            'text-[18px]',
                            row.status === '存在风险'
                              ? 'ri-close-circle-fill text-[#EF4444]'
                              : row.status === '需重点关注'
                                ? 'ri-time-fill text-[#F97316]'
                                : 'ri-checkbox-circle-fill text-[#22C55E]',
                          ]"
                        />
                        <span class="truncate">{{ row.name }}</span>
                      </div>
                    </template>

                    <template #building-action-cell="{ row }">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                        @click="goToBuildingDetail(getRowUuid(row), getRowParkUuid(row))"
                      >
                        <i class="ri-more-line text-[18px]" />
                      </Button>
                    </template>
                  </DetailRelationModule>
                </div>
              </template>
            </DetailAccordionModule>
          </template>

          <div
            v-else
            class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground"
          >
            暂无园区和建筑数据。
          </div>

          <div class="my-5 h-px bg-border/80" />

          <DetailRelationModule :schema="maintenanceModule">
            <template #maintenance-status-cell="{ row }">
              <div class="flex min-w-0 items-center gap-2 text-foreground">
                <i
                  :class="[
                    'text-[18px]',
                    row.status === 'pending'
                      ? 'ri-time-fill text-[#F59E0B]'
                      : row.status === 'processing'
                        ? 'ri-loader-4-line text-[#2563EB]'
                        : 'ri-checkbox-circle-fill text-[#22C55E]',
                  ]"
                />
                <span class="truncate">{{ row.location }}</span>
              </div>
            </template>

            <template #maintenance-action-cell>
              <Button variant="ghost" size="icon-sm" class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                <i class="ri-more-line text-[18px]" />
              </Button>
            </template>
          </DetailRelationModule>
        </div>
      </template>
    </template>
  </DetailLayout>

  <Sheet :open="parkDetailSheetOpen" @update:open="handleParkDetailSheetOpenChange">
    <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{{ toDisplayText(activeParkDetail?.Name, "园区详情") }}</SheetTitle>
        <SheetDescription>查看园区基础信息。</SheetDescription>
      </SheetHeader>

      <div class="mt-6">
        <Alert v-if="parkDetailErrorMessage" variant="destructive" class="mb-4">
          <AlertTitle>园区详情接口加载失败</AlertTitle>
          <AlertDescription>{{ parkDetailErrorMessage }}</AlertDescription>
        </Alert>

        <div
          v-if="parkDetailLoading"
          class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground"
        >
          正在获取园区详情数据。
        </div>

        <DetailFieldSections v-else-if="activeParkDetail" :sections="parkDetailSheetSections" />
      </div>
    </SheetContent>
  </Sheet>
</template>
