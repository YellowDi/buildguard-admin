<script setup lang="ts">
import { computed, defineAsyncComponent, onUnmounted, ref, watch, type Ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import BuildingDetailSheet from "@/components/detail/BuildingDetailSheet.vue"
import MapLocationDialog from "@/components/map/MapLocationDialog.vue"
import DetailAccordionModule from "@/components/detail/DetailAccordionModule.vue"
import DetailTabActionsGroup from "@/components/detail/DetailTabActionsGroup.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import {
  buildRepairWorkOrderPrimarySections,
  buildRepairWorkOrderSecondarySections,
  toText as toRepairWorkOrderText,
} from "@/components/detail/repairWorkOrderDetailFields"
import { buildWorkOrderPrimarySections, buildWorkOrderSecondarySections, toText as toWorkOrderText } from "@/components/detail/workOrderDetailFields"
import type { DetailContactValue, DetailFieldSection, DetailRelationModuleSchema, DetailStatusValue } from "@/components/detail/types"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import CustomerDetailContentLoading from "@/components/loading/CustomerDetailContentLoading.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import ExportTableDialog from "@/components/table-page/ExportTableDialog.vue"
import { customerStatusMap, workOrderStatusMap } from "@/components/table-page/statusPresets"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import TablePage from "@/components/table-page/TablePage.vue"
import SortPopover from "@/components/table-page/TableSortPopover.vue"
import type { SortRule } from "@/components/table-page/sort.types"
import { createTablePageDefinition, useTablePage, type TablePageController } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import {
  exportTableData,
  SUPPORTED_TABLE_EXPORT_FORMATS,
  type TableExportFormat,
  type TableExportScope,
} from "@/components/table-page/export-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipWrap } from "@/components/ui/tooltip"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import { useDetailRouteTab } from "@/composables/useDetailRouteTab"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchMembers } from "@/lib/members-api"
import { hasValidLatLng } from "@/lib/map-coordinates"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import {
  appendCustomerSubAccountLocalRecord,
  createCustomerSubAccount,
  fetchCustomerSubAccounts,
  readCustomerSubAccountLocalRecords,
  type CustomerSubAccountListItem,
  type CustomerSubAccountLocalRecord,
} from "@/lib/customer-sub-accounts-api"
import { deleteCustomer, fetchCustomerDetail, type CustomerDetailPerson, type CustomerDetailResult } from "@/lib/customers-api"
import {
  dispatchWorkOrder,
  fetchRepairWorkOrderDetail,
  fetchWorkOrderDetail,
  fetchRepairWorkOrders,
  fetchWorkOrders,
  type RepairWorkOrderDetailResult,
  type RepairWorkOrderListItem,
  type WorkOrderDetailResult,
  type WorkOrderListItem,
} from "@/lib/work-orders-api"
import customersData from "@/mocks/customers.json"
import { deletePark, fetchParkDetail, fetchParks, type ParkDetailResult, type ParkListItem } from "@/lib/parks-api"

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
  uuid: string
  workOrderKind: "inspection" | "repair"
  customerUuid: string
  status: "pending" | "processing" | "completed"
  serviceName: string
  serviceTooltip: string
  result: string
  location: string
  parkName: string
  item: string
  executor: string
  executors: string[]
  deadline: string
  deadlineFull?: string
}

type CustomerBuildingAssetRow = {
  id: string
  uuid: string
  parkUuid: string
  customerUuid: string
  parkName: string
  buildingName: string
  address: string
  builtTime: string
  operationTime: string
  buildingArea: string
  contactName: string
  contactPhone: string
  statusValue: number
  statusLabel: string
  updatedAt: string
}

type CustomerWorkOrderRow = {
  id: string
  uuid: string
  workOrderKind: "inspection" | "repair"
  workOrderTypeLabel: string
  customerUuid: string
  planUuid: string
  orderNo: string
  workOrderName: string
  customerName: string
  parkName: string
  buildingName: string
  packageName: string
  planName: string
  executor: string
  executors: string[]
  status: string
  statusValue: number | null
  statusLabel: string
  importantValue: number | null
  importantLabel: string
  reportTypeValue: number | null
  reportTypeLabel: string
  resultValue: number | null
  resultLabel: string
  score: number | null
  scoreLabel: string
  deadline: string
  remark: string
  createdAt: string
  updatedAt: string
  createdStartAt: string
  createdEndAt: string
}

type MonitoringRow = {
  id: string
  deviceName: string
  platform: string
  deviceId: string
  customerName: string
  parkName: string
  buildingName: string
}

type SubAccountRow = {
  id: string
  uuid: string
  name: string
  username: string
  isMain: number | null
  isMainLabel: string
  status: number | null
  statusLabel: string
}

type CustomerSubAccountCreateFormState = {
  name: string
  account: string
  password: string
  phone: string
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
type CustomerDetailTabActions = {
  deleteCustomer: boolean
  addPark: boolean
  addBuilding: boolean
  addWorkOrder: boolean
  addRepairWorkOrder: boolean
  addMonitoring: boolean
  addSubAccount: boolean
  editCustomer: boolean
  back: boolean
}

const route = useRoute()
const router = useRouter()
const customerDetailTabIds = ["basic-info", "building-assets", "work-orders", "monitoring", "sub-accounts"] as const
const DETAIL_TABLE_PAGE_SIZE = 10

const customer = ref<CustomerDetailResult | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const deleteSubmitting = ref(false)
const deleteConfirmOpen = ref(false)
const relationsLoading = ref(false)
const relationErrorMessage = ref("")
const parkBuildingGroups = ref<ParkBuildingGroup[]>([])
const buildingAssets = ref<CustomerBuildingAssetRow[]>([])
const buildingListRaw = ref<BuildingListItem[]>([])
const buildingAssetsLoading = ref(false)
const buildingAssetsErrorMessage = ref("")
const buildingAssetsPageNum = ref(1)
const buildingAssetsPageSize = ref(DETAIL_TABLE_PAGE_SIZE)
const maintenanceRecords = ref<MaintenanceRecordRow[]>([])
const maintenanceRecordsLoading = ref(false)
const maintenanceRecordsErrorMessage = ref("")
const repairOverviewRecords = ref<MaintenanceRecordRow[]>([])
const repairOverviewRecordsLoading = ref(false)
const repairOverviewRecordsErrorMessage = ref("")
const activeWorkOrderTableTab = ref<"inspection" | "repair">("inspection")
const inspectionWorkOrders = ref<CustomerWorkOrderRow[]>([])
const inspectionWorkOrdersLoading = ref(false)
const inspectionWorkOrdersErrorMessage = ref("")
const inspectionWorkOrdersPageNum = ref(1)
const inspectionWorkOrdersPageSize = ref(10)
const inspectionWorkOrdersTotal = ref(0)
const repairWorkOrders = ref<CustomerWorkOrderRow[]>([])
const repairWorkOrdersLoading = ref(false)
const repairWorkOrdersErrorMessage = ref("")
const repairWorkOrdersPageNum = ref(1)
const repairWorkOrdersPageSize = ref(10)
const repairWorkOrdersTotal = ref(0)
const subAccounts = ref<SubAccountRow[]>([])
const subAccountsLoading = ref(false)
const subAccountsErrorMessage = ref("")
const monitoringPageNum = ref(1)
const monitoringPageSize = ref(DETAIL_TABLE_PAGE_SIZE)
const subAccountsPageNum = ref(1)
const subAccountsPageSize = ref(DETAIL_TABLE_PAGE_SIZE)
const parkDetailSheetOpen = ref(false)
const parkDetailLoading = ref(false)
const parkDetailErrorMessage = ref("")
const parkDeleteConfirmOpen = ref(false)
const parkDeleteSubmitting = ref(false)
const parkMapDialogOpen = ref(false)
const activeParkDetail = ref<ParkDetailResult | null>(null)
const workOrderDetailSheetOpen = ref(false)
const workOrderDetailLoading = ref(false)
const workOrderDetailErrorMessage = ref("")
const activeWorkOrderDetailKind = ref<"inspection" | "repair">("inspection")
const activeInspectionWorkOrderDetail = ref<WorkOrderDetailResult | null>(null)
const activeRepairWorkOrderDetail = ref<RepairWorkOrderDetailResult | null>(null)
const activeWorkOrderDetailCustomer = ref<CustomerDetailResult | null>(null)
type AssignableUserOption = {
  uuid: string
  name: string
}
const assignDialogOpen = ref(false)
const assignUserUuid = ref("")
const assignUserUuids = ref<string[]>([])
const assignTargetWorkOrder = ref<CustomerWorkOrderRow | null>(null)
const assignableUsers = ref<AssignableUserOption[]>([])
const assignableUsersLoading = ref(false)
const assignableUsersLoaded = ref(false)
const assignSubmitting = ref(false)
const subAccountCreateDialogOpen = ref(false)
const subAccountCreateSubmitting = ref(false)
const subAccountCreateForm = ref<CustomerSubAccountCreateFormState>(createEmptySubAccountCreateForm())
const buildingDetailSheetOpen = ref(false)
const activeBuildingUuid = ref("")
const activeBuildingParkUuid = ref("")
let latestRequestId = 0
let latestRelationsRequestId = 0
let latestBuildingAssetsRequestId = 0
let latestInspectionWorkOrdersRequestId = 0
let latestRepairWorkOrdersRequestId = 0
let latestSubAccountsRequestId = 0
let latestMaintenanceRecordsRequestId = 0
let latestRepairOverviewRecordsRequestId = 0
let latestParkDetailRequestId = 0
let latestWorkOrderDetailRequestId = 0

const customerUuid = computed(() => {
  const value = route.params.id
  return typeof value === "string" ? value.trim() : ""
})
const { activeTab, setActiveTab } = useDetailRouteTab<CustomerDetailTab>({
  route,
  router,
  tabs: customerDetailTabIds,
  defaultTab: "basic-info",
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
const isInspectionAssignDialog = computed(() => assignTargetWorkOrder.value?.workOrderKind === "inspection")
const canSubmitAssign = computed(() => {
  if (assignSubmitting.value) {
    return false
  }

  if (!isInspectionAssignDialog.value) {
    return Boolean(assignUserUuid.value)
  }

  return assignUserUuids.value.length > 0
})
const canSubmitSubAccountCreate = computed(() => (
  Boolean(
    customerUuid.value
    && normalizeDialogText(subAccountCreateForm.value.name)
    && normalizeDialogText(subAccountCreateForm.value.account)
    && normalizeDialogText(subAccountCreateForm.value.password)
    && normalizeDialogText(subAccountCreateForm.value.phone)
    && !subAccountCreateSubmitting.value,
  )
))
const detailTabActionsByTab: Record<CustomerDetailTab, CustomerDetailTabActions> = {
  "basic-info": {
    deleteCustomer: true,
    addPark: false,
    addBuilding: false,
    addWorkOrder: false,
    addRepairWorkOrder: false,
    addMonitoring: false,
    addSubAccount: false,
    editCustomer: true,
    back: false,
  },
  "building-assets": {
    deleteCustomer: false,
    addPark: true,
    addBuilding: true,
    addWorkOrder: false,
    addRepairWorkOrder: false,
    addMonitoring: false,
    addSubAccount: false,
    editCustomer: false,
    back: false,
  },
  "work-orders": {
    deleteCustomer: false,
    addPark: false,
    addBuilding: false,
    addWorkOrder: true,
    addRepairWorkOrder: true,
    addMonitoring: false,
    addSubAccount: false,
    editCustomer: false,
    back: false,
  },
  monitoring: {
    deleteCustomer: false,
    addPark: false,
    addBuilding: false,
    addWorkOrder: false,
    addRepairWorkOrder: false,
    addMonitoring: true,
    addSubAccount: false,
    editCustomer: false,
    back: false,
  },
  "sub-accounts": {
    deleteCustomer: false,
    addPark: false,
    addBuilding: false,
    addWorkOrder: false,
    addRepairWorkOrder: false,
    addMonitoring: false,
    addSubAccount: true,
    editCustomer: false,
    back: false,
  },
}
const activeDetailTabActions = computed<CustomerDetailTabActions>(() => {
  const actions = detailTabActionsByTab[activeTab.value]

  if (activeTab.value !== "work-orders") {
    return actions
  }

  return {
    ...actions,
    addWorkOrder: activeWorkOrderTableTab.value === "inspection",
    addRepairWorkOrder: activeWorkOrderTableTab.value === "repair",
  }
})
const activeDetailMobileActionItems = computed(() => {
  const items: Array<{
    key: string
    label: string
    iconClass?: string
    destructive?: boolean
  }> = []

  if (activeTablePage.value) {
    items.push({
      key: "toggle-filters",
      label: activeTablePage.value?.showControls.value ? "隐藏筛选" : "显示筛选",
      iconClass: "ri-filter-3-line",
    })
    items.push({
      key: "toggle-sort",
      label: activeTablePage.value?.customSortEnabled.value ? "关闭排序" : "启用排序",
      iconClass: "ri-sort-asc",
    })
    items.push({
      key: "export",
      label: "导出",
      iconClass: "ri-download-line",
    })
  }

  if (activeDetailTabActions.value.deleteCustomer) {
    items.push({
      key: "delete-customer",
      label: "删除用户",
      iconClass: "ri-delete-bin-line",
      destructive: true,
    })
  }

  if (activeDetailTabActions.value.addPark) {
    items.push({ key: "add-park", label: "添加园区", iconClass: "ri-add-line" })
  }

  if (activeDetailTabActions.value.addBuilding) {
    items.push({ key: "add-building", label: "添加建筑", iconClass: "ri-building-line" })
  }

  if (activeDetailTabActions.value.addWorkOrder) {
    items.push({ key: "add-work-order", label: "添加检测工单", iconClass: "ri-file-add-line" })
  }

  if (activeDetailTabActions.value.addRepairWorkOrder) {
    items.push({ key: "add-repair-work-order", label: "添加报修工单", iconClass: "ri-hammer-line" })
  }

  if (activeDetailTabActions.value.addMonitoring) {
    items.push({ key: "add-monitoring", label: "添加监控", iconClass: "ri-radar-line" })
  }

  if (activeDetailTabActions.value.addSubAccount) {
    items.push({ key: "add-sub-account", label: "添加子账号", iconClass: "ri-user-add-line" })
  }

  if (activeDetailTabActions.value.editCustomer) {
    items.push({ key: "edit-customer", label: "修改客户信息", iconClass: "ri-edit-line" })
  }

  return items
})
const detailToolbarButtonClass =
  "inline-flex size-8 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-interactive-hover hover:text-foreground active:bg-surface-secondary"
const detailToolbarButtonActiveClass =
  "bg-transparent text-link hover:bg-interactive-hover active:bg-surface-secondary"
const activeTablePage = computed(() => (
  activeTab.value === "building-assets"
    ? pagedBuildingAssetsPage
    : activeTab.value === "work-orders"
      ? (activeWorkOrderTableTab.value === "inspection" ? inspectionWorkOrdersPage : repairWorkOrdersPage)
      : activeTab.value === "monitoring"
        ? pagedMonitoringPage
        : activeTab.value === "sub-accounts"
          ? pagedSubAccountsPage
          : null
))
const activeTableTitle = computed(() => (
  activeTab.value === "building-assets"
    ? "建筑资产"
    : activeTab.value === "work-orders"
      ? (activeWorkOrderTableTab.value === "inspection" ? "检测工单" : "报修工单")
      : activeTab.value === "monitoring"
        ? "监控"
        : "子账号"
))
const activeWorkOrderTableErrorMessage = computed(() => (
  activeWorkOrderTableTab.value === "inspection"
    ? inspectionWorkOrdersErrorMessage.value
    : repairWorkOrdersErrorMessage.value
))
const activeWorkOrderTableLoading = computed(() => (
  activeWorkOrderTableTab.value === "inspection"
    ? inspectionWorkOrdersLoading.value
    : repairWorkOrdersLoading.value
))
const activeWorkOrderTablePageNum = computed(() => (
  activeWorkOrderTableTab.value === "inspection"
    ? inspectionWorkOrdersPageNum.value
    : repairWorkOrdersPageNum.value
))
const activeWorkOrderTablePageSize = computed(() => (
  activeWorkOrderTableTab.value === "inspection"
    ? inspectionWorkOrdersPageSize.value
    : repairWorkOrdersPageSize.value
))
const activeWorkOrderTableTotal = computed(() => (
  activeWorkOrderTableTab.value === "inspection"
    ? inspectionWorkOrdersTotal.value
    : repairWorkOrdersTotal.value
))

const activeWorkOrderTablePageNumProxy = computed({
  get: () => activeWorkOrderTablePageNum.value,
  set: (nextPage: number) => {
    if (activeWorkOrderTableTab.value === "inspection") {
      inspectionWorkOrdersPageNum.value = nextPage
    }
    else {
      repairWorkOrdersPageNum.value = nextPage
    }
  },
})
const activeTableSortPopoverOpen = ref(false)
const activeTableExportDialogOpen = ref(false)
const activeTableExporting = ref(false)
const activeTableAvailableExportFormats = [...SUPPORTED_TABLE_EXPORT_FORMATS]

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
        { key: "customer-status", label: "客户状态", value: buildCustomerStatusValue(current.Status) },
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
      title: "检测服务信息",
      rows: buildPackageFieldRows(current),
    },
  ]
})

