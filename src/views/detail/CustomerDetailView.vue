<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import BuildingDetailSheet from "@/components/detail/BuildingDetailSheet.vue"
import DetailAccordionModule from "@/components/detail/DetailAccordionModule.vue"
import DetailTabActionsGroup from "@/components/detail/DetailTabActionsGroup.vue"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import CustomerDetailContentLoading from "@/components/loading/CustomerDetailContentLoading.vue"
import ExportTableDialog from "@/components/table-page/ExportTableDialog.vue"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import TablePage from "@/components/table-page/TablePage.vue"
import SortPopover, { type SortRule } from "@/components/table-page/TableSortPopover.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import {
  exportTableData,
  SUPPORTED_TABLE_EXPORT_FORMATS,
  type TableExportFormat,
  type TableExportScope,
} from "@/components/table-page/export-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import { useDetailRouteTab } from "@/composables/useDetailRouteTab"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { readCustomerSubAccountLocalRecords } from "@/lib/customer-sub-accounts-api"
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
  orderNo: string
  planName: string
  packageName: string
  customerName: string
  deadline: string
  executor: string
  statusValue: number | null
  statusLabel: string
  score: number | null
  scoreLabel: string
  resultValue: number | null
  resultLabel: string
  remark: string
  createdAt: string
  updatedAt: string
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
  username: string
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
  addMonitoring: boolean
  addSubAccount: boolean
  editCustomer: boolean
  back: boolean
}

const route = useRoute()
const router = useRouter()
const customerDetailTabIds = ["basic-info", "building-assets", "work-orders", "monitoring", "sub-accounts"] as const

const customer = ref<CustomerDetailResult | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const deleteSubmitting = ref(false)
const deleteConfirmOpen = ref(false)
const relationsLoading = ref(false)
const relationErrorMessage = ref("")
const parkBuildingGroups = ref<ParkBuildingGroup[]>([])
const buildingAssets = ref<CustomerBuildingAssetRow[]>([])
const buildingAssetsLoading = ref(false)
const buildingAssetsErrorMessage = ref("")
const workOrders = ref<CustomerWorkOrderRow[]>([])
const workOrdersPageNum = ref(1)
const workOrdersPageSize = ref(10)
const workOrdersTotal = ref(0)
const parkDetailSheetOpen = ref(false)
const parkDetailLoading = ref(false)
const parkDetailErrorMessage = ref("")
const activeParkDetail = ref<ParkDetailResult | null>(null)
const buildingDetailSheetOpen = ref(false)
const activeBuildingUuid = ref("")
const activeBuildingParkUuid = ref("")
let latestRequestId = 0
let latestRelationsRequestId = 0
let latestBuildingAssetsRequestId = 0
let latestParkDetailRequestId = 0

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
const detailTabActionsByTab: Record<CustomerDetailTab, CustomerDetailTabActions> = {
  "basic-info": {
    deleteCustomer: true,
    addPark: false,
    addBuilding: false,
    addMonitoring: false,
    addSubAccount: false,
    editCustomer: true,
    back: false,
  },
  "building-assets": {
    deleteCustomer: false,
    addPark: true,
    addBuilding: true,
    addMonitoring: false,
    addSubAccount: false,
    editCustomer: false,
    back: false,
  },
  "work-orders": {
    deleteCustomer: false,
    addPark: false,
    addBuilding: false,
    addMonitoring: false,
    addSubAccount: false,
    editCustomer: false,
    back: false,
  },
  monitoring: {
    deleteCustomer: false,
    addPark: false,
    addBuilding: false,
    addMonitoring: true,
    addSubAccount: false,
    editCustomer: false,
    back: false,
  },
  "sub-accounts": {
    deleteCustomer: false,
    addPark: false,
    addBuilding: false,
    addMonitoring: false,
    addSubAccount: true,
    editCustomer: false,
    back: false,
  },
}
const activeDetailTabActions = computed(() => detailTabActionsByTab[activeTab.value])
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
  "inline-flex size-8 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground active:bg-surface-secondary"
const detailToolbarButtonActiveClass =
  "bg-transparent text-link hover:bg-surface-tertiary active:bg-surface-secondary"