const parkBuildingAccordion = computed(() => ({
  key: "customer-buildings",
  title: "园区 / 建筑列表概览",
  count: parkBuildingGroups.value.length,
  emptyText: "暂无园区和建筑数据。",
  emptyState: {
    title: "暂无园区和建筑数据",
    description: "当前客户下暂无可展示的园区和建筑。",
    icon: "ri-building-2-line",
  },
  items: parkBuildingGroups.value,
}))

const maintenanceModule = computed<DetailRelationModuleSchema<MaintenanceRecordRow>>(() => {
  if (!customer.value) {
    return {
      key: "maintenance-records",
      title: "检测工单概览",
      emptyState: {
        title: "暂无检测工单数据",
        description: "当前客户下暂无可展示的检测工单。",
        icon: "ri-file-list-3-line",
      },
      rowKey: "id",
      columns: [
        { key: "serviceName", label: "检测服务", slot: "inspection-overview-service-cell" },
        {
          key: "result",
          label: "检测结果",
          headerClass: "text-center",
          cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center whitespace-nowrap text-muted-foreground",
        },
        {
          key: "executor",
          label: "执行人",
          headerClass: "text-center",
          cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center",
        },
        {
          key: "deadline",
          label: "截止时间",
          headerClass: "text-center",
          cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center whitespace-nowrap text-muted-foreground",
        },
        { key: "actions", label: "", slot: "maintenance-action-cell", headerClass: "flex justify-end", cellClass: "flex justify-end" },
      ],
      groups: [],
      rowAction: row => handleOverviewWorkOrderDetail(row),
      mobileMinWidth: "42rem",
      columnTemplateMobile: "minmax(9rem,1fr) 6.5rem minmax(12rem,1.5fr) 8rem 2.75rem",
      columnTemplateDesktop: "minmax(9rem,1fr) 6.5rem minmax(12rem,1.5fr) 8rem 2.75rem",
      columnGapMobile: "0.75rem",
      columnGapDesktop: "1rem",
    }
  }

  return {
    key: "maintenance-records",
    title: "检测工单概览",
    emptyState: {
      title: "暂无检测工单数据",
      description: "当前客户下暂无可展示的检测工单。",
      icon: "ri-file-list-3-line",
    },
    rowKey: "id",
    columns: [
      { key: "serviceName", label: "检测服务", slot: "inspection-overview-service-cell" },
      {
        key: "result",
        label: "检测结果",
        headerClass: "text-center",
        cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center whitespace-nowrap text-muted-foreground",
      },
      {
        key: "executor",
        label: "执行人",
        headerClass: "text-center",
        cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center",
      },
      {
        key: "deadline",
        label: "截止时间",
        headerClass: "text-center",
        cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center whitespace-nowrap text-muted-foreground",
      },
      { key: "actions", label: "", slot: "maintenance-action-cell", headerClass: "flex justify-end", cellClass: "flex justify-end" },
    ],
    groups: buildMaintenanceGroups(maintenanceRecords.value),
    rowAction: row => handleOverviewWorkOrderDetail(row),
    mobileMinWidth: "42rem",
    columnTemplateMobile: "minmax(9rem,1fr) 6.5rem minmax(12rem,1.5fr) 8rem 2.75rem",
    columnTemplateDesktop: "minmax(9rem,1fr) 6.5rem minmax(12rem,1.5fr) 8rem 2.75rem",
    columnGapMobile: "0.75rem",
    columnGapDesktop: "1rem",
  }
})

const repairOverviewModule = computed<DetailRelationModuleSchema<MaintenanceRecordRow>>(() => {
  if (!customer.value) {
    return {
      key: "repair-overview-records",
      title: "报修工单概览",
      emptyState: {
        title: "暂无报修工单数据",
        description: "当前客户下暂无可展示的报修工单。",
        icon: "ri-file-list-3-line",
      },
      rowKey: "id",
      columns: [
        { key: "location", label: "位置", slot: "repair-overview-location-cell" },
        {
          key: "item",
          label: "报修类型",
          headerClass: "text-center",
          cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center whitespace-nowrap text-muted-foreground",
        },
        {
          key: "executor",
          label: "执行人",
          headerClass: "text-center",
          cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center",
        },
        {
          key: "deadline",
          label: "创建时间",
          slot: "repair-overview-deadline-cell",
          headerClass: "text-center",
          cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center whitespace-nowrap text-muted-foreground",
        },
        { key: "actions", label: "", slot: "maintenance-action-cell", headerClass: "flex justify-end", cellClass: "flex justify-end" },
      ],
      groups: [],
      rowAction: row => handleOverviewWorkOrderDetail(row),
      mobileMinWidth: "42rem",
      columnTemplateMobile: "minmax(9rem,1fr) 6.5rem minmax(12rem,1.5fr) 8rem 2.75rem",
      columnTemplateDesktop: "minmax(9rem,1fr) 6.5rem minmax(12rem,1.5fr) 8rem 2.75rem",
      columnGapMobile: "0.75rem",
      columnGapDesktop: "1rem",
    }
  }

  return {
    key: "repair-overview-records",
    title: "报修工单概览",
    emptyState: {
      title: "暂无报修工单数据",
      description: "当前客户下暂无可展示的报修工单。",
      icon: "ri-file-list-3-line",
    },
    rowKey: "id",
    columns: [
      { key: "location", label: "位置", slot: "repair-overview-location-cell" },
      {
        key: "item",
        label: "报修类型",
        headerClass: "text-center",
        cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center whitespace-nowrap text-muted-foreground",
      },
      {
        key: "executor",
        label: "执行人",
        headerClass: "text-center",
        cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center",
      },
      {
        key: "deadline",
        label: "创建时间",
        slot: "repair-overview-deadline-cell",
        headerClass: "text-center",
        cellClass: "flex min-w-0 items-center justify-center overflow-hidden text-center whitespace-nowrap text-muted-foreground",
      },
      { key: "actions", label: "", slot: "maintenance-action-cell", headerClass: "flex justify-end", cellClass: "flex justify-end" },
    ],
    groups: buildMaintenanceGroups(repairOverviewRecords.value),
    rowAction: row => handleOverviewWorkOrderDetail(row),
    mobileMinWidth: "42rem",
    columnTemplateMobile: "minmax(9rem,1fr) 6.5rem minmax(12rem,1.5fr) 8rem 2.75rem",
    columnTemplateDesktop: "minmax(9rem,1fr) 6.5rem minmax(12rem,1.5fr) 8rem 2.75rem",
    columnGapMobile: "0.75rem",
    columnGapDesktop: "1rem",
  }
})

const buildingAssetsSchema: TablePageSchema<CustomerBuildingAssetRow> = {
  title: "",
  description: "",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  wrapperClass: "rounded-none border-0 shadow-none",
  emptyState: {
    title: "暂无建筑资产数据",
    description: "当前客户下暂无可展示的园区和建筑资产。",
    icon: "ri-building-2-line",
  },
  rowActions: [
    {
      key: "view-building",
      label: "查看详情",
      onClick: row => handleBuildingAssetDetail(row as CustomerBuildingAssetRow),
    },
  ],
  onRowClick: row => handleBuildingAssetDetail(row as CustomerBuildingAssetRow),
  columns: [
    {
      key: "buildingName",
      label: "建筑名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入建筑名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "parkName",
      label: "所属园区",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入园区名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "address",
      label: "地址",
      filterType: "text",
      tone: "muted",
      filter: {
        type: "text",
        placeholder: "输入地址",
      },
      sort: true,
    },
    {
      key: "contactName",
      label: "联系人",
      filterType: "contact",
      variant: "contact",
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "contactName",
        secondaryKey: "contactPhone",
      },
      filter: {
        type: "text",
        placeholder: "输入联系人或电话",
        value: row => `${row.contactName} ${row.contactPhone}`,
      },
      sort: {
        label: "联系人",
        value: row => row.contactName,
      },
    },
    {
      key: "buildingArea",
      label: "建筑面积",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入建筑面积",
      },
      sort: true,
    },
    {
      key: "statusLabel",
      label: "状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: workOrderStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "状态",
        kind: "metric",
        value: row => row.statusValue,
      },
    },
    {
      key: "updatedAt",
      label: "更新时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.updatedAt),
      },
      sort: true,
    },
  ],
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => buildBuildingAssetsFilterText(row),
    },
  ],
  sort: {
    storageKey: "customer-detail-building-assets-sort-preferences",
    initialField: "updatedAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}

const inspectionWorkOrdersSchema: TablePageSchema<CustomerWorkOrderRow> = {
  title: "",
  description: "",
  rowKey: "uuid",
  data: [],
  showIndex: true,
  stickyHeader: true,
  wrapperClass: "rounded-none border-0 shadow-none",
  emptyState: {
    title: "暂无检测工单数据",
    description: "当前客户下暂无可展示的检测工单。",
    icon: "ri-file-list-3-line",
  },
  rowActions: [
    {
      key: "assign-work-order",
      label: "指派",
      onClick: row => handleAssignWorkOrder(row as CustomerWorkOrderRow),
    },
    {
      key: "view-work-order",
      label: "查看详情",
      onClick: row => handleViewWorkOrder(row as CustomerWorkOrderRow),
    },
  ],
  onRowClick: row => handleViewWorkOrder(row as CustomerWorkOrderRow),
  columns: [
    {
      key: "orderNo",
      label: "检测工单",
      filterType: "text",
      slot: "cell-orderNo",
      emphasis: "default",
      tone: "muted",
      filter: {
        type: "text",
        placeholder: "输入工单编号",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "packageName",
      label: "检测服务名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入检测服务名称",
      },
      sort: true,
    },
    {
      key: "planName",
      label: "检测计划名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入检测计划名称",
      },
      sort: true,
    },
    {
      key: "executor",
      label: "执行人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入执行人",
      },
      sort: true,
    },
    {
      key: "statusLabel",
      label: "状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: workOrderStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "状态",
        kind: "metric",
        value: row => row.statusValue ?? -1,
      },
    },
    {
      key: "resultLabel",
      label: "检测结果",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "结果",
        kind: "metric",
        value: row => row.resultValue ?? -1,
      },
    },
    {
      key: "scoreLabel",
      label: "评分",
      filterType: "number",
      format: "numeric",
      filter: {
        type: "number",
        defaultVisible: true,
        value: row => row.score ?? -1,
      },
      sort: {
        label: "评分",
        kind: "metric",
        value: row => row.score ?? -1,
      },
    },
    {
      key: "deadline",
      label: "截止时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.deadline),
      },
      sort: true,
    },
    {
      key: "remark",
      label: "备注",
      filterType: "text",
      format: "note",
      filter: {
        type: "text",
        placeholder: "输入备注",
      },
    },
    {
      key: "createdStartAt",
      label: "创建开始时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.createdStartAt),
      },
      sort: true,
    },
    {
      key: "createdEndAt",
      label: "创建结束时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.createdEndAt),
      },
      sort: true,
    },
  ],
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => buildInspectionWorkOrdersFilterText(row),
    },
  ],
  sort: {
    storageKey: "customer-detail-inspection-work-orders-sort-preferences-created-at-v2",
    initialField: "createdAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}

const repairWorkOrdersSchema: TablePageSchema<CustomerWorkOrderRow> = {
  title: "",
  description: "",
  rowKey: "uuid",
  data: [],
  showIndex: true,
  stickyHeader: true,
  wrapperClass: "rounded-none border-0 shadow-none",
  emptyState: {
    title: "暂无报修工单数据",
    description: "当前客户下暂无可展示的报修工单。",
    icon: "ri-file-list-3-line",
  },
  rowActions: [
    {
      key: "assign-work-order",
      label: "指派",
      onClick: row => handleAssignWorkOrder(row as CustomerWorkOrderRow),
    },
    {
      key: "view-work-order",
      label: "查看详情",
      onClick: row => handleViewWorkOrder(row as CustomerWorkOrderRow),
    },
  ],
  onRowClick: row => handleViewWorkOrder(row as CustomerWorkOrderRow),
  columns: [
    {
      key: "orderNo",
      label: "报修工单",
      filterType: "text",
      slot: "cell-orderNo",
      emphasis: "default",
      tone: "muted",
      filter: {
        type: "text",
        placeholder: "输入工单编号",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "workOrderName",
      label: "报修标题",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入报修标题",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "parkName",
      label: "园区名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入园区名称",
      },
      sort: true,
    },
    {
      key: "executor",
      label: "执行人",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入执行人",
      },
      sort: true,
    },
    {
      key: "importantLabel",
      label: "重要程度",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "重要程度",
        kind: "metric",
        value: row => row.importantValue ?? -1,
      },
    },
    {
      key: "reportTypeLabel",
      label: "报修类型",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "报修类型",
        kind: "metric",
        value: row => row.reportTypeValue ?? -1,
      },
    },
    {
      key: "statusLabel",
      label: "状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: workOrderStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "状态",
        kind: "metric",
        value: row => row.statusValue ?? -1,
      },
    },
    {
      key: "remark",
      label: "内容说明",
      filterType: "text",
      format: "note",
      filter: {
        type: "text",
        placeholder: "输入内容说明",
      },
    },
    {
      key: "createdStartAt",
      label: "创建开始时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.createdStartAt),
      },
      sort: true,
    },
    {
      key: "createdEndAt",
      label: "创建结束时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.createdEndAt),
      },
      sort: true,
    },
  ],
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => buildRepairWorkOrdersFilterText(row),
    },
  ],
  sort: {
    storageKey: "customer-detail-repair-work-orders-sort-preferences-created-start-at-v3",
    initialField: "createdStartAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}

const monitoringRows = computed<MonitoringRow[]>(() => customer.value ? buildMockMonitoringRows(customer.value) : [])

const monitoringSchema: TablePageSchema<MonitoringRow> = {
  title: "",
  description: "",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  wrapperClass: "rounded-none border-0 shadow-none",
  emptyState: {
    title: "暂无监控数据",
    description: "当前客户下暂无可展示的监控设备。",
    icon: "ri-radar-line",
  },
  rowActions: [
    {
      key: "edit-monitoring",
      label: "编辑",
      onClick: row => handleEditMonitoring(row as MonitoringRow),
    },
    {
      key: "view-monitoring",
      label: "查看",
      onClick: row => handleViewMonitoring(row as MonitoringRow),
    },
  ],
  onRowClick: row => handleViewMonitoring(row as MonitoringRow),
  columns: [
    {
      key: "deviceName",
      label: "设备名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入设备名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "platform",
      label: "平台",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "deviceId",
      label: "设备ID",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入设备ID",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "customerName",
      label: "客户名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入客户名称",
      },
      sort: true,
    },
    {
      key: "parkName",
      label: "园区",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入园区名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "buildingName",
      label: "建筑",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入建筑名称",
        defaultVisible: true,
      },
      sort: true,
    },
  ],
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => `${row.deviceName} ${row.platform} ${row.deviceId} ${row.customerName} ${row.parkName} ${row.buildingName}`,
    },
  ],
  sort: {
    storageKey: "customer-detail-monitoring-sort-preferences",
    initialField: "deviceName",
    initialDirection: "asc",
  },
  tabs: {
    mode: "none",
  },
}

const subAccountsSchema: TablePageSchema<SubAccountRow> = {
  title: "",
  description: "",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  wrapperClass: "rounded-none border-0 shadow-none",
  emptyState: {
    title: "暂无子账号数据",
    description: "当前客户下暂无可展示的子账号。",
    icon: "ri-user-settings-line",
  },
  rowActions: [
    {
      key: "reset-password",
      label: "重置密码",
      onClick: row => handleResetSubAccountPassword(row as SubAccountRow),
    },
  ],
  columns: [
    {
      key: "name",
      label: "用户名",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入用户名",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "username",
      label: "账号",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入账号",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "isMainLabel",
      label: "账号类型",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "statusLabel",
      label: "状态",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: true,
    },
  ],
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => `${row.name} ${row.username} ${row.isMainLabel} ${row.statusLabel} ${row.uuid}`,
    },
  ],
  sort: {
    storageKey: "customer-detail-sub-accounts-sort-preferences-v2",
    initialField: "name",
    initialDirection: "asc",
  },
  tabs: {
    mode: "none",
  },
}

const buildingAssetsPage = useTablePage({
  ...createTablePageDefinition(buildingAssetsSchema),
  rows: buildingAssets,
})

const inspectionWorkOrdersPage = useTablePage({
  ...createTablePageDefinition(inspectionWorkOrdersSchema),
  rows: inspectionWorkOrders,
})

const repairWorkOrdersPage = useTablePage({
  ...createTablePageDefinition(repairWorkOrdersSchema),
  rows: repairWorkOrders,
})

const monitoringPage = useTablePage({
  ...createTablePageDefinition(monitoringSchema),
  rows: monitoringRows,
})

const subAccountsPage = useTablePage({
  ...createTablePageDefinition(subAccountsSchema),
  rows: subAccounts,
})
const pagedBuildingAssetsPage = createClientPaginatedTablePage(buildingAssetsPage, buildingAssetsPageNum, buildingAssetsPageSize)
const pagedMonitoringPage = createClientPaginatedTablePage(monitoringPage, monitoringPageNum, monitoringPageSize)
const pagedSubAccountsPage = createClientPaginatedTablePage(subAccountsPage, subAccountsPageNum, subAccountsPageSize)
const buildingAssetsPaginationTotal = computed(() => buildingAssetsPage.filteredRowsCount.value)
const monitoringPaginationTotal = computed(() => monitoringPage.filteredRowsCount.value)
const subAccountsPaginationTotal = computed(() => subAccountsPage.filteredRowsCount.value)

const parkDetailSheetSections = computed<DetailFieldSection[]>(() => {
  const current = activeParkDetail.value

  if (!current) {
    return []
  }

  const addressRow: DetailFieldSection["rows"][number] = {
    key: "address",
    label: "地址",
    value: toDisplayText(current.Address, "-"),
    truncate: false,
    valueClass: "leading-6",
    ...(hasValidLatLng(current.Latitude, current.Longitude)
      ? {
          suffixAction: {
            label: "在地图中查看",
            onClick: () => {
              parkMapDialogOpen.value = true
            },
          },
        }
      : {}),
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
        addressRow,
      ],
    },
  ]
})

const workOrderDetailSheetTitle = computed(() => (
  activeWorkOrderDetailKind.value === "repair"
    ? toRepairWorkOrderText(activeRepairWorkOrderDetail.value?.Title, "报修工单详情")
    : toWorkOrderText(activeInspectionWorkOrderDetail.value?.PackageName, "检测工单详情")
))

function openRepairWorkOrderCustomerDetail() {
  const targetCustomerUuid = toRepairWorkOrderText(activeRepairWorkOrderDetail.value?.CustomerUuid)

  if (!targetCustomerUuid) {
    return
  }

  handleWorkOrderDetailSheetOpenChange(false)

  if (targetCustomerUuid === customerUuid.value) {
    return
  }

  void router.push({
    name: "customer-detail",
    params: { id: targetCustomerUuid },
  })
}

function openRepairWorkOrderParkDetail() {
  const targetParkUuid = toRepairWorkOrderText(activeRepairWorkOrderDetail.value?.ParkUuid)

  if (!targetParkUuid) {
    return
  }

  handleWorkOrderDetailSheetOpenChange(false)
  void goToParkDetail(targetParkUuid)
}

const workOrderDetailPrimarySections = computed<DetailFieldSection[]>(() => {
  return activeWorkOrderDetailKind.value === "repair"
    ? buildRepairWorkOrderPrimarySections(activeRepairWorkOrderDetail.value, activeWorkOrderDetailCustomer.value, {
      onOpenCustomer: openRepairWorkOrderCustomerDetail,
      onOpenPark: openRepairWorkOrderParkDetail,
    })
    : buildWorkOrderPrimarySections(activeInspectionWorkOrderDetail.value, activeWorkOrderDetailCustomer.value)
})

const workOrderDetailSecondarySections = computed<DetailFieldSection[]>(() => {
  return activeWorkOrderDetailKind.value === "repair"
    ? buildRepairWorkOrderSecondarySections(activeRepairWorkOrderDetail.value)
    : buildWorkOrderSecondarySections(activeInspectionWorkOrderDetail.value)
})

watch(customer, current => {
  detailBreadcrumbTitle.value = current ? "客户详情" : null
})

watch(customerUuid, (uuid) => {
  buildingAssets.value = []
  buildingListRaw.value = []
  buildingAssetsErrorMessage.value = ""
  buildingAssetsPageNum.value = 1
  maintenanceRecords.value = []
  maintenanceRecordsErrorMessage.value = ""
  repairOverviewRecords.value = []
  repairOverviewRecordsErrorMessage.value = ""
  inspectionWorkOrders.value = []
  inspectionWorkOrdersErrorMessage.value = ""
  inspectionWorkOrdersTotal.value = 0
  inspectionWorkOrdersPageNum.value = 1
  repairWorkOrders.value = []
  repairWorkOrdersErrorMessage.value = ""
  repairWorkOrdersTotal.value = 0
  repairWorkOrdersPageNum.value = 1
  subAccounts.value = []
  subAccountsErrorMessage.value = ""
  monitoringPageNum.value = 1
  subAccountsPageNum.value = 1
  handleWorkOrderDetailSheetOpenChange(false)
  void loadCustomerDetail(uuid)
  void loadBuildingAssets(uuid)
  void loadMaintenanceRecords(uuid)
  void loadRepairOverviewRecords(uuid)
  void loadInspectionWorkOrders(uuid)
  void loadRepairWorkOrders(uuid)
  void loadSubAccounts(uuid)
  void loadParkBuildings(uuid)
}, { immediate: true })

watch(inspectionWorkOrdersPageSize, () => {
  inspectionWorkOrdersPageNum.value = 1
})

watch(repairWorkOrdersPageSize, () => {
  repairWorkOrdersPageNum.value = 1
})

watch(buildingAssetsPageSize, () => {
  buildingAssetsPageNum.value = 1
})

watch(monitoringPageSize, () => {
  monitoringPageNum.value = 1
})

watch(subAccountsPageSize, () => {
  subAccountsPageNum.value = 1
})

watch([inspectionWorkOrdersPageNum, inspectionWorkOrdersPageSize], () => {
  if (!customerUuid.value) {
    return
  }

  void loadInspectionWorkOrders(customerUuid.value)
})

watch([repairWorkOrdersPageNum, repairWorkOrdersPageSize], () => {
  if (!customerUuid.value) {
    return
  }

  void loadRepairWorkOrders(customerUuid.value)
})

watch(buildingAssetsPaginationTotal, (total) => {
  buildingAssetsPageNum.value = clampClientPageNum(buildingAssetsPageNum.value, buildingAssetsPageSize.value, total)
}, { immediate: true })

watch(monitoringPaginationTotal, (total) => {
  monitoringPageNum.value = clampClientPageNum(monitoringPageNum.value, monitoringPageSize.value, total)
}, { immediate: true })

watch(subAccountsPaginationTotal, (total) => {
  subAccountsPageNum.value = clampClientPageNum(subAccountsPageNum.value, subAccountsPageSize.value, total)
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

function handleAddBuilding() {
  if (!customerUuid.value) {
    return
  }

  router.push({
    name: "customer-building-create",
    params: { id: customerUuid.value },
    query: {
      customerName: toDisplayText(customer.value?.CorpName, "当前客户"),
    },
  })
}

function handleAddWorkOrder() {
  if (!customerUuid.value) {
    return
  }

  router.push({
    name: "customer-work-order-create",
    params: { id: customerUuid.value },
    query: {
      customerName: toDisplayText(customer.value?.CorpName, "当前客户"),
    },
  })
}

function handleAddRepairWorkOrder() {
  if (!customerUuid.value) {
    return
  }

  router.push({
    name: "repair-work-order-create",
    query: {
      customerUuid: customerUuid.value,
      customerName: toDisplayText(customer.value?.CorpName, "当前客户"),
      returnTo: "repair-work-orders",
    },
  })
}

function goToPreviousWorkOrderPage() {
  if (activeWorkOrderTableTab.value === "inspection") {
    inspectionWorkOrdersPageNum.value -= 1
    return
  }

  repairWorkOrdersPageNum.value -= 1
}

function goToNextWorkOrderPage() {
  if (activeWorkOrderTableTab.value === "inspection") {
    inspectionWorkOrdersPageNum.value += 1
    return
  }

  repairWorkOrdersPageNum.value += 1
}

function handleViewWorkOrder(row: CustomerWorkOrderRow) {
  if (!row.uuid) {
    toast.error("当前工单缺少 Uuid，无法查看详情")
    return
  }

  activeWorkOrderDetailKind.value = row.workOrderKind
  workOrderDetailSheetOpen.value = true
  void loadWorkOrderDetail(row.workOrderKind, row.uuid, row.customerUuid || customerUuid.value)
}

function handleOverviewWorkOrderDetail(row: MaintenanceRecordRow) {
  if (!row.uuid) {
    toast.error("当前工单缺少 Uuid，无法查看详情")
    return
  }

  activeWorkOrderDetailKind.value = row.workOrderKind
  workOrderDetailSheetOpen.value = true
  void loadWorkOrderDetail(row.workOrderKind, row.uuid, row.customerUuid || customerUuid.value)
}

async function handleAssignWorkOrder(row: CustomerWorkOrderRow) {
  if (!row.uuid) {
    toast.error("当前工单缺少 Uuid，无法指派")
    return
  }

  assignTargetWorkOrder.value = row

  try {
    await loadAssignableUsers()
    resetAssignState()

    assignDialogOpen.value = true
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "工单详情加载失败，暂时无法指派。",
    }))
  }
}