const pagedWorkOrders = computed(() => {
  const start = (workOrdersPageNum.value - 1) * workOrdersPageSize.value
  const end = start + workOrdersPageSize.value
  return workOrders.value.slice(start, end)
})
const activeTablePage = computed(() => (
  activeTab.value === "building-assets"
    ? buildingAssetsPage
    : activeTab.value === "work-orders"
      ? workOrdersPage
      : activeTab.value === "monitoring"
        ? monitoringPage
        : activeTab.value === "sub-accounts"
          ? subAccountsPage
          : null
))
const activeTableTitle = computed(() => (
  activeTab.value === "building-assets"
    ? "建筑资产"
    : activeTab.value === "work-orders"
      ? "工单列表"
      : activeTab.value === "monitoring"
        ? "监控"
        : "子账号"
))
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
      width: "fill",
      variant: "note",
      format: "note",
      tone: "muted",
      cellRenderer: { kind: "note" },
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

const workOrdersSchema: TablePageSchema<CustomerWorkOrderRow> = {
  title: "",
  description: "",
  rowKey: "uuid",
  data: [],
  showIndex: true,
  stickyHeader: true,
  wrapperClass: "rounded-none border-0 shadow-none",
  emptyState: {
    title: "暂无工单数据",
    description: "当前客户下暂无可展示的工单。",
    icon: "ri-file-list-3-line",
  },
  columns: [
    {
      key: "orderNo",
      label: "工单编号",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        placeholder: "输入工单编号",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "planName",
      label: "计划名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入计划名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "packageName",
      label: "套餐名称",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入套餐名称",
      },
      sort: true,
    },
    {
      key: "deadline",
      label: "截止时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        defaultVisible: true,
        value: row => extractDatePart(row.deadline),
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
      key: "resultLabel",
      label: "结果",
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
      key: "updatedAt",
      label: "更新时间",
      filterType: "time",
      format: "numeric",
      filter: {
        type: "date",
        value: row => extractDatePart(row.updatedAt),
      },
      sort: true,
    },
    {
      key: "remark",
      label: "备注",
      filterType: "none",
      variant: "note",
      format: "note",
      tone: "muted",
      width: "fill",
      cellRenderer: { kind: "note" },
    },
  ],
  filters: [
    {
      key: "在页面中",
      label: "在页面中",
      type: "text",
      fixed: true,
      placeholder: "输入页面内筛选条件",
      value: row => buildWorkOrdersFilterText(row),
    },
  ],
  sort: {
    storageKey: "customer-detail-work-orders-sort-preferences",
    initialField: "updatedAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "none",
  },
}

const monitoringRows = computed<MonitoringRow[]>(() => customer.value ? buildMockMonitoringRows(customer.value) : [])

const subAccountRows = computed<SubAccountRow[]>(() => customer.value ? buildMockSubAccounts(customer.value) : [])

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
      key: "username",
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
      key: "account",
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
      key: "password",
      label: "密码",
      filterType: "text",
      filter: {
        type: "text",
        placeholder: "输入密码",
      },
      sort: true,
    },
    {
      key: "phone",
      label: "手机号",
      filterType: "text",
      width: "fill",
      filter: {
        type: "text",
        placeholder: "输入手机号",
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
      value: row => `${row.username} ${row.account} ${row.password} ${row.phone}`,
    },
  ],
  sort: {
    storageKey: "customer-detail-sub-accounts-sort-preferences",
    initialField: "username",
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

const workOrdersPage = useTablePage({
  ...createTablePageDefinition(workOrdersSchema),
  rows: pagedWorkOrders,
})

const monitoringPage = useTablePage({
  ...createTablePageDefinition(monitoringSchema),
  rows: monitoringRows,
})

const subAccountsPage = useTablePage({
  ...createTablePageDefinition(subAccountsSchema),
  rows: subAccountRows,
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
  workOrders.value = current ? buildMockWorkOrders(current) : []
  workOrdersTotal.value = workOrders.value.length
})

watch(customerUuid, (uuid) => {
  buildingAssets.value = []
  buildingAssetsErrorMessage.value = ""
  workOrders.value = []
  workOrdersTotal.value = 0
  workOrdersPageNum.value = 1
  void loadCustomerDetail(uuid)
  void loadBuildingAssets(uuid)
  void loadParkBuildings(uuid)
}, { immediate: true })

watch(workOrdersPageSize, () => {
  workOrdersPageNum.value = 1
})

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

  router.push({
    name: "customer-sub-account-create",
    params: { id: customerUuid.value },
    query: {
      customerName: toDisplayText(customer.value?.CorpName, "当前客户"),
    },
  })
}