function closeAssignDialog() {
  if (assignSubmitting.value) {
    return
  }

  assignDialogOpen.value = false
  resetAssignState()
}

async function loadAssignableUsers() {
  if (assignableUsersLoading.value || assignableUsersLoaded.value) {
    return
  }

  assignableUsersLoading.value = true

  try {
    const result = await fetchMembers({
      PageNum: 1,
      PageSize: 200,
      Status: 1,
    })

    const normalizedOptions = result.list
      .map((item) => {
        const record = item as Record<string, unknown>
        const uuid = toDisplayText(record.Uuid ?? record.uuid, "")
        const name = toDisplayText(record.Name ?? record.name, uuid)

        if (!uuid) {
          return null
        }

        return { uuid, name }
      })
      .filter((item): item is AssignableUserOption => item !== null)

    assignableUsers.value = normalizedOptions
    assignableUsersLoaded.value = true
  } catch (error) {
    assignableUsers.value = []
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "指派人员列表加载失败，请稍后重试。",
    }))
  } finally {
    assignableUsersLoading.value = false
  }
}

function resetAssignState() {
  assignUserUuid.value = ""
  assignUserUuids.value = []
}

async function submitCustomerWorkOrderAssign() {
  const currentTarget = assignTargetWorkOrder.value
  const cid = customerUuid.value

  if (!currentTarget?.uuid) {
    toast.error("当前工单缺少 Uuid，无法指派")
    return
  }

  if (!cid) {
    toast.error("客户 Uuid 缺失，无法刷新列表")
    return
  }

  assignSubmitting.value = true

  try {
    if (currentTarget.workOrderKind === "inspection") {
      if (!assignUserUuids.value.length) {
        toast.error("请先选择至少一位指派人员")
        return
      }

      await dispatchWorkOrder({
        Uuid: currentTarget.uuid,
        UserUuids: assignUserUuids.value,
      })
    } else {
      if (!assignUserUuid.value) {
        toast.error("请先选择指派用户")
        return
      }

      await dispatchWorkOrder({
        Uuid: currentTarget.uuid,
        UserUuid: assignUserUuid.value,
      })
    }

    toast.success("指派成功")
    assignDialogOpen.value = false
    resetAssignState()

    if (currentTarget.workOrderKind === "repair") {
      await loadRepairWorkOrders(cid)
    } else {
      await loadInspectionWorkOrders(cid)
    }
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "指派失败，请稍后重试。",
    }))
  } finally {
    assignSubmitting.value = false
  }
}

function handleAddMonitoring() {
  toast.info("添加监控页面暂未接入")
}

function handleEditMonitoring(row: MonitoringRow) {
  toast.info(`编辑监控「${row.deviceName}」页面暂未接入`)
}

function handleViewMonitoring(row: MonitoringRow) {
  toast.info(`查看监控「${row.deviceName}」页面暂未接入`)
}

function handleAddSubAccount() {
  if (!customerUuid.value) {
    return
  }

  resetSubAccountCreateDialog()
  subAccountCreateDialogOpen.value = true
}

function handleResetSubAccountPassword(row: SubAccountRow) {
  toast.info(`重置子账号「${row.name}」密码功能暂未接入`)
}

function resetSubAccountCreateDialog() {
  subAccountCreateForm.value = createEmptySubAccountCreateForm()
}

function closeSubAccountCreateDialog(force = false) {
  if (subAccountCreateSubmitting.value && !force) {
    return
  }

  subAccountCreateDialogOpen.value = false
  resetSubAccountCreateDialog()
}

function handleSubAccountCreateDialogOpenChange(open: boolean) {
  if (open) {
    subAccountCreateDialogOpen.value = true
    return
  }

  closeSubAccountCreateDialog()
}

async function submitSubAccountCreate() {
  if (!customerUuid.value) {
    toast.error("所属客户信息缺失")
    return
  }

  const payload = {
    Account: normalizeDialogText(subAccountCreateForm.value.account),
    Password: normalizeDialogText(subAccountCreateForm.value.password),
    Phone: normalizeDialogText(subAccountCreateForm.value.phone),
    Name: normalizeDialogText(subAccountCreateForm.value.name),
    CustomerUuid: customerUuid.value,
  }

  if (!payload.Name) {
    toast.error("请填写用户名")
    return
  }

  if (!payload.Account) {
    toast.error("请填写账号")
    return
  }

  if (!payload.Password) {
    toast.error("请填写密码")
    return
  }

  if (!payload.Phone) {
    toast.error("请填写手机号")
    return
  }

  subAccountCreateSubmitting.value = true

  try {
    const result = await createCustomerSubAccount(payload)

    appendCustomerSubAccountLocalRecord(payload.CustomerUuid, {
      id: result.Uuid?.trim() || `${payload.CustomerUuid}-sub-account-${Date.now()}`,
      username: payload.Name,
      account: payload.Account,
      password: payload.Password,
      phone: payload.Phone,
    })

    await loadSubAccounts(payload.CustomerUuid)

    toast.success("子账号已创建", {
      description: result.Uuid
        ? `子账号 UUID：${result.Uuid}`
        : "子账号信息已提交到接口。",
    })

    closeSubAccountCreateDialog(true)
  } catch (error) {
    handleApiError(error, {
      title: "子账号创建失败",
      fallback: "子账号创建失败，请稍后重试。",
    })
  } finally {
    subAccountCreateSubmitting.value = false
  }
}

function handleContractDownload() {
  toast.info("合同下载接口暂未接入")
}

function ensurePageSortRule(page: {
  showControls: { value: boolean }
  customSortEnabled: { value: boolean }
  sortRules: { value: SortRule[] }
  sortFieldOptions: { value: Array<{ value: string; kind?: string }> }
}) {
  const sortFieldOptions = page.sortFieldOptions.value

  if (!sortFieldOptions.length) {
    return
  }

  if (!page.showControls.value) {
    page.showControls.value = true
  }

  if (!page.customSortEnabled.value || !page.sortRules.value.length) {
    const fallbackField = sortFieldOptions[0]?.value ?? ""
    const unusedField = sortFieldOptions.find((option) => !page.sortRules.value.some((rule) => rule.field === option.value))?.value
      ?? fallbackField
    const fieldMeta = sortFieldOptions.find(option => option.value === unusedField)

    const nextRule: SortRule = {
      id: `sort-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      field: unusedField,
      direction: fieldMeta?.kind === "metric" ? "desc" : "asc",
    }

    page.customSortEnabled.value = true
    page.sortRules.value = [nextRule]
  }
}

function handleActiveTableToolbarAddSort() {
  const page = activeTablePage.value

  if (!page) {
    return
  }

  ensurePageSortRule(page)

  activeTableSortPopoverOpen.value = !activeTableSortPopoverOpen.value
}

function handleMobileTabActionSelect(key: string) {
  switch (key) {
    case "toggle-filters":
      if (activeTablePage.value) {
        activeTablePage.value.showControls.value = !activeTablePage.value.showControls.value
      }
      return
    case "toggle-sort":
      if (activeTablePage.value?.customSortEnabled.value) {
        activeTablePage.value.customSortEnabled.value = false
        return
      }

      if (activeTablePage.value) {
        ensurePageSortRule(activeTablePage.value)
      }
      return
    case "export":
      activeTableExportDialogOpen.value = true
      return
    case "delete-customer":
      deleteConfirmOpen.value = true
      return
    case "add-park":
      goToCreatePark()
      return
    case "add-building":
      handleAddBuilding()
      return
    case "add-work-order":
      handleAddWorkOrder()
      return
    case "add-repair-work-order":
      handleAddRepairWorkOrder()
      return
    case "add-monitoring":
      handleAddMonitoring()
      return
    case "add-sub-account":
      handleAddSubAccount()
      return
    case "edit-customer":
      goToCustomerEdit()
      return
  }
}

function handleActiveTableExportConfirm(payload: { scope: TableExportScope; format: TableExportFormat }) {
  const page = activeTablePage.value

  if (!page || activeTableExporting.value) {
    return
  }

  const exportRows: Record<string, unknown>[] = payload.scope === "selected"
    ? page.selectedRows.value
    : page.filteredRows.value

  if (!exportRows.length) {
    return
  }

  activeTableExporting.value = true

  try {
    exportTableData({
      title: pageTitle.value ? `${pageTitle.value}-${activeTableTitle.value}` : activeTableTitle.value,
      columns: page.columns,
      rows: exportRows,
      format: payload.format,
    })
    activeTableExportDialogOpen.value = false
  } catch (error) {
    handleApiError(error, {
      title: "导出失败",
      fallback: "导出失败，请稍后重试。",
    })
  } finally {
    activeTableExporting.value = false
  }
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

function goToParkFullDetail(parkUuid: string, currentCustomerUuid: string) {
  if (!parkUuid) {
    return
  }

  parkDetailSheetOpen.value = false

  void router.push({
    name: "park-detail",
    params: { id: parkUuid },
    query: currentCustomerUuid
      ? { customerUuid: currentCustomerUuid }
      : undefined,
  })
}

function handleParkDetailSheetFooterPrimary() {
  const p = activeParkDetail.value
  if (!p?.Uuid) {
    return
  }
  goToParkFullDetail(p.Uuid, p.CustomerUuid || customer.value?.Uuid || "")
}

function handleParkDetailSheetOpenChange(open: boolean) {
  parkDetailSheetOpen.value = open

  if (!open) {
    parkDetailLoading.value = false
    parkDetailErrorMessage.value = ""
    parkDeleteConfirmOpen.value = false
    parkDeleteSubmitting.value = false
    activeParkDetail.value = null
  }
}

function handleWorkOrderDetailSheetOpenChange(open: boolean) {
  workOrderDetailSheetOpen.value = open

  if (!open) {
    latestWorkOrderDetailRequestId += 1
    workOrderDetailLoading.value = false
    workOrderDetailErrorMessage.value = ""
    activeInspectionWorkOrderDetail.value = null
    activeRepairWorkOrderDetail.value = null
    activeWorkOrderDetailCustomer.value = null
  }
}

function showInspectionWorkOrdersTab() {
  activeWorkOrderTableTab.value = "inspection"
  setActiveTab("work-orders")
}

function showRepairWorkOrdersTab() {
  activeWorkOrderTableTab.value = "repair"
  setActiveTab("work-orders")
}

async function loadWorkOrderDetail(kind: "inspection" | "repair", workOrderUuid: string, fallbackCustomerUuid = "") {
  const requestId = ++latestWorkOrderDetailRequestId

  if (!workOrderUuid) {
    activeInspectionWorkOrderDetail.value = null
    activeRepairWorkOrderDetail.value = null
    activeWorkOrderDetailCustomer.value = null
    workOrderDetailErrorMessage.value = "工单 Uuid 缺失，无法加载详情。"
    return
  }

  workOrderDetailLoading.value = true
  workOrderDetailErrorMessage.value = ""
  activeInspectionWorkOrderDetail.value = null
  activeRepairWorkOrderDetail.value = null
  activeWorkOrderDetailCustomer.value = null

  try {
    const detail = kind === "repair"
      ? await fetchRepairWorkOrderDetail({ Uuid: workOrderUuid })
      : await fetchWorkOrderDetail({ Uuid: workOrderUuid })

    if (requestId !== latestWorkOrderDetailRequestId) {
      return
    }

    activeWorkOrderDetailKind.value = kind

    if (kind === "repair") {
      activeRepairWorkOrderDetail.value = detail as RepairWorkOrderDetailResult
    } else {
      activeInspectionWorkOrderDetail.value = detail as WorkOrderDetailResult
    }

    const nextCustomerUuid = kind === "repair"
      ? toRepairWorkOrderText((detail as RepairWorkOrderDetailResult).CustomerUuid, fallbackCustomerUuid).trim()
      : toDisplayText((detail as WorkOrderDetailResult).CustomerUuid, fallbackCustomerUuid).trim()

    if (nextCustomerUuid) {
      try {
        const detailCustomer = await fetchCustomerDetail({ Uuid: nextCustomerUuid })

        if (requestId !== latestWorkOrderDetailRequestId) {
          return
        }

        activeWorkOrderDetailCustomer.value = detailCustomer
      } catch {
        if (requestId !== latestWorkOrderDetailRequestId) {
          return
        }

        activeWorkOrderDetailCustomer.value = null
      }
    }
  } catch (error) {
    if (requestId !== latestWorkOrderDetailRequestId) {
      return
    }

    activeInspectionWorkOrderDetail.value = null
    activeRepairWorkOrderDetail.value = null
    activeWorkOrderDetailCustomer.value = null
    workOrderDetailErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "工单详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestWorkOrderDetailRequestId) {
      workOrderDetailLoading.value = false
    }
  }
}

function goToWorkOrderFullDetail() {
  const targetUuid = activeWorkOrderDetailKind.value === "repair"
    ? activeRepairWorkOrderDetail.value?.Uuid
    : activeInspectionWorkOrderDetail.value?.Uuid
  const targetCustomerUuid = activeWorkOrderDetailKind.value === "repair"
    ? activeRepairWorkOrderDetail.value?.CustomerUuid
    : activeInspectionWorkOrderDetail.value?.CustomerUuid

  if (!targetUuid) {
    return
  }

  handleWorkOrderDetailSheetOpenChange(false)

  void router.push({
    name: activeWorkOrderDetailKind.value === "repair" ? "repair-work-order-detail" : "inspection-work-order-detail",
    params: { id: targetUuid },
    query: {
      customerUuid: targetCustomerUuid || customerUuid.value,
    },
  })
}

function promptDeletePark() {
  if (!activeParkDetail.value?.Uuid || parkDeleteSubmitting.value) {
    return
  }

  parkDeleteConfirmOpen.value = true
}

async function confirmDeletePark() {
  const parkUuid = activeParkDetail.value?.Uuid

  if (!parkUuid || parkDeleteSubmitting.value) {
    return
  }

  parkDeleteSubmitting.value = true

  try {
    await deletePark({ Uuid: parkUuid })
    parkDeleteConfirmOpen.value = false
    parkDetailSheetOpen.value = false
    parkDetailLoading.value = false
    parkDetailErrorMessage.value = ""
    activeParkDetail.value = null
    toast.success("园区已删除")

    if (customerUuid.value) {
      void loadBuildingAssets(customerUuid.value)
      void loadParkBuildings(customerUuid.value)
    }
  } catch (error) {
    handleApiError(error, {
      title: "园区删除失败",
      fallback: "园区删除失败，请稍后重试。",
    })
  } finally {
    parkDeleteSubmitting.value = false
  }
}

function getGroupParkUuid(group: unknown) {
  if (group && typeof group === "object" && "parkUuid" in group) {
    const value = (group as { parkUuid?: unknown }).parkUuid
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
  if (!buildingUuid || !parkUuid) {
    return
  }

  activeBuildingUuid.value = buildingUuid
  activeBuildingParkUuid.value = parkUuid
  buildingDetailSheetOpen.value = true
}

function handleBuildingAssetDetail(row: CustomerBuildingAssetRow) {
  goToBuildingDetail(row.uuid, row.parkUuid)
}

function handleBuildingDetailSheetOpenChange(open: boolean) {
  buildingDetailSheetOpen.value = open

  if (!open) {
    activeBuildingUuid.value = ""
    activeBuildingParkUuid.value = ""
  }
}

function handleBuildingDeleted() {
  if (!customerUuid.value) {
    return
  }

  void loadBuildingAssets(customerUuid.value)
  void loadParkBuildings(customerUuid.value)
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

async function loadBuildingAssets(uuid: string) {
  const requestId = ++latestBuildingAssetsRequestId

  if (!uuid) {
    buildingAssets.value = []
    buildingListRaw.value = []
    buildingAssetsErrorMessage.value = "客户 Uuid 缺失，无法加载建筑资产。"
    return
  }

  buildingAssetsLoading.value = true
  buildingAssetsErrorMessage.value = ""

  try {
    const list = await fetchAllBuildingAssets(uuid)

    if (requestId !== latestBuildingAssetsRequestId) {
      return
    }

    buildingListRaw.value = list
    buildingAssets.value = list.map(item => mapBuildingAssetRow(item, uuid))
  } catch (error) {
    if (requestId !== latestBuildingAssetsRequestId) {
      return
    }

    buildingListRaw.value = []
    buildingAssets.value = []
    buildingAssetsErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "建筑资产加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestBuildingAssetsRequestId) {
      buildingAssetsLoading.value = false
    }
  }
}

async function loadInspectionWorkOrders(uuid: string) {
  const requestId = ++latestInspectionWorkOrdersRequestId

  if (!uuid) {
    inspectionWorkOrders.value = []
    inspectionWorkOrdersTotal.value = 0
    inspectionWorkOrdersErrorMessage.value = "客户 Uuid 缺失，无法加载检测工单列表。"
    return
  }

  inspectionWorkOrdersLoading.value = true
  inspectionWorkOrdersErrorMessage.value = ""

  try {
    const result = await fetchWorkOrders({
      CustomerUuid: uuid,
      PageNum: inspectionWorkOrdersPageNum.value,
      PageSize: inspectionWorkOrdersPageSize.value,
    })

    if (requestId !== latestInspectionWorkOrdersRequestId) {
      return
    }

    inspectionWorkOrders.value = result.list.map((item, index) => mapInspectionWorkOrderRow(item, index))
    inspectionWorkOrdersTotal.value = result.total
  } catch (error) {
    if (requestId !== latestInspectionWorkOrdersRequestId) {
      return
    }

    inspectionWorkOrders.value = []
    inspectionWorkOrdersTotal.value = 0
    inspectionWorkOrdersErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测工单列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestInspectionWorkOrdersRequestId) {
      inspectionWorkOrdersLoading.value = false
    }
  }
}

async function loadRepairWorkOrders(uuid: string) {
  const requestId = ++latestRepairWorkOrdersRequestId

  if (!uuid) {
    repairWorkOrders.value = []
    repairWorkOrdersTotal.value = 0
    repairWorkOrdersErrorMessage.value = "客户 Uuid 缺失，无法加载报修工单列表。"
    return
  }

  repairWorkOrdersLoading.value = true
  repairWorkOrdersErrorMessage.value = ""

  try {
    const result = await fetchRepairWorkOrders({
      CustomerUuid: uuid,
      PageNum: repairWorkOrdersPageNum.value,
      PageSize: repairWorkOrdersPageSize.value,
    })

    if (requestId !== latestRepairWorkOrdersRequestId) {
      return
    }

    repairWorkOrders.value = result.list.map((item, index) => mapRepairWorkOrderRow(item, index))
    repairWorkOrdersTotal.value = result.total
  } catch (error) {
    if (requestId !== latestRepairWorkOrdersRequestId) {
      return
    }

    repairWorkOrders.value = []
    repairWorkOrdersTotal.value = 0
    repairWorkOrdersErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "报修工单列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRepairWorkOrdersRequestId) {
      repairWorkOrdersLoading.value = false
    }
  }
}

async function loadSubAccounts(uuid: string) {
  const requestId = ++latestSubAccountsRequestId

  if (!uuid) {
    subAccounts.value = []
    subAccountsErrorMessage.value = "客户 Uuid 缺失，无法加载子账号列表。"
    return
  }

  subAccountsLoading.value = true
  subAccountsErrorMessage.value = ""

  try {
    const result = await fetchCustomerSubAccounts({
      CustomerUuid: uuid,
      PageNum: 1,
      PageSize: 200,
    })

    if (requestId !== latestSubAccountsRequestId) {
      return
    }

    const remoteRows = result.list.map((item, index) => mapSubAccountRow(item, index))
    subAccounts.value = mergeSubAccountRows(remoteRows, readCustomerSubAccountLocalRecords(uuid))
  } catch (error) {
    if (requestId !== latestSubAccountsRequestId) {
      return
    }

    subAccounts.value = readCustomerSubAccountLocalRecords(uuid).map(mapLocalSubAccountRow)
    subAccountsErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "子账号列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestSubAccountsRequestId) {
      subAccountsLoading.value = false
    }
  }
}

async function loadMaintenanceRecords(uuid: string) {
  const requestId = ++latestMaintenanceRecordsRequestId

  if (!uuid) {
    maintenanceRecords.value = []
    maintenanceRecordsErrorMessage.value = "客户 Uuid 缺失，无法加载检测工单概览。"
    return
  }

  maintenanceRecordsLoading.value = true
  maintenanceRecordsErrorMessage.value = ""

  try {
    const inspectionResult = await fetchWorkOrders({
      CustomerUuid: uuid,
      PageNum: 1,
      PageSize: 5,
    })

    if (requestId !== latestMaintenanceRecordsRequestId) {
      return
    }

    const overviewRows = inspectionResult.list
      .map((item, index) => mapInspectionWorkOrderRow(item, index))
      .sort((left, right) => getMaintenanceRecordSortTime(right) - getMaintenanceRecordSortTime(left))
      .slice(0, 5)

    const rowsWithDetailPlanName = await Promise.all(overviewRows.map(async (row) => {
      if (!row.uuid) {
        return row
      }

      try {
        const detail = await fetchWorkOrderDetail({ Uuid: row.uuid })

        return {
          ...row,
          planName: toDisplayText(detail.PlanName, row.planName !== "-" ? row.planName : "未关联计划"),
        }
      } catch {
        return row
      }
    }))

    if (requestId !== latestMaintenanceRecordsRequestId) {
      return
    }

    maintenanceRecords.value = rowsWithDetailPlanName.map(mapMaintenanceRecordRow)
  } catch (error) {
    if (requestId !== latestMaintenanceRecordsRequestId) {
      return
    }

    maintenanceRecords.value = []
    maintenanceRecordsErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测工单概览加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestMaintenanceRecordsRequestId) {
      maintenanceRecordsLoading.value = false
    }
  }
}

async function loadRepairOverviewRecords(uuid: string) {
  const requestId = ++latestRepairOverviewRecordsRequestId

  if (!uuid) {
    repairOverviewRecords.value = []
    repairOverviewRecordsErrorMessage.value = "客户 Uuid 缺失，无法加载报修工单概览。"
    return
  }

  repairOverviewRecordsLoading.value = true
  repairOverviewRecordsErrorMessage.value = ""

  try {
    const repairResult = await fetchRepairWorkOrders({
      CustomerUuid: uuid,
      PageNum: 1,
      PageSize: 5,
    })

    if (requestId !== latestRepairOverviewRecordsRequestId) {
      return
    }

    repairOverviewRecords.value = repairResult.list
      .map((item, index) => mapRepairWorkOrderRow(item, index))
      .sort((left, right) => getMaintenanceRecordSortTime(right) - getMaintenanceRecordSortTime(left))
      .slice(0, 5)
      .map(mapRepairOverviewRecordRow)
  } catch (error) {
    if (requestId !== latestRepairOverviewRecordsRequestId) {
      return
    }

    repairOverviewRecords.value = []
    repairOverviewRecordsErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "报修工单概览加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRepairOverviewRecordsRequestId) {
      repairOverviewRecordsLoading.value = false
    }
  }
}

async function fetchAllBuildingAssets(uuid: string) {
  const pageSize = 200
  const allItems: BuildingListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchBuildings({
      CustomerUuid: uuid,
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && allItems.length >= total)) {
      break
    }

    pageNum += 1
  }

  return allItems
}


function resolveContactRole(isMain: unknown, index: number) {
  if (Number(isMain) === 1) {
    return "主要责任人"
  }

  return index === 0 ? "责任人" : "协同联系人"
}

function hasPrincipalContent(person: CustomerDetailPerson) {
  const name = typeof person.Name === "string" ? person.Name.trim() : ""
  const phone = typeof person.Phone === "string" ? person.Phone.trim() : ""
  return Boolean(name || phone)
}

function buildContactFieldRows(people: CustomerDetailResult["People"]) {
  const filled = Array.isArray(people) ? people.filter(hasPrincipalContent) : []

  if (!filled.length) {
    return [
      { key: "contact-empty", label: "联系人", value: "未填写" },
    ]
  }

  return filled.map((person, index) => createContactFieldRow(person, index))
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
    { key: "current-package", label: "当前购买检测服务信息", value: formatPackageInfo(packageRecord?.packageName ?? "-", packageRecord?.packageCode ?? "") },
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

function buildMaintenanceGroups(records: MaintenanceRecordRow[]) {
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

function mapMaintenanceRecordRow(row: CustomerWorkOrderRow): MaintenanceRecordRow {
  const location = row.buildingName !== "-"
    ? row.buildingName
    : row.parkName !== "-"
      ? row.parkName
      : "未关联建筑"

  return {
    id: `${row.workOrderKind}-${row.uuid || row.id}`,
    uuid: row.uuid,
    workOrderKind: row.workOrderKind,
    customerUuid: row.customerUuid,
    status: mapMaintenanceStatus(row),
    serviceName: row.packageName !== "-" ? row.packageName : "未设置",
    serviceTooltip: row.planName !== "-" ? row.planName : "未关联计划",
    result: row.resultLabel,
    location,
    parkName: row.parkName !== "-" ? row.parkName : "未关联园区",
    item: row.workOrderName !== "-" ? row.workOrderName : row.planName,
    executor: row.executor,
    executors: row.executors,
    deadline: row.deadline,
  }
}

function mapRepairOverviewRecordRow(row: CustomerWorkOrderRow): MaintenanceRecordRow {
  const location = row.buildingName !== "-"
    ? row.buildingName
    : row.parkName !== "-"
      ? row.parkName
      : "未关联建筑"

  return {
    id: `${row.workOrderKind}-${row.uuid || row.id}`,
    uuid: row.uuid,
    workOrderKind: row.workOrderKind,
    customerUuid: row.customerUuid,
    status: mapMaintenanceStatus(row),
    serviceName: "-",
    serviceTooltip: "-",
    result: "-",
    location,
    parkName: row.parkName !== "-" ? row.parkName : "未关联园区",
    item: row.reportTypeLabel !== "-" ? row.reportTypeLabel : "未设置",
    executor: row.executor,
    executors: row.executors,
    deadline: formatDateOnly(row.createdAt),
    deadlineFull: row.createdAt,
  }
}

function mapMaintenanceStatus(row: CustomerWorkOrderRow): MaintenanceRecordRow["status"] {
  if (row.statusValue === 5) {
    return "completed"
  }

  if (row.statusValue === 3 || row.statusValue === 4) {
    return "processing"
  }

  return "pending"
}

function getMaintenanceRecordSortTime(row: CustomerWorkOrderRow) {
  return parseDateTimeValue(firstNonEmptyText([
    row.updatedAt,
    row.createdEndAt,
    row.createdAt,
    row.createdStartAt,
  ], ""))
}

function firstNonEmptyText(values: string[], fallback: string) {
  for (const value of values) {
    if (value && value !== "-" && value !== "—") {
      return value
    }
  }

  return fallback
}

function parseDateTimeValue(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return 0
  }

  const parsed = Date.parse(normalized.replace(/\./g, "-"))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDateOnly(value: string) {
  const normalized = value.trim()

  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
}

function hasExplicitTime(value: string | undefined) {
  if (!value) {
    return false
  }

  const normalized = value.trim()
  if (!normalized || normalized === "-" || normalized === "—") {
    return false
  }

  return /(?:\s|T)\d{1,2}:\d{2}(?::\d{2})?/.test(normalized)
}

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function buildBuildingAssetsFilterText(row: CustomerBuildingAssetRow) {
  return [
    row.buildingName,
    row.parkName,
    row.address,
    row.builtTime,
    row.operationTime,
    row.buildingArea,
    row.contactName,
    row.contactPhone,
    row.statusLabel,
    row.updatedAt,
  ].join(" ")
}

function buildInspectionWorkOrdersFilterText(row: CustomerWorkOrderRow) {
  return [
    row.orderNo,
    row.customerName,
    row.packageName,
    row.planName,
    row.executor,
    row.statusLabel,
    row.resultLabel,
    row.scoreLabel,
    row.createdAt,
    row.updatedAt,
    row.deadline,
    row.remark,
    row.createdStartAt,
    row.createdEndAt,
  ].join(" ")
}

function buildRepairWorkOrdersFilterText(row: CustomerWorkOrderRow) {
  return [
    row.orderNo,
    row.workOrderName,
    row.customerName,
    row.parkName,
    row.executor,
    row.importantLabel,
    row.reportTypeLabel,
    row.statusLabel,
    row.remark,
    row.createdAt,
    row.updatedAt,
    row.createdStartAt,
    row.createdEndAt,
  ].join(" ")
}

function formatWorkOrderStatus(status: number | null) {
  if (status === null) {
    return "未知状态"
  }

  switch (status) {
    case 1:
      return "待指派"
    case 2:
      return "待开始"
    case 3:
      return "进行中"
    case 4:
      return "报告生成中"
    case 5:
      return "已结单"
    default:
      return `状态 ${status}`
  }
}

function formatWorkOrderResult(result: number | null) {
  if (result === null) {
    return "未反馈"
  }

  switch (result) {
    case 0:
      return "未反馈"
    case 1:
      return "正常"
    case 2:
      return "异常"
    case 3:
      return "已驳回"
    default:
      return `结果 ${result}`
  }
}

function formatWorkOrderScore(score: number | null) {
  if (score === null) {
    return "-"
  }

  return String(score)
}

function mapBuildingAssetRow(item: BuildingListItem, currentCustomerUuid: string): CustomerBuildingAssetRow {
  const uuid = toDisplayText(item.Uuid, `building-${toDisplayText(item.Id, "unknown")}`)

  return {
    id: uuid,
    uuid,
    parkUuid: toDisplayText(item.ParkUuid, ""),
    customerUuid: currentCustomerUuid,
    parkName: toDisplayText(item.ParkName, "-"),
    buildingName: toDisplayText(item.Name, "未命名建筑"),
    address: toDisplayText(item.Address, "-"),
    builtTime: toDisplayText(item.BuiltTime, "-"),
    operationTime: toDisplayText(item.OperationTime, "-"),
    buildingArea: toDisplayText(item.BuildingArea ?? item.BuildArea, "-"),
    contactName: toDisplayText(item.ContactPerson ?? item.Contact, "-"),
    contactPhone: toDisplayText(item.ContactPhone, "-"),
    statusValue: 0,
    statusLabel: "未设置",
    updatedAt: toDisplayText(item.UpdatedAt, "-"),
  }
}

function mapInspectionWorkOrderRow(item: WorkOrderListItem, index: number): CustomerWorkOrderRow {
  const uuid = toDisplayText(item.Uuid, toDisplayText(item.Id, `${inspectionWorkOrdersPageNum.value}-${index + 1}`))
  const fallbackId = toDisplayText(item.Id, `${inspectionWorkOrdersPageNum.value}-${index + 1}`)
  const statusValue = toNullableNumber(item.Status)
  const score = toNullableNumber(item.Score)
  const resultValue = toNullableNumber(item.Result)
  const executors = normalizeExecutors(item.Executors, item.Executor)

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    workOrderKind: "inspection",
    workOrderTypeLabel: "检测工单",
    customerUuid: toDisplayText(item.CustomerUuid, customerUuid.value),
    planUuid: toDisplayText(item.PlanUuid, ""),
    orderNo: toDisplayText(item.OrderNo, "-"),
    workOrderName: toDisplayText(item.PackageName, "-"),
    // 接口字段从 CustomerName 调整为 CorpName
    customerName: toDisplayText(item.CorpName || item.CustomerName, toDisplayText(customer.value?.CorpName, "-")),
    parkName: toDisplayText(item.ParkName, "-"),
    buildingName: toDisplayText(item.BuildName, "-"),
    packageName: toDisplayText(item.PackageName, "-"),
    planName: toDisplayText(item.PlanName, "-"),
    executor: formatExecutorText(executors),
    executors,
    status: statusValue === null ? "" : String(statusValue),
    statusValue,
    statusLabel: formatWorkOrderStatus(statusValue),
    importantValue: null,
    importantLabel: "-",
    reportTypeValue: null,
    reportTypeLabel: "-",
    resultValue,
    resultLabel: formatWorkOrderResult(resultValue),
    score,
    scoreLabel: formatWorkOrderScore(score),
    deadline: formatDateOnly(toDisplayText(item.Deadline, "-")),
    remark: toDisplayText(item.Remark, "-"),
    createdAt: toDisplayText(item.CreatedAt, "-"),
    updatedAt: toDisplayText(item.UpdatedAt, "-"),
    createdStartAt: "-",
    createdEndAt: "-",
  }
}

function normalizeExecutors(value: unknown, fallback?: unknown) {
  if (Array.isArray(value)) {
    const normalized = value
      .map(item => toDisplayText(item, ""))
      .filter(Boolean)

    if (normalized.length) {
      return normalized
    }
  }

  const fallbackText = toDisplayText(fallback, "")
  return fallbackText ? [fallbackText] : []
}

function formatExecutorText(executors: string[]) {
  return executors.length ? executors.join("、") : "-"
}

function formatExecutorSummary(executors: string[]) {
  if (!executors.length) {
    return "-"
  }

  if (executors.length === 1) {
    return executors[0]
  }

  return `${executors[0]} 等 ${executors.length} 人`
}

function buildExecutorTooltip(executors: string[]) {
  return executors.length ? executors.join("、") : ""
}

function mapRepairWorkOrderRow(item: RepairWorkOrderListItem, index: number): CustomerWorkOrderRow {
  const uuid = toDisplayText(item.Uuid, toDisplayText(item.Id, `repair-${index + 1}`))
  const fallbackId = toDisplayText(item.Id, `repair-${index + 1}`)
  const statusValue = toNullableNumber(item.Status)
  const importantValue = toNullableNumber(item.Important)
  const reportTypeValue = toNullableNumber(item.ReportType)
  const createdStartAt = toDisplayText(item.CreatedStartAt, "-")
  const createdEndAt = toDisplayText(item.CreatedEndAt, "-")
  const createdAt = toDisplayText(item.CreatedAt, createdStartAt !== "-" ? createdStartAt : "-")
  const updatedAt = toDisplayText(item.UpdatedAt, createdEndAt !== "-" ? createdEndAt : "-")
  const executors = normalizeExecutors(item.UserName)

  return {
    id: uuid || fallbackId,
    uuid: uuid || fallbackId,
    workOrderKind: "repair",
    workOrderTypeLabel: "报修工单",
    customerUuid: toDisplayText(item.CustomerUuid, customerUuid.value),
    planUuid: "",
    orderNo: toDisplayText(item.OrderNo, "-"),
    workOrderName: toDisplayText(item.Title, "-"),
    customerName: toDisplayText(item.CorpName || item.CustomerName, toDisplayText(customer.value?.CorpName, "-")),
    parkName: toDisplayText(item.ParkName, "-"),
    buildingName: toDisplayText(item.BuildName, "-"),
    packageName: "-",
    planName: "-",
    executor: formatExecutorText(executors),
    executors,
    status: statusValue === null ? "" : String(statusValue),
    statusValue,
    statusLabel: formatRepairWorkOrderStatus(statusValue),
    importantValue,
    importantLabel: formatRepairImportantLabel(importantValue),
    reportTypeValue,
    reportTypeLabel: formatRepairReportTypeLabel(reportTypeValue),
    resultValue: reportTypeValue,
    resultLabel: formatRepairReportTypeLabel(reportTypeValue),
    score: importantValue,
    scoreLabel: formatRepairImportantLabel(importantValue),
    deadline: "-",
    remark: toDisplayText(item.RepairContent || item.Content, "-"),
    createdAt,
    updatedAt,
    createdStartAt,
    createdEndAt,
  }
}

function formatRepairWorkOrderStatus(status: number | null) {
  if (status === null) {
    return "未知状态"
  }

  switch (status) {
    case 1:
      return "待指派"
    case 2:
      return "待开始"
    case 3:
      return "进行中"
    case 4:
      return "报告生成中"
    case 5:
      return "已结单"
    default:
      return `状态 ${status}`
  }
}

function formatRepairReportTypeLabel(value: number | null) {
  if (value === null) {
    return "-"
  }

  return `类型 ${value}`
}

function formatRepairImportantLabel(value: number | null) {
  if (value === null) {
    return "-"
  }

  return `等级 ${value}`
}

function formatCustomerStatus(value: unknown) {
  const status = typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.trim())
      : null

  switch (status) {
    case 1:
      return "正常"
    case 2:
      return "封禁"
    case 3:
      return "未完善"
    default:
      return "未填写"
  }
}

function buildCustomerStatusValue(value: unknown): DetailStatusValue {
  return {
    kind: "status",
    value: formatCustomerStatus(value),
    renderer: {
      kind: "status",
      map: customerStatusMap,
      fallback: { tone: "gray", icon: "dot" },
    },
  }
}

function toNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function buildMockMonitoringRows(current: CustomerDetailResult): MonitoringRow[] {
  const customerName = toDisplayText(current.CorpName, "当前客户")
  const buildingRows = buildingAssets.value.slice(0, 6)

  if (buildingRows.length) {
    return buildingRows.map((item, index) => ({
      id: `${item.uuid || item.id}-monitoring-${index + 1}`,
      deviceName: `${item.buildingName}${index % 2 === 0 ? "主入口枪机" : "消防通道球机"}`,
      platform: index % 2 === 0 ? "海康互联" : "萤石云",
      deviceId: `MON-${(item.uuid || item.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
      customerName,
      parkName: item.parkName,
      buildingName: item.buildingName,
    }))
  }

  return [
    {
      id: `${customerUuid.value || "customer"}-monitoring-1`,
      deviceName: "南门出入口枪机",
      platform: "海康互联",
      deviceId: `MON-${(customerUuid.value || "customer").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}-01`,
      customerName,
      parkName: "默认园区",
      buildingName: "1号楼",
    },
    {
      id: `${customerUuid.value || "customer"}-monitoring-2`,
      deviceName: "消防控制室球机",
      platform: "萤石云",
      deviceId: `MON-${(customerUuid.value || "customer").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}-02`,
      customerName,
      parkName: "默认园区",
      buildingName: "2号楼",
    },
    {
      id: `${customerUuid.value || "customer"}-monitoring-3`,
      deviceName: "地下车库入口枪机",
      platform: "宇视云",
      deviceId: `MON-${(customerUuid.value || "customer").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}-03`,
      customerName,
      parkName: "默认园区",
      buildingName: "3号楼",
    },
  ]
}