function handleResetSubAccountPassword(row: SubAccountRow) {
  toast.info(`重置子账号「${row.username}」密码功能暂未接入`)
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

    buildingAssets.value = list.map(item => mapBuildingAssetRow(item, uuid))
  } catch (error) {
    if (requestId !== latestBuildingAssetsRequestId) {
      return
    }

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

function buildWorkOrdersFilterText(row: CustomerWorkOrderRow) {
  return [
    row.orderNo,
    row.planName,
    row.packageName,
    row.customerName,
    row.deadline,
    row.executor,
    row.statusLabel,
    row.scoreLabel,
    row.resultLabel,
    row.remark,
    row.createdAt,
    row.updatedAt,
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

function buildMockWorkOrders(current: CustomerDetailResult): CustomerWorkOrderRow[] {
  const customerName = toDisplayText(current.CorpName, "当前客户")
  const packageInfo = getCustomerPackageMockRecord(current)
  const packageName = packageInfo?.packageName ?? "消防巡检标准套餐"
  const customerId = customerUuid.value || "customer"

  return [
    createMockWorkOrder(customerId, 1, customerName, packageName, "消防泵房月检", "王工", 1, 82, 1, "待客户安排进场时间。", "2026-03-19 10:20"),
    createMockWorkOrder(customerId, 2, customerName, packageName, "配电室温感排查", "刘洋", 2, 88, 1, "已完成首轮排查，等待复核。", "2026-03-20 15:40"),
    createMockWorkOrder(customerId, 3, customerName, packageName, "电梯机房巡检", "陈峰", 3, 91, 1, "运行中发现轻微异响，持续观察。", "2026-03-21 09:15"),
    createMockWorkOrder(customerId, 4, customerName, packageName, "排烟系统复检", "赵敏", 5, 95, 1, "复检通过。", "2026-03-22 11:05"),
    createMockWorkOrder(customerId, 5, customerName, packageName, "应急照明抽检", "李凯", 4, 79, 2, "报告生成中，存在局部异常。", "2026-03-23 16:50"),
    createMockWorkOrder(customerId, 6, customerName, packageName, "消防栓水压测试", "孙涛", 5, 97, 1, "数据正常，已结单。", "2026-03-24 08:30"),
    createMockWorkOrder(customerId, 7, customerName, packageName, "疏散指示灯巡检", "王工", 2, 84, 1, "等待夜间联调。", "2026-03-24 17:40"),
    createMockWorkOrder(customerId, 8, customerName, packageName, "喷淋系统抽检", "刘洋", 3, 86, 2, "局部点位需二次确认。", "2026-03-25 13:10"),
    createMockWorkOrder(customerId, 9, customerName, packageName, "防火门闭门器检查", "陈峰", 1, null, 0, "待派单。", "2026-03-25 19:25"),
    createMockWorkOrder(customerId, 10, customerName, packageName, "联动控制柜核验", "赵敏", 4, 90, 1, "等待报告归档。", "2026-03-26 09:00"),
    createMockWorkOrder(customerId, 11, customerName, packageName, "末端试水装置检查", "李凯", 5, 93, 1, "已完成。", "2026-03-26 15:35"),
    createMockWorkOrder(customerId, 12, customerName, packageName, "火灾报警主机巡检", "孙涛", 3, 87, 2, "告警日志需继续排查。", "2026-03-27 10:55"),
  ]
}

function createMockWorkOrder(
  customerId: string,
  index: number,
  customerName: string,
  packageName: string,
  planName: string,
  executor: string,
  statusValue: number | null,
  score: number | null,
  resultValue: number | null,
  remark: string,
  updatedAt: string,
): CustomerWorkOrderRow {
  const orderNo = `WO-${customerId.slice(0, 6).toUpperCase()}-${String(index).padStart(4, "0")}`
  const createdAt = shiftDateTime(updatedAt, -2)
  const deadline = shiftDateTime(updatedAt, 3)

  return {
    id: `${customerId}-work-order-${index}`,
    uuid: `${customerId}-work-order-${index}`,
    orderNo,
    planName,
    packageName,
    customerName,
    deadline,
    executor,
    statusValue,
    statusLabel: formatWorkOrderStatus(statusValue),
    score,
    scoreLabel: formatWorkOrderScore(score),
    resultValue,
    resultLabel: formatWorkOrderResult(resultValue),
    remark,
    createdAt,
    updatedAt,
  }
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

function buildMockSubAccounts(current: CustomerDetailResult): SubAccountRow[] {
  const customerName = toDisplayText(current.CorpName, "customer")
  const customerCode = customerUuid.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toLowerCase() || "cust"
  const accountPrefix = toPinyinAccountPrefix(customerName)
  const defaultRows = [
    createMockSubAccount(customerCode, 1, "张晓晨", `${accountPrefix}_ops`, "Bg@2026!ops", "13800138001"),
    createMockSubAccount(customerCode, 2, "李雨桐", `${accountPrefix}_maint`, "Bg@2026!mt", "13800138002"),
    createMockSubAccount(customerCode, 3, "王志远", `${accountPrefix}_monitor`, "Bg@2026!mon", "13800138003"),
  ]
  const localRows = readCustomerSubAccountLocalRecords(customerUuid.value).map(record => ({
    id: record.id,
    username: record.username,
    account: record.account,
    password: record.password,
    phone: record.phone,
  }))

  if (!localRows.length) {
    return defaultRows
  }

  const mergedRows = [...localRows]

  for (const row of defaultRows) {
    if (!mergedRows.some(item => item.account === row.account)) {
      mergedRows.push(row)
    }
  }

  return mergedRows
}

function createMockSubAccount(
  customerCode: string,
  index: number,
  username: string,
  account: string,
  password: string,
  phone: string,
): SubAccountRow {
  return {
    id: `${customerCode}-sub-account-${index}`,
    username,
    account,
    password,
    phone,
  }
}

function toPinyinAccountPrefix(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "subaccount"
}

function shiftDateTime(value: string, offsetDays: number) {
  const date = new Date(value.replace(" ", "T"))

  if (Number.isNaN(date.getTime())) {
    return value
  }

  date.setDate(date.getDate() + offsetDays)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day} ${hours}:${minutes}`
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
              <i class="ri-more-line text-base" />
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
              class="h-8 gap-1 border-destructive/30 bg-background px-3 text-[14px] font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
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
            v-if="activeDetailTabActions.addPark"
            variant="outline"
            size="sm"
            class="h-8 gap-1 border-border/80 bg-background px-3 text-[14px] font-medium text-foreground shadow-none"
            @click="goToCreatePark"
          >
            <i class="ri-add-line text-base" />
            添加园区
          </Button>
          <Button
            v-if="activeDetailTabActions.addBuilding"
            variant="outline"
            size="sm"
            class="h-8 gap-1 border-border/80 bg-background px-3 text-[14px] font-medium text-foreground shadow-none"
            @click="handleAddBuilding"
          >
            <i class="ri-building-line text-base" />
            添加建筑
          </Button>
          <Button
            v-if="activeDetailTabActions.addMonitoring"
            variant="outline"
            size="sm"
            class="h-8 gap-1 border-border/80 bg-background px-3 text-[14px] font-medium text-foreground shadow-none"
            @click="handleAddMonitoring"
          >
            <i class="ri-radar-line text-base" />
            添加监控
          </Button>
          <Button
            v-if="activeDetailTabActions.addSubAccount"
            variant="outline"
            size="sm"
            class="h-8 gap-1 border-border/80 bg-background px-3 text-[14px] font-medium text-foreground shadow-none"
            @click="handleAddSubAccount"
          >
            <i class="ri-user-add-line text-base" />
            添加子账号
          </Button>
          <Button
            v-if="activeDetailTabActions.editCustomer"
            variant="outline"
            size="sm"
            class="h-8 gap-1 border-border/80 bg-background px-3 text-[14px] font-medium text-foreground shadow-none"
            @click="goToCustomerEdit"
          >
            <i class="ri-edit-line text-base" />
            修改客户信息
          </Button>
          <Button
            v-if="activeDetailTabActions.back"
            variant="outline"
            size="sm"
            class="h-8 gap-1 border-border/80 bg-background px-3 text-[14px] font-medium text-foreground shadow-none"
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
        <div class="flex min-h-0 flex-1 flex-col pb-5">
          <Alert v-if="buildingAssetsErrorMessage" variant="destructive" class="mb-5">
            <AlertTitle>建筑资产接口加载失败</AlertTitle>
            <AlertDescription>{{ buildingAssetsErrorMessage }}</AlertDescription>
          </Alert>

          <CustomerDetailContentLoading v-if="loading || buildingAssetsLoading" variant="building-assets" />
          <TablePage v-else-if="customer" :page="buildingAssetsPage" :show-toolbar-actions="false" class="-mt-3 sm:-mx-4 xl:-mx-8" />
        </div>
      </template>

      <template v-else-if="activeTab === 'work-orders'">
        <CustomerDetailContentLoading v-if="loading" variant="work-orders" />
        <div v-else-if="customer" class="flex min-h-0 flex-1 flex-col pb-5">
          <TablePage :page="workOrdersPage" :show-toolbar-actions="false" class="-mt-3 sm:-mx-4 xl:-mx-8" />

          <div class="mt-auto flex items-center justify-end gap-3 px-4 pt-4 sm:px-0">
            <span class="text-sm text-muted-foreground">
              第 {{ workOrdersPageNum }} / {{ Math.max(1, Math.ceil(workOrdersTotal / workOrdersPageSize)) }} 页，共 {{ workOrdersTotal }} 条
            </span>
            <Button
              variant="outline"
              size="sm"
              :disabled="workOrdersPageNum <= 1"
              @click="workOrdersPageNum -= 1"
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="workOrdersPageNum >= Math.max(1, Math.ceil(workOrdersTotal / workOrdersPageSize))"
              @click="workOrdersPageNum += 1"
            >
              下一页
            </Button>
          </div>
        </div>
      </template>

      <template v-else-if="activeTab === 'monitoring'">
        <CustomerDetailContentLoading v-if="loading" variant="monitoring" />
        <div v-else-if="customer" class="flex min-h-0 flex-1 flex-col pb-5">
          <TablePage :page="monitoringPage" :show-toolbar-actions="false" class="-mt-3 sm:-mx-4 xl:-mx-8" />
        </div>
      </template>

      <template v-else-if="activeTab === 'sub-accounts'">
        <CustomerDetailContentLoading v-if="loading" variant="sub-accounts" />
        <div v-else-if="customer" class="flex min-h-0 flex-1 flex-col pb-5">
          <TablePage :page="subAccountsPage" :show-toolbar-actions="false" class="-mt-3 sm:-mx-4 xl:-mx-8" />
        </div>
      </template>

      <div v-else class="space-y-5 pb-5">
        <CustomerDetailContentLoading v-if="loading" variant="basic-info-primary" />
        <DetailFieldSections v-else-if="customer" :sections="fieldSections" />
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

          <template v-else-if="customer && parkBuildingGroups.length">
            <DetailAccordionModule :schema="parkBuildingAccordion">
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
            v-else-if="customer"
            class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground"
          >
            暂无园区和建筑数据。
          </div>

          <div v-if="customer" class="my-5 h-px bg-border/80" />

          <DetailRelationModule v-if="customer" :schema="maintenanceModule">
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
    <SheetContent side="right" class="overflow-y-auto max-sm:w-[calc(100vw-1rem)] sm:max-w-xl">
      <SheetHeader>
        <template #actions>
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-1">
              <SheetClose
                class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              >
                <i class="ri-arrow-right-double-line text-[16px]" />
                <span class="sr-only">关闭园区详情</span>
              </SheetClose>
              <button
                v-if="activeParkDetail?.Uuid"
                type="button"
                class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                @click="goToParkFullDetail(activeParkDetail.Uuid, activeParkDetail.CustomerUuid || customer?.Uuid || '')"
              >
                <i class="ri-fullscreen-line text-[16px]" />
                <span class="sr-only">打开完整园区详情页</span>
              </button>
            </div>
            <Button
              v-if="activeParkDetail?.Uuid"
              variant="outline"
              size="sm"
              class="h-8 rounded-md"
              @click="goToParkEdit(activeParkDetail.Uuid, activeParkDetail.CustomerUuid || customer?.Uuid || '')"
            >
              编辑园区
            </Button>
          </div>
        </template>
        <SheetTitle>{{ toDisplayText(activeParkDetail?.Name, "园区详情") }}</SheetTitle>
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

  <BuildingDetailSheet
    :open="buildingDetailSheetOpen"
    :building-uuid="activeBuildingUuid"
    :park-uuid="activeBuildingParkUuid"
    :customer-uuid="customerUuid"
    @update:open="handleBuildingDetailSheetOpenChange"
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