function createClientPaginatedTablePage<Row extends Record<string, unknown>>(
  page: TablePageController<Row>,
  pageNum: Ref<number>,
  pageSize: Ref<number>,
) {
  const visibleRows = computed(() => {
    const normalizedPageNum = Math.max(1, pageNum.value)
    const normalizedPageSize = Math.max(1, pageSize.value)
    const startIndex = (normalizedPageNum - 1) * normalizedPageSize

    return page.filteredRows.value.slice(startIndex, startIndex + normalizedPageSize)
  })
  const currentPageRows = visibleRows
  const currentPageRowsCount = computed(() => visibleRows.value.length)
  const selectedRows = computed(() => {
    const selectedRowKeys = new Set(page.selectedRowKeys.value)

    return visibleRows.value.filter((row, index) => selectedRowKeys.has(resolveTablePageRowKey(page, row, index)))
  })
  const selectedRowsCount = computed(() => selectedRows.value.length)

  return {
    ...page,
    visibleRows,
    currentPageRows,
    currentPageRowsCount,
    selectedRows,
    selectedRowsCount,
  }
}

function resolveTablePageRowKey<Row extends Record<string, unknown>>(page: TablePageController<Row>, row: Row, index: number) {
  if (typeof page.rowKey === "function") {
    return page.rowKey(row, index)
  }

  const value = row[page.rowKey]
  return typeof value === "string" || typeof value === "number" ? value : index
}

function clampClientPageNum(pageNum: number, pageSize: number, total: number) {
  const maxPage = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  return Math.min(Math.max(1, pageNum), maxPage)
}

function mapSubAccountRow(item: CustomerSubAccountListItem, index: number): SubAccountRow {
  const uuid = toDisplayText(item.Uuid, "")

  return {
    id: uuid || `sub-account-${index + 1}`,
    uuid,
    name: toDisplayText(item.Name, "未命名子账号"),
    username: toDisplayText(item.Username, "-"),
    isMain: toOptionalNumber(item.IsMain),
    isMainLabel: resolveSubAccountTypeLabel(item.IsMain),
    status: toOptionalNumber(item.Status),
    statusLabel: resolveSubAccountStatusLabel(item.Status),
  }
}

function mapLocalSubAccountRow(record: CustomerSubAccountLocalRecord): SubAccountRow {
  return {
    id: record.id,
    uuid: "",
    name: toDisplayText(record.username, "未命名子账号"),
    username: toDisplayText(record.account, "-"),
    isMain: 2,
    isMainLabel: "子账号",
    status: 1,
    statusLabel: "正常",
  }
}

function mergeSubAccountRows(remoteRows: SubAccountRow[], localRecords: CustomerSubAccountLocalRecord[]) {
  const mergedRows = [...remoteRows]

  for (const row of localRecords.map(mapLocalSubAccountRow)) {
    if (mergedRows.some(item => isSameSubAccountRow(item, row))) {
      continue
    }

    mergedRows.unshift(row)
  }

  return mergedRows
}

function isSameSubAccountRow(left: SubAccountRow, right: SubAccountRow) {
  if (left.uuid && right.uuid) {
    return left.uuid === right.uuid
  }

  return left.username === right.username
}

function createEmptySubAccountCreateForm(): CustomerSubAccountCreateFormState {
  return {
    name: "",
    account: "",
    password: "",
    phone: "",
  }
}

function normalizeDialogText(value: unknown) {
  if (typeof value === "string") {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return ""
}

function resolveSubAccountTypeLabel(value: unknown) {
  return Number(value) === 1 ? "主账号" : "子账号"
}

function resolveSubAccountStatusLabel(value: unknown) {
  return Number(value) === 2 ? "禁用" : "正常"
}

function toOptionalNumber(value: unknown) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
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
    rowAction: row => goToBuildingDetail(row.uuid, row.parkUuid),
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
    @tab-click="setActiveTab($event as CustomerDetailTab)"
  >
    <template #tabActions>
      <DetailTabActionsGroup :mobile-items="activeDetailMobileActionItems" @select="handleMobileTabActionSelect">
        <template #leading>
          <template v-if="activeTablePage">
            <button
              type="button"
              :class="[
                detailToolbarButtonClass,
                activeTablePage?.showControls.value ? detailToolbarButtonActiveClass : '',
              ]"
              @click="activeTablePage && (activeTablePage.showControls.value = !activeTablePage.showControls.value)"
            >
              <i :class="['ri-filter-3-line text-[17px]', activeTablePage?.showControls.value ? 'text-link' : '']" />
            </button>

            <Popover :open="activeTableSortPopoverOpen" @update:open="activeTableSortPopoverOpen = $event">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  :class="[
                    detailToolbarButtonClass,
                    activeTablePage?.customSortEnabled.value ? detailToolbarButtonActiveClass : '',
                  ]"
                  @click="handleActiveTableToolbarAddSort"
                >
                  <i :class="['ri-sort-asc text-[17px]', activeTablePage?.customSortEnabled.value ? 'text-link' : '']" />
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                :side-offset="10"
                class="w-auto border-0 bg-transparent p-0 shadow-none"
              >
                <SortPopover
                  :enabled="activeTablePage?.customSortEnabled.value ?? false"
                  :rules="activeTablePage?.sortRules.value ?? []"
                  :field-options="activeTablePage?.sortFieldOptions.value ?? []"
                  @close="activeTableSortPopoverOpen = false"
                  @set-enabled="activeTablePage && (activeTablePage.customSortEnabled.value = $event)"
                  @update-rules="activeTablePage && (activeTablePage.sortRules.value = $event)"
                />
              </PopoverContent>
            </Popover>

            <button type="button" :class="detailToolbarButtonClass">
              <i class="ri-more-2-line text-base" />
            </button>

            <Button
              variant="outline"
              class="h-8 gap-1 px-3 text-[14px]"
              @click="activeTableExportDialogOpen = true"
            >
              <i class="ri-download-line text-base" />
              导出
            </Button>
          </template>
        </template>

        <template #trailing>
          <AlertDialog v-if="activeDetailTabActions.deleteCustomer" :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
            <Button
              variant="outline"
              size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium text-destructive hover:bg-destructive/5 hover:text-destructive"
              @click="deleteConfirmOpen = true"
            >
              <i class="ri-delete-bin-line text-base" />
              删除用户
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除当前用户？</AlertDialogTitle>
                <AlertDialogDescription>
                  删除后将无法恢复，该操作会移除当前客户资料。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel :disabled="deleteSubmitting" class="gap-2">
                  <i class="ri-close-line text-base" />
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  :disabled="deleteSubmitting"
                  class="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  @click="handleDeleteCustomer"
                >
                  <i
                    :class="deleteSubmitting ? 'ri-loader-4-line animate-spin text-base' : 'ri-delete-bin-line text-base'"
                  />
                  {{ deleteSubmitting ? "删除中..." : "确认删除" }}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            v-if="activeDetailTabActions.addPark"
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium"
            @click="goToCreatePark"
          >
            <i class="ri-add-line text-base" />
            添加园区
          </Button>
          <Button
            v-if="activeDetailTabActions.addBuilding"
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium"
            @click="handleAddBuilding"
          >
            <i class="ri-building-line text-base" />
            添加建筑
          </Button>
          <Button
            v-if="activeDetailTabActions.addWorkOrder"
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium"
            @click="handleAddWorkOrder"
          >
            <i class="ri-file-add-line text-base" />
            添加检测工单
          </Button>
          <Button
            v-if="activeDetailTabActions.addRepairWorkOrder"
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium"
            @click="handleAddRepairWorkOrder"
          >
            <i class="ri-hammer-line text-base" />
            添加报修工单
          </Button>
          <Button
            v-if="activeDetailTabActions.addMonitoring"
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium"
            @click="handleAddMonitoring"
          >
            <i class="ri-radar-line text-base" />
            添加监控
          </Button>
          <Button
            v-if="activeDetailTabActions.addSubAccount"
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium"
            @click="handleAddSubAccount"
          >
            <i class="ri-user-add-line text-base" />
            添加子账号
          </Button>
          <Button
            v-if="activeDetailTabActions.editCustomer"
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium"
            @click="goToCustomerEdit"
          >
            <i class="ri-edit-line text-base" />
            修改客户信息
          </Button>
          <Button
            v-if="activeDetailTabActions.back"
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium"
            @click="goBack"
          >
            <i class="ri-arrow-left-line text-base" />
            返回客户列表
          </Button>
        </template>
      </DetailTabActionsGroup>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>客户详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <template v-if="activeTab === 'building-assets'">
        <div class="flex min-h-0 flex-1 flex-col">
          <Alert v-if="buildingAssetsErrorMessage" variant="destructive" class="mb-5">
            <AlertTitle>建筑资产接口加载失败</AlertTitle>
            <AlertDescription>{{ buildingAssetsErrorMessage }}</AlertDescription>
          </Alert>

          <CustomerDetailContentLoading v-if="loading || buildingAssetsLoading" variant="building-assets" />
          <TablePage v-else-if="customer" :page="pagedBuildingAssetsPage" :show-toolbar-actions="false" :list-level-table="false" fill-available-height class="-mt-3">
            <template #footer>
              <Pagination
                v-model:page="buildingAssetsPageNum"
                :items-per-page="buildingAssetsPageSize"
                :total="buildingAssetsPaginationTotal"
                :sibling-count="1"
                :disabled="buildingAssetsLoading"
                show-edges
                class="w-full justify-end"
              >
                <PaginationContent v-slot="{ items }" class="justify-end">
                  <PaginationFirst />
                  <PaginationPrevious />

                  <template
                    v-for="(item, index) in items"
                    :key="`${item.type}-${item.type === 'page' ? item.value : index}`"
                  >
                    <PaginationItem
                      v-if="item.type === 'page'"
                      :value="item.value"
                      :is-active="item.value === buildingAssetsPageNum"
                    >
                      {{ item.value }}
                    </PaginationItem>
                    <PaginationEllipsis v-else />
                  </template>

                  <PaginationNext />
                  <PaginationLast />
                </PaginationContent>
              </Pagination>
            </template>
          </TablePage>
        </div>
      </template>

      <template v-else-if="activeTab === 'work-orders'">
        <CustomerDetailContentLoading v-if="loading || activeWorkOrderTableLoading" variant="work-orders" />
        <div v-else-if="customer" class="flex min-h-0 flex-1 flex-col">
          <Alert v-if="activeWorkOrderTableErrorMessage" variant="destructive" class="mb-5">
            <AlertTitle>工单列表接口加载失败</AlertTitle>
            <AlertDescription>{{ activeWorkOrderTableErrorMessage }}</AlertDescription>
          </Alert>

          <TablePage :page="activeWorkOrderTableTab === 'inspection' ? inspectionWorkOrdersPage : repairWorkOrdersPage" :show-toolbar-actions="false" :list-level-table="false" fill-available-height class="-mt-3">
            <template #controls-prefix>
              <div class="mr-2 inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap">
                <TopTabSwitch
                  v-model="activeWorkOrderTableTab"
                  :tabs="[
                    { id: 'inspection', label: '检测工单', badge: inspectionWorkOrdersTotal },
                    { id: 'repair', label: '报修工单', badge: repairWorkOrdersTotal },
                  ]"
                  tone="default"
                  :collapse-inactive="false"
                />
                <div class="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
              </div>
            </template>

            <template #cell-orderNo="{ row }">
              <div class="inline-flex max-w-full items-baseline gap-1.5">
                <span class="truncate text-foreground">
                  {{ row.workOrderKind === "inspection" ? toDisplayText(row.packageName, "-") : toDisplayText(row.customerName, "-") }}
                </span>
                <span class="shrink-0 text-muted-foreground">
                  #{{ toDisplayText(row.orderNo, "-") }}
                </span>
              </div>
            </template>

            <template #footer>
              <Pagination
                v-model:page="activeWorkOrderTablePageNumProxy"
                :items-per-page="activeWorkOrderTablePageSize"
                :total="activeWorkOrderTableTotal"
                :sibling-count="1"
                :disabled="activeWorkOrderTableLoading"
                show-edges
                class="w-full justify-end"
              >
                <PaginationContent v-slot="{ items }" class="justify-end">
                  <PaginationFirst />
                  <PaginationPrevious />

                  <template
                    v-for="(item, index) in items"
                    :key="`${item.type}-${item.type === 'page' ? item.value : index}`"
                  >
                    <PaginationItem
                      v-if="item.type === 'page'"
                      :value="item.value"
                      :is-active="item.value === activeWorkOrderTablePageNum"
                    >
                      {{ item.value }}
                    </PaginationItem>
                    <PaginationEllipsis v-else />
                  </template>

                  <PaginationNext />
                  <PaginationLast />
                </PaginationContent>
              </Pagination>
            </template>
          </TablePage>
        </div>
      </template>

      <template v-else-if="activeTab === 'monitoring'">
        <CustomerDetailContentLoading v-if="loading" variant="monitoring" />
        <div v-else-if="customer" class="flex min-h-0 flex-1 flex-col">
          <TablePage :page="pagedMonitoringPage" :show-toolbar-actions="false" :list-level-table="false" fill-available-height class="-mt-3">
            <template #footer>
              <Pagination
                v-model:page="monitoringPageNum"
                :items-per-page="monitoringPageSize"
                :total="monitoringPaginationTotal"
                :sibling-count="1"
                :disabled="loading"
                show-edges
                class="w-full justify-end"
              >
                <PaginationContent v-slot="{ items }" class="justify-end">
                  <PaginationFirst />
                  <PaginationPrevious />

                  <template
                    v-for="(item, index) in items"
                    :key="`${item.type}-${item.type === 'page' ? item.value : index}`"
                  >
                    <PaginationItem
                      v-if="item.type === 'page'"
                      :value="item.value"
                      :is-active="item.value === monitoringPageNum"
                    >
                      {{ item.value }}
                    </PaginationItem>
                    <PaginationEllipsis v-else />
                  </template>

                  <PaginationNext />
                  <PaginationLast />
                </PaginationContent>
              </Pagination>
            </template>
          </TablePage>
        </div>
      </template>

      <template v-else-if="activeTab === 'sub-accounts'">
        <CustomerDetailContentLoading v-if="loading || subAccountsLoading" variant="sub-accounts" />
        <div v-else-if="customer" class="flex min-h-0 flex-1 flex-col">
          <Alert v-if="subAccountsErrorMessage" variant="destructive" class="mb-5">
            <AlertTitle>子账号列表接口加载失败</AlertTitle>
            <AlertDescription>{{ subAccountsErrorMessage }}</AlertDescription>
          </Alert>
          <TablePage :page="pagedSubAccountsPage" :show-toolbar-actions="false" :list-level-table="false" fill-available-height class="-mt-3">
            <template #footer>
              <Pagination
                v-model:page="subAccountsPageNum"
                :items-per-page="subAccountsPageSize"
                :total="subAccountsPaginationTotal"
                :sibling-count="1"
                :disabled="subAccountsLoading"
                show-edges
                class="w-full justify-end"
              >
                <PaginationContent v-slot="{ items }" class="justify-end">
                  <PaginationFirst />
                  <PaginationPrevious />

                  <template
                    v-for="(item, index) in items"
                    :key="`${item.type}-${item.type === 'page' ? item.value : index}`"
                  >
                    <PaginationItem
                      v-if="item.type === 'page'"
                      :value="item.value"
                      :is-active="item.value === subAccountsPageNum"
                    >
                      {{ item.value }}
                    </PaginationItem>
                    <PaginationEllipsis v-else />
                  </template>

                  <PaginationNext />
                  <PaginationLast />
                </PaginationContent>
              </Pagination>
            </template>
          </TablePage>
        </div>
      </template>

      <div v-else class="space-y-5 pb-5">
        <CustomerDetailContentLoading v-if="loading" variant="basic-info-primary" />
        <template v-else-if="customer">
          <DetailFieldSections :sections="fieldSections" use-title-block />
        </template>
      </div>
    </template>

    <template #secondary>
      <template v-if="activeTab === 'basic-info' && (loading || customer)">
        <div class="pb-5">
          <Alert v-if="relationErrorMessage" variant="destructive" class="mb-5">
            <AlertTitle>园区/建筑接口加载失败</AlertTitle>
            <AlertDescription>{{ relationErrorMessage }}</AlertDescription>
          </Alert>

          <CustomerDetailContentLoading v-if="loading || relationsLoading" variant="basic-info-secondary" />

          <template v-else-if="customer">
            <DetailAccordionModule :schema="parkBuildingAccordion" use-title-block>
              <template #item-actions="{ item }">
                <div class="flex items-center gap-2">
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
                              ? 'ri-close-circle-fill text-destructive'
                              : row.status === '需重点关注'
                                ? 'ri-time-fill text-warning'
                                : 'ri-checkbox-circle-fill text-success',
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
                        <i class="ri-more-2-line text-[18px]" />
                      </Button>
                    </template>
                  </DetailRelationModule>
                </div>
              </template>
            </DetailAccordionModule>
          </template>

          <TooltipProvider v-if="customer">
            <div class="w-full min-w-0">
              <div class="h-px bg-border/80" />

              <DetailRelationModule :schema="maintenanceModule" use-title-block class="pb-4">
                <template #actions-header>
                  <Button variant="outline" size="sm" class="h-8 px-3 text-sm" @click="showInspectionWorkOrdersTab">
                    查看更多
                  </Button>
                </template>

                <template #inspection-overview-service-cell="{ row }">
                  <div class="flex min-w-0 items-center gap-2 text-foreground">
                        <i
                          :class="[
                            'text-[18px]',
                            row.status === 'pending'
                          ? 'ri-time-fill text-warning'
                          : row.status === 'processing'
                            ? 'ri-loader-4-line text-link'
                            : 'ri-checkbox-circle-fill text-success',
                      ]"
                    />
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <span class="truncate cursor-default">{{ row.serviceName }}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" class="rounded-lg px-3 py-1.5 text-xs">
                        {{ row.serviceTooltip }}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </template>

                <template #executor="{ row }">
                  <div class="flex w-full min-w-0 items-center justify-center">
                    <TooltipWrap :content="buildExecutorTooltip(row.executors)" :disabled="!row.executors.length" align="center" class="max-w-sm">
                      <span class="block min-w-0 max-w-full truncate">
                        {{ formatExecutorSummary(row.executors) }}
                      </span>
                    </TooltipWrap>
                  </div>
                </template>

                <template #maintenance-action-cell="{ row }">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    @click="handleOverviewWorkOrderDetail(row)"
                  >
                    <i class="ri-more-2-line text-[18px]" />
                  </Button>
                </template>
              </DetailRelationModule>

              <div class="h-px bg-border/80" />

              <DetailRelationModule :schema="repairOverviewModule" use-title-block>
                <template #actions-header>
                  <Button variant="outline" size="sm" class="h-8 px-3 text-sm" @click="showRepairWorkOrdersTab">
                    查看更多
                  </Button>
                </template>

                <template #repair-overview-location-cell="{ row }">
                  <div class="flex min-w-0 items-center gap-2 text-foreground">
                        <i
                          :class="[
                            'text-[18px]',
                            row.status === 'pending'
                          ? 'ri-time-fill text-warning'
                          : row.status === 'processing'
                            ? 'ri-loader-4-line text-link'
                            : 'ri-checkbox-circle-fill text-success',
                      ]"
                    />
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <span class="truncate cursor-default">{{ row.location }}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" class="rounded-lg px-3 py-1.5 text-xs">
                        {{ row.parkName }}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </template>

                <template #repair-overview-deadline-cell="{ row }">
                  <Tooltip v-if="hasExplicitTime(row.deadlineFull)">
                    <TooltipTrigger as-child>
                      <span class="cursor-default">{{ row.deadline }}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" class="rounded-lg px-3 py-1.5 text-xs">
                      {{ row.deadlineFull }}
                    </TooltipContent>
                  </Tooltip>
                  <span v-else>{{ row.deadline }}</span>
                </template>

                <template #executor="{ row }">
                  <div class="flex w-full min-w-0 items-center justify-center">
                    <TooltipWrap :content="buildExecutorTooltip(row.executors)" :disabled="!row.executors.length" align="center" class="max-w-sm">
                      <span class="block min-w-0 max-w-full truncate">
                        {{ formatExecutorSummary(row.executors) }}
                      </span>
                    </TooltipWrap>
                  </div>
                </template>

                <template #maintenance-action-cell="{ row }">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    @click="handleOverviewWorkOrderDetail(row)"
                  >
                    <i class="ri-more-2-line text-[18px]" />
                  </Button>
                </template>
              </DetailRelationModule>
            </div>
          </TooltipProvider>
        </div>
      </template>
    </template>
  </DetailLayout>

  <Dialog v-model:open="assignDialogOpen">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>指派工单</DialogTitle>
        <DialogDescription>
          {{ isInspectionAssignDialog ? "请选择一位或多位执行人并确认提交。" : "请选择要指派的用户并确认提交。" }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="isInspectionAssignDialog" class="space-y-4">
        <p class="text-sm text-foreground">执行人</p>
        <Select v-model="assignUserUuids" multiple :disabled="assignableUsersLoading || assignSubmitting">
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="assignableUsersLoading ? '正在加载用户...' : '请选择执行人，可多选'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="user in assignableUsers" :key="user.uuid" :value="user.uuid">
              {{ user.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div v-else class="space-y-2">
        <p class="text-sm text-foreground">指派用户</p>
        <Select v-model="assignUserUuid" :disabled="assignableUsersLoading || assignSubmitting">
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="assignableUsersLoading ? '正在加载用户...' : '请选择用户'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="user in assignableUsers" :key="user.uuid" :value="user.uuid">
              {{ user.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" class="gap-2" :disabled="assignSubmitting" @click="closeAssignDialog">
          <i class="ri-close-line text-sm" />
          取消
        </Button>
        <Button type="button" class="gap-2" :disabled="!canSubmitAssign" @click="submitCustomerWorkOrderAssign">
          <i
            :class="assignSubmitting ? 'ri-loader-4-line animate-spin text-sm' : 'ri-send-plane-line text-sm'"
          />
          {{ assignSubmitting ? "提交中..." : "确认指派" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog :open="subAccountCreateDialogOpen" @update:open="handleSubAccountCreateDialogOpenChange">
      <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>添加子账号</DialogTitle>
        <DialogDescription>
          请填写子账号信息，创建后可用于登录系统。
        </DialogDescription>
      </DialogHeader>

      <form class="grid gap-4" @submit.prevent="submitSubAccountCreate">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="sub-account-create-name">用户名</label>
            <Input
              id="sub-account-create-name"
              v-model="subAccountCreateForm.name"
              :disabled="subAccountCreateSubmitting"
              placeholder="请输入用户名"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="sub-account-create-account">账号</label>
            <Input
              id="sub-account-create-account"
              v-model="subAccountCreateForm.account"
              :disabled="subAccountCreateSubmitting"
              placeholder="请输入账号"
            />
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="sub-account-create-password">密码</label>
            <Input
              id="sub-account-create-password"
              v-model="subAccountCreateForm.password"
              :disabled="subAccountCreateSubmitting"
              type="password"
              placeholder="请输入密码"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground" for="sub-account-create-phone">手机号</label>
            <Input
              id="sub-account-create-phone"
              v-model="subAccountCreateForm.phone"
              :disabled="subAccountCreateSubmitting"
              placeholder="请输入手机号"
            />
          </div>
        </div>

        <DialogFooter class="pt-2">
          <Button type="button" variant="outline" :disabled="subAccountCreateSubmitting" @click="closeSubAccountCreateDialog">
            取消
          </Button>
          <Button type="submit" :disabled="!canSubmitSubAccountCreate">
            {{ subAccountCreateSubmitting ? "创建中..." : "添加子账号" }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <ResponsiveRightSheet
    :open="workOrderDetailSheetOpen"
    sheet-content-class="overflow-hidden sm:max-w-xl"
    :show-primary="Boolean(activeWorkOrderDetailKind === 'repair' ? activeRepairWorkOrderDetail?.Uuid : activeInspectionWorkOrderDetail?.Uuid)"
    @update:open="handleWorkOrderDetailSheetOpenChange"
    @footer-primary="goToWorkOrderFullDetail"
  >
    <template #actions>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-1">
          <TooltipWrap content="关闭工单详情" side="right">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              @click="handleWorkOrderDetailSheetOpenChange(false)"
            >
              <i class="ri-arrow-right-double-line text-[16px]" />
              <span class="sr-only">关闭工单详情</span>
            </Button>
          </TooltipWrap>
          <TooltipWrap
            v-if="activeWorkOrderDetailKind === 'repair' ? activeRepairWorkOrderDetail?.Uuid : activeInspectionWorkOrderDetail?.Uuid"
            content="打开完整工单详情页"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              @click="goToWorkOrderFullDetail"
            >
              <i class="ri-fullscreen-line text-[16px]" />
              <span class="sr-only">打开完整工单详情页</span>
            </Button>
          </TooltipWrap>
        </div>
      </div>
    </template>
    <template #title>{{ workOrderDetailSheetTitle }}</template>

    <div class="space-y-5 overflow-y-auto">
      <Alert v-if="workOrderDetailErrorMessage" variant="destructive" class="mb-4">
        <AlertTitle>工单详情接口加载失败</AlertTitle>
        <AlertDescription>{{ workOrderDetailErrorMessage }}</AlertDescription>
      </Alert>

      <div v-if="workOrderDetailLoading" class="space-y-5">
        <DetailFieldsSkeleton :sections="2" :rows-per-section="4" />
        <DetailFieldsSkeleton
          :sections="activeWorkOrderDetailKind === 'repair' ? 1 : 2"
          :rows-per-section="3"
        />
      </div>

      <template v-else-if="activeWorkOrderDetailKind === 'repair' ? activeRepairWorkOrderDetail : activeInspectionWorkOrderDetail">
        <DetailFieldSections :sections="workOrderDetailPrimarySections" />
        <DetailFieldSections :sections="workOrderDetailSecondarySections" />
      </template>
    </div>
  </ResponsiveRightSheet>

  <ResponsiveRightSheet
    :open="parkDetailSheetOpen"
    sheet-content-class="overflow-hidden sm:max-w-xl"
    :show-primary="Boolean(activeParkDetail?.Uuid)"
    @update:open="handleParkDetailSheetOpenChange"
    @footer-primary="handleParkDetailSheetFooterPrimary"
  >
    <template #actions>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-1">
          <TooltipWrap content="关闭园区详情" side="right">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              @click="handleParkDetailSheetOpenChange(false)"
            >
              <i class="ri-arrow-right-double-line text-[16px]" />
              <span class="sr-only">关闭园区详情</span>
            </Button>
          </TooltipWrap>
          <TooltipWrap v-if="activeParkDetail?.Uuid" content="打开完整园区详情页">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              @click="goToParkFullDetail(activeParkDetail.Uuid, activeParkDetail.CustomerUuid || customer?.Uuid || '')"
            >
              <i class="ri-fullscreen-line text-[16px]" />
              <span class="sr-only">打开完整园区详情页</span>
            </Button>
          </TooltipWrap>
        </div>
        <div v-if="activeParkDetail?.Uuid" class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1 rounded-md text-destructive hover:bg-destructive/5 hover:text-destructive"
            :disabled="parkDeleteSubmitting"
            @click="promptDeletePark"
          >
            <i
              :class="parkDeleteSubmitting ? 'ri-loader-4-line animate-spin text-base' : 'ri-delete-bin-line text-base'"
            />
            {{ parkDeleteSubmitting ? "删除中..." : "删除园区" }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1 rounded-md"
            :disabled="parkDeleteSubmitting"
            @click="goToParkEdit(activeParkDetail.Uuid, activeParkDetail.CustomerUuid || customer?.Uuid || '')"
          >
            <i class="ri-edit-line text-base" />
            编辑园区
          </Button>
        </div>
      </div>
    </template>
    <template #title>{{ toDisplayText(activeParkDetail?.Name, "园区详情") }}</template>

    <div class="overflow-y-auto">
      <Alert v-if="parkDetailErrorMessage" variant="destructive" class="mb-4">
        <AlertTitle>园区详情接口加载失败</AlertTitle>
        <AlertDescription>{{ parkDetailErrorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton
        v-if="parkDetailLoading"
        :sections="1"
        :rows-per-section="6"
      />

      <DetailFieldSections v-else-if="activeParkDetail" :sections="parkDetailSheetSections" />
    </div>
  </ResponsiveRightSheet>

  <MapLocationDialog
    v-model:open="parkMapDialogOpen"
    title="园区位置"
    sheet-address-context
    :latitude="activeParkDetail?.Latitude ?? ''"
    :longitude="activeParkDetail?.Longitude ?? ''"
  />

  <AlertDialog :open="parkDeleteConfirmOpen" @update:open="parkDeleteConfirmOpen = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除园区？</AlertDialogTitle>
        <AlertDialogDescription>
          将删除“{{ toDisplayText(activeParkDetail?.Name, "当前园区") }}”，该操作不可撤销，确认后将立即提交删除请求。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="parkDeleteSubmitting" class="gap-2">
          <i class="ri-close-line text-base" />
          取消
        </AlertDialogCancel>
        <AlertDialogAction
          class="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40"
          :disabled="parkDeleteSubmitting"
          @click="confirmDeletePark"
        >
          <i
            :class="parkDeleteSubmitting ? 'ri-loader-4-line animate-spin text-base' : 'ri-delete-bin-line text-base'"
          />
          {{ parkDeleteSubmitting ? "删除中..." : "确认删除" }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <BuildingDetailSheet
    :open="buildingDetailSheetOpen"
    :building-uuid="activeBuildingUuid"
    :park-uuid="activeBuildingParkUuid"
    :customer-uuid="customerUuid"
    @update:open="handleBuildingDetailSheetOpenChange"
    @deleted="handleBuildingDeleted"
  />

  <ExportTableDialog
    :open="activeTableExportDialogOpen"
    :table-title="activeTableTitle"
    :selected-rows-count="activeTablePage?.selectedRowsCount.value ?? 0"
    :current-page-rows-count="activeTablePage?.currentPageRowsCount.value ?? 0"
    :filtered-rows-count="activeTablePage?.filteredRowsCount.value ?? 0"
    :total-rows-count="activeTablePage?.totalRowsCount.value ?? 0"
    :current-filters-summary="activeTablePage?.activeFilterSummary.value ?? []"
    :is-exporting="activeTableExporting"
    :available-formats="activeTableAvailableExportFormats"
    @update:open="activeTableExportDialogOpen = $event"
    @confirm="handleActiveTableExportConfirm"
  />
</template>
