<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from "vue"
import { useRoute, useRouter, type LocationQueryValue } from "vue-router"
import { toast } from "vue-sonner"

import BuildingDetailSheet from "@/components/detail/BuildingDetailSheet.vue"
import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import FilterChip from "@/components/table-page/TableFilterChip.vue"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchCustomers } from "@/lib/customers-api"
import { primeParkCustomerCache, resolveParkCustomerMap } from "@/lib/park-customer-cache"
import { fetchParks } from "@/lib/parks-api"

type BuildingRecord = {
  id: string
  uuid: string
  parkUuid: string
  parkName: string
  customerUuid: string
  customerName: string
  customerLoading: boolean
  buildingName: string
  builtTime: string
  operationTime: string
  buildingArea: string
  buildingAreaValue: number | null
  contactName: string
  contactPhone: string
  address: string
  updatedAt: string
}

type LinkedDetailSheetKind = "customer" | "park"

type FilterOption = {
  uuid: string
  name: string
}

const buildings = ref<BuildingRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
const activeLinkedDetailKind = ref<LinkedDetailSheetKind | null>(null)
const activeLinkedDetailUuid = ref("")
const activeLinkedDetailCustomerUuid = ref("")
const buildingDetailSheetOpen = ref(false)
const activeBuildingSheetUuid = ref("")
const activeBuildingSheetParkUuid = ref("")
const customerOptions = ref<FilterOption[]>([])
const customerOptionsLoading = ref(false)
const parkOptions = ref<FilterOption[]>([])
const parkOptionsLoading = ref(false)
const draftName = ref("")
const appliedName = ref("")
const selectedCustomerUuids = ref<string[]>([])
const selectedParkUuids = ref<string[]>([])
const sortDirection = ref<"asc" | "desc">("desc")
const expandedControl = ref<"name" | "customer" | "park" | null>(null)
const customerSelectOpen = ref(false)
const parkSelectOpen = ref(false)
const filterControlsRef = ref<HTMLElement | null>(null)
const nameMeasureRef = ref<ComponentPublicInstance | HTMLElement | null>(null)
const customerMeasureRef = ref<ComponentPublicInstance | HTMLElement | null>(null)
const parkMeasureRef = ref<ComponentPublicInstance | HTMLElement | null>(null)
const collapsedNameWidth = ref(102)
const collapsedCustomerWidth = ref(96)
const collapsedParkWidth = ref(96)
const initialized = ref(false)
let latestRequestId = 0
let nameDebounceTimer: ReturnType<typeof setTimeout> | null = null
let suppressFilterSideEffects = false
let syncingRoute = false
let collapsedChipResizeObserver: ResizeObserver | null = null

const router = useRouter()
const route = useRoute()
const customerSelectLabel = computed(() => {
  return buildMultiSelectLabel(selectedCustomerUuids.value, customerOptions.value, {
    placeholder: customerOptionsLoading.value ? "正在加载客户..." : "请选择客户",
    unit: "个客户",
  })
})
const parkSelectLabel = computed(() => {
  return buildMultiSelectLabel(selectedParkUuids.value, parkOptions.value, {
    placeholder: parkOptionsLoading.value ? "正在加载园区..." : "请选择园区",
    unit: "个园区",
  })
})
const canResetFilters = computed(() => {
  return Boolean(draftName.value || selectedCustomerUuids.value.length || selectedParkUuids.value.length)
})
const nameTriggerLabel = computed(() => {
  const value = appliedName.value.trim()
  return value ? `建筑名称：${value}` : "建筑名称"
})
const customerTriggerLabel = computed(() => {
  const value = buildMultiSelectLabel(selectedCustomerUuids.value, customerOptions.value, {
    placeholder: "",
    unit: "个客户",
  })

  return value ? `所属客户：${value}` : "所属客户"
})
const parkTriggerLabel = computed(() => {
  const value = buildMultiSelectLabel(selectedParkUuids.value, parkOptions.value, {
    placeholder: "",
    unit: "个园区",
  })

  return value ? `所属园区：${value}` : "所属园区"
})
const nameControlWidth = computed(() => {
  return expandedControl.value === "name" ? 248 : collapsedNameWidth.value
})
const customerControlWidth = computed(() => {
  return expandedControl.value === "customer" ? 248 : collapsedCustomerWidth.value
})
const parkControlWidth = computed(() => {
  return expandedControl.value === "park" ? 248 : collapsedParkWidth.value
})
const usesClientSideAggregation = computed(() => {
  return selectedCustomerUuids.value.length > 1 || selectedParkUuids.value.length > 1
})

const schema: TablePageSchema<BuildingRecord> = {
  title: "建筑",
  description: "查看所有建筑的检测情况，了解评分、状态和存在的问题",
  rowKey: "uuid",
  data: [],
  primaryActionLabel: "添加建筑",
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无建筑数据",
    description: "当前还没有可展示的建筑资产。",
    icon: "ri-building-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: row => {
        if (!row.parkUuid) {
          toast.error("当前建筑缺少所属园区，无法打开详情")
          return
        }

        void router.push({
          name: "building-detail",
          params: { id: row.uuid },
          query: { parkUuid: row.parkUuid },
        })
      },
    },
  ],
  onRowClick: row => {
    if (!row.uuid) {
      toast.error("当前建筑缺少 Uuid，无法打开详情")
      return
    }

    if (!row.parkUuid) {
      toast.error("当前建筑缺少所属园区，无法打开详情")
      return
    }

    void router.push({
      name: "building-detail",
      params: { id: row.uuid },
      query: { parkUuid: row.parkUuid },
    })
  },
  onQuickAction: row => {
    if (!row.uuid || !row.parkUuid) {
      toast.error("当前建筑缺少必要参数，无法打开侧边详情")
      return
    }

    activeBuildingSheetUuid.value = row.uuid
    activeBuildingSheetParkUuid.value = row.parkUuid
    buildingDetailSheetOpen.value = true
  },
  columns: [
    {
      key: "buildingName",
      label: "建筑名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
    },
    {
      key: "customerName",
      label: "所属客户",
      filterType: "text",
      slot: "cell-customerName",
    },
    {
      key: "parkName",
      label: "所属园区",
      filterType: "text",
      slot: "cell-parkName",
    },
    {
      key: "buildingArea",
      label: "建筑面积",
      filterType: "number",
      variant: "metric",
      cellRenderer: {
        kind: "metric-unit",
        valueKey: "buildingAreaValue",
        unit: "㎡",
      },
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
    },
    {
      key: "builtTime",
      label: "建成时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
    },
    {
      key: "operationTime",
      label: "投运时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
    },
    {
      key: "address",
      label: "地址",
      filterType: "text",
      width: "fill",
    },
    {
      key: "updatedAt",
      label: "更新时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
    },
  ],
  tabs: {
    mode: "none",
  },
}

const sortedBuildings = computed(() => {
  return [...buildings.value].sort(compareBuildingRows)
})

const page = useTablePage({
  ...createTablePageDefinition(schema),
  rows: sortedBuildings,
})
page.showControls.value = true

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (!initialized.value || (nextPageNum === previousPageNum && nextPageSize === previousPageSize)) {
    return
  }

  void loadBuildings()
})

watch(draftName, (value) => {
  if (suppressFilterSideEffects) {
    return
  }

  clearNameDebounceTimer()
  nameDebounceTimer = setTimeout(() => {
    appliedName.value = normalizeText(value)
  }, 400)
})

watch(appliedName, (nextValue, previousValue) => {
  if (!initialized.value || suppressFilterSideEffects || nextValue === previousValue) {
    return
  }

  void handleFilterChange()
})

watch(() => selectedCustomerUuids.value.join(","), async (nextValue, previousValue) => {
  if (!initialized.value || suppressFilterSideEffects || nextValue === previousValue) {
    return
  }

  await handleFilterChange()
})

watch(() => selectedParkUuids.value.join(","), (nextValue, previousValue) => {
  if (!initialized.value || suppressFilterSideEffects || nextValue === previousValue) {
    return
  }

  void handleFilterChange()
})

watch(
  [
    () => normalizeQueryValue(route.query.q),
    () => normalizeQueryList(route.query.customerUuids).join(","),
    () => normalizeQueryList(route.query.parkUuids).join(","),
  ],
  ([nextName, nextCustomers, nextParks], [previousName, previousCustomers, previousParks]) => {
    if (
      !initialized.value
      || syncingRoute
      || (nextName === previousName && nextCustomers === previousCustomers && nextParks === previousParks)
    ) {
      return
    }

    void applyRouteFilters({ reload: true })
  },
)

void initializePage()

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown, true)
  void nextTick(() => {
    updateCollapsedChipWidths()
    startCollapsedChipResizeObserver()
  })
})

onBeforeUnmount(() => {
  clearNameDebounceTimer()
  document.removeEventListener("pointerdown", handleDocumentPointerDown, true)
  collapsedChipResizeObserver?.disconnect()
  collapsedChipResizeObserver = null
})

watch([nameTriggerLabel, customerTriggerLabel, parkTriggerLabel], () => {
  void nextTick(() => {
    updateCollapsedChipWidths()
    startCollapsedChipResizeObserver()
  })
})

function handleCreateBuilding() {
  void router.push({ name: "building-create" })
}

function handleOpenParkDetail(row: unknown) {
  const currentRow = row as BuildingRecord

  if (!currentRow.parkUuid) {
    toast.error("当前建筑缺少所属园区信息，无法打开详情")
    return
  }

  activeLinkedDetailKind.value = "park"
  activeLinkedDetailUuid.value = currentRow.parkUuid
  activeLinkedDetailCustomerUuid.value = ""
}

function handleOpenCustomerDetail(row: unknown) {
  const currentRow = row as BuildingRecord

  if (!currentRow.customerUuid) {
    toast.error("当前建筑缺少所属客户信息，无法打开详情")
    return
  }

  activeLinkedDetailKind.value = "customer"
  activeLinkedDetailUuid.value = currentRow.customerUuid
  activeLinkedDetailCustomerUuid.value = ""
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  if (!open) {
    activeLinkedDetailKind.value = null
    activeLinkedDetailUuid.value = ""
    activeLinkedDetailCustomerUuid.value = ""
  }
}

function handleBuildingDetailSheetOpenChange(open: boolean) {
  buildingDetailSheetOpen.value = open

  if (!open) {
    activeBuildingSheetUuid.value = ""
    activeBuildingSheetParkUuid.value = ""
  }
}

function handleNameEnter() {
  clearNameDebounceTimer()
  appliedName.value = normalizeText(draftName.value)
  collapseControl("name")
}

function handleResetFilters() {
  clearNameDebounceTimer()
  suppressFilterSideEffects = true
  draftName.value = ""
  appliedName.value = ""
  selectedCustomerUuids.value = []
  selectedParkUuids.value = []
  expandedControl.value = null
  suppressFilterSideEffects = false
  void handleFilterChange()
}

function handleToolbarSortToggle() {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"

  if (initialized.value && usesClientSideAggregation.value) {
    void loadBuildings()
  }
}

async function toggleControl(key: "name" | "customer" | "park") {
  if (expandedControl.value === key) {
    collapseControl(key)
    return
  }

  customerSelectOpen.value = false
  parkSelectOpen.value = false
  expandedControl.value = key

  if (expandedControl.value === "name") {
    await nextTick()
    document.querySelector<HTMLInputElement>("[data-building-search-input]")?.focus()
    return
  }

  await nextTick()

  if (key === "customer") {
    customerSelectOpen.value = true
    document.querySelector<HTMLElement>("[data-building-customer-trigger]")?.focus()
    return
  }

  if (key === "park") {
    parkSelectOpen.value = true
    document.querySelector<HTMLElement>("[data-building-park-trigger]")?.focus()
  }
}

function collapseControl(key: "name" | "customer" | "park") {
  if (key === "customer") {
    customerSelectOpen.value = false
  }

  if (key === "park") {
    parkSelectOpen.value = false
  }

  if (expandedControl.value === key) {
    expandedControl.value = null
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!expandedControl.value) {
    return
  }

  const target = event.target

  if (!(target instanceof Node)) {
    return
  }

  if (filterControlsRef.value?.contains(target)) {
    return
  }

  if (target instanceof Element && target.closest("[data-slot='select-content']")) {
    return
  }

  if (expandedControl.value === "name") {
    clearNameDebounceTimer()
    appliedName.value = normalizeText(draftName.value)
  }

  collapseControl(expandedControl.value)
}

async function initializePage() {
  await Promise.all([
    loadCustomerOptions(),
    loadParkOptions(),
  ])
  await applyRouteFilters({ reload: false })
  initialized.value = true
  await loadBuildings()
}

async function applyRouteFilters(options: { reload: boolean }) {
  const nextName = normalizeQueryValue(route.query.q)
  const nextCustomerUuids = filterKnownOptions(normalizeQueryList(route.query.customerUuids), customerOptions.value)
  const nextParkUuids = filterKnownOptions(normalizeQueryList(route.query.parkUuids), parkOptions.value)

  suppressFilterSideEffects = true
  clearNameDebounceTimer()
  draftName.value = nextName
  appliedName.value = nextName
  selectedCustomerUuids.value = nextCustomerUuids
  selectedParkUuids.value = nextParkUuids
  suppressFilterSideEffects = false
  await syncRouteQuery()

  if (!options.reload) {
    return
  }

  if (pageNum.value !== 1) {
    pageNum.value = 1
    return
  }

  await loadBuildings()
}

async function loadCustomerOptions() {
  customerOptionsLoading.value = true

  try {
    customerOptions.value = await fetchAllCustomers()
  } catch (error) {
    customerOptions.value = []
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "客户筛选项加载失败，请稍后重试。",
    }))
  } finally {
    customerOptionsLoading.value = false
  }
}

async function loadParkOptions() {
  parkOptionsLoading.value = true

  try {
    parkOptions.value = await fetchAllParks()
  } catch (error) {
    parkOptions.value = []
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "园区筛选项加载失败，请稍后重试。",
    }))
  } finally {
    parkOptionsLoading.value = false
  }
}

async function handleFilterChange() {
  await syncRouteQuery()

  if (pageNum.value !== 1) {
    pageNum.value = 1
    return
  }

  await loadBuildings()
}

async function syncRouteQuery() {
  const nextQuery = {
    ...route.query,
    q: appliedName.value || undefined,
    customerUuids: selectedCustomerUuids.value.length ? selectedCustomerUuids.value.join(",") : undefined,
    parkUuids: selectedParkUuids.value.length ? selectedParkUuids.value.join(",") : undefined,
  }

  if (
    normalizeQueryValue(nextQuery.q) === normalizeQueryValue(route.query.q)
    && normalizeQueryList(nextQuery.customerUuids).join(",") === normalizeQueryList(route.query.customerUuids).join(",")
    && normalizeQueryList(nextQuery.parkUuids).join(",") === normalizeQueryList(route.query.parkUuids).join(",")
  ) {
    return
  }

  syncingRoute = true

  try {
    await router.replace({ query: nextQuery })
  } finally {
    syncingRoute = false
  }
}

async function loadBuildings() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const buildingsResult = await fetchBuildingsForCurrentFilters()

    if (requestId !== latestRequestId) {
      return
    }

    total.value = buildingsResult.total
    const nextRows = normalizeBuildingRows(buildingsResult.list)
    const pendingParkUuids = [...new Set(
      nextRows
        .filter(row => row.customerLoading && row.parkUuid)
        .map(row => row.parkUuid),
    )]

    buildings.value = nextRows

    if (pendingParkUuids.length) {
      void hydrateBuildingCustomers(requestId, pendingParkUuids)
    }

    const maxPage = Math.max(1, Math.ceil((buildingsResult.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    buildings.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "建筑列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function fetchBuildingsForCurrentFilters() {
  const name = appliedName.value || undefined
  const customerUuids = [...selectedCustomerUuids.value]
  const parkUuids = [...selectedParkUuids.value]
  const usesClientSideAggregation = customerUuids.length > 1 || parkUuids.length > 1

  if (!usesClientSideAggregation) {
    return fetchBuildings({
      Name: name,
      CustomerUuid: customerUuids[0],
      ParkUuid: parkUuids[0],
      PageNum: pageNum.value,
      PageSize: pageSize.value,
    })
  }

  const rawItems = await fetchAllBuildingsForMultiFilters({
    name,
    customerUuids,
    parkUuids,
  })
  const hydratedRows = await hydrateBuildingRows(normalizeBuildingRows(rawItems))
  const filteredRows = filterBuildingRows(hydratedRows, {
    customerUuids,
    parkUuids,
  })
  const sortedRows = [...filteredRows].sort(compareBuildingRows)
  const pageStart = Math.max(0, (pageNum.value - 1) * pageSize.value)

  return {
    total: sortedRows.length,
    list: sortedRows.slice(pageStart, pageStart + pageSize.value).map(row => ({
      Uuid: row.uuid,
      ParkUuid: row.parkUuid,
      ParkName: row.parkName,
      CustomerUuid: row.customerUuid,
      CorpName: row.customerName,
      Name: row.buildingName,
      BuiltTime: row.builtTime,
      OperationTime: row.operationTime,
      BuildingArea: row.buildingArea,
      ContactPerson: row.contactName,
      ContactPhone: row.contactPhone,
      Address: row.address,
      UpdatedAt: row.updatedAt,
    })),
  }
}

async function fetchAllBuildingsForMultiFilters(filters: {
  name?: string
  customerUuids: string[]
  parkUuids: string[]
}) {
  const requestPayloads = filters.parkUuids.length
    ? filters.parkUuids.map(parkUuid => ({
        Name: filters.name,
        ParkUuid: parkUuid,
      }))
    : filters.customerUuids.length
      ? filters.customerUuids.map(customerUuid => ({
          Name: filters.name,
          CustomerUuid: customerUuid,
        }))
      : [{
          Name: filters.name,
        }]

  const buildingGroups = await Promise.all(requestPayloads.map(payload => fetchAllBuildingsByPayload(payload)))
  return dedupeBuildingItems(buildingGroups.flat())
}

async function fetchAllBuildingsByPayload(payload: {
  Name?: string
  CustomerUuid?: string
  ParkUuid?: string
}) {
  const allItems: BuildingListItem[] = []
  let currentPage = 1
  let totalCount = 0
  const requestPageSize = 200

  while (currentPage <= 20) {
    const result = await fetchBuildings({
      ...payload,
      PageNum: currentPage,
      PageSize: requestPageSize,
    })

    if (currentPage === 1) {
      totalCount = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (totalCount > 0 && allItems.length >= totalCount)) {
      break
    }

    currentPage += 1
  }

  return allItems
}

async function hydrateBuildingCustomers(requestId: number, parkUuids: string[]) {
  try {
    const customerMap = await resolveParkCustomerMap(parkUuids)

    if (requestId !== latestRequestId) {
      return
    }

    buildings.value = buildings.value.map((row) => {
      if (!row.customerLoading) {
        return row
      }

      const resolvedCustomer = customerMap.get(row.parkUuid)
      const customerUuid = row.customerUuid || resolvedCustomer?.customerUuid || ""
      const customerName = row.customerName && row.customerName !== "未关联客户"
        ? row.customerName
        : resolvedCustomer?.customerName || (row.parkUuid ? "未关联客户" : "-")

      return {
        ...row,
        customerUuid,
        customerName: customerUuid && customerName === "未关联客户" ? "未命名客户" : customerName,
        customerLoading: false,
      }
    })
  } catch {
    if (requestId !== latestRequestId) {
      return
    }

    buildings.value = buildings.value.map(row => ({
      ...row,
      customerName: row.customerUuid ? row.customerName || "未命名客户" : row.parkUuid ? "未关联客户" : "-",
      customerLoading: false,
    }))
  }
}

async function hydrateBuildingRows(rows: BuildingRecord[]) {
  const pendingParkUuids = [...new Set(
    rows
      .filter(row => row.customerLoading && row.parkUuid)
      .map(row => row.parkUuid),
  )]

  if (!pendingParkUuids.length) {
    return rows
  }

  try {
    const customerMap = await resolveParkCustomerMap(pendingParkUuids)

    return rows.map((row) => {
      if (!row.customerLoading) {
        return row
      }

      const resolvedCustomer = customerMap.get(row.parkUuid)
      const customerUuid = row.customerUuid || resolvedCustomer?.customerUuid || ""
      const customerName = row.customerName && row.customerName !== "未关联客户"
        ? row.customerName
        : resolvedCustomer?.customerName || (row.parkUuid ? "未关联客户" : "-")

      return {
        ...row,
        customerUuid,
        customerName: customerUuid && customerName === "未关联客户" ? "未命名客户" : customerName,
        customerLoading: false,
      }
    })
  } catch {
    return rows.map(row => ({
      ...row,
      customerName: row.customerUuid ? row.customerName || "未命名客户" : row.parkUuid ? "未关联客户" : "-",
      customerLoading: false,
    }))
  }
}

async function fetchAllCustomers() {
  const pageSize = 200
  const allItems: FilterOption[] = []
  let currentPage = 1
  let totalCount = 0

  while (currentPage <= 20) {
    const result = await fetchCustomers({
      PageNum: currentPage,
      PageSize: pageSize,
    })

    if (currentPage === 1) {
      totalCount = result.total
    }

    allItems.push(...result.list.map(item => ({
      uuid: normalizeText(item.Uuid),
      name: normalizeText(item.CorpName) || "未命名客户",
    })))

    if (!result.list.length || (totalCount > 0 && allItems.length >= totalCount)) {
      break
    }

    currentPage += 1
  }

  return dedupeOptions(allItems)
}

async function fetchAllParks() {
  const pageSize = 200
  const allItems: FilterOption[] = []
  let currentPage = 1
  let totalCount = 0

  while (currentPage <= 20) {
    const result = await fetchParks({
      PageNum: currentPage,
      PageSize: pageSize,
    })

    if (currentPage === 1) {
      totalCount = result.total
    }

    allItems.push(...result.list.map(item => ({
      uuid: normalizeText(item.Uuid),
      name: normalizeText(item.Name) || "未命名园区",
    })))

    if (!result.list.length || (totalCount > 0 && allItems.length >= totalCount)) {
      break
    }

    currentPage += 1
  }

  return allItems
}

function normalizeBuildingRows(items: BuildingListItem[]) {
  return items.map((item, index) => {
    const uuid = toText(item.Uuid, `building-${index + 1}`)
    const parkUuid = toText(item.ParkUuid)
    const directCustomerUuid = toText(item.CustomerUuid)
    const directCustomerName = toText(item.CorpName || item.CustomerName)
    const buildingAreaValue = parseAreaValue(item.BuildingArea ?? item.BuildArea)
    const needsCustomerHydration = Boolean(parkUuid) && (!directCustomerUuid || !directCustomerName)

    if (parkUuid && directCustomerUuid && directCustomerName) {
      primeParkCustomerCache(parkUuid, {
        customerUuid: directCustomerUuid,
        customerName: directCustomerName,
      })
    }

    return {
      id: uuid,
      uuid,
      parkUuid,
      parkName: toText(item.ParkName, "未关联园区"),
      customerUuid: directCustomerUuid,
      customerName: directCustomerName || (parkUuid ? "未关联客户" : "-"),
      customerLoading: needsCustomerHydration,
      buildingName: toText(item.Name, "未命名建筑"),
      builtTime: toText(item.BuiltTime, "-"),
      operationTime: toText(item.OperationTime, "-"),
      buildingArea: buildingAreaValue === null ? "-" : String(buildingAreaValue),
      buildingAreaValue,
      contactName: toText(item.ContactPerson ?? item.Contact, "未填写"),
      contactPhone: toText(item.ContactPhone, "-"),
      address: toText(item.Address, "-"),
      updatedAt: toText(item.UpdatedAt || item.CreatedAt, "-"),
    }
  })
}

function filterBuildingRows(rows: BuildingRecord[], filters: { customerUuids: string[]; parkUuids: string[] }) {
  return rows.filter((row) => {
    const matchesCustomer = !filters.customerUuids.length || filters.customerUuids.includes(row.customerUuid)
    const matchesPark = !filters.parkUuids.length || filters.parkUuids.includes(row.parkUuid)
    return matchesCustomer && matchesPark
  })
}

function compareBuildingRows(left: BuildingRecord, right: BuildingRecord) {
  const leftValue = getSortTimestamp(left.updatedAt)
  const rightValue = getSortTimestamp(right.updatedAt)

  if (leftValue === rightValue) {
    return left.buildingName.localeCompare(right.buildingName, "zh-CN")
  }

  return sortDirection.value === "asc" ? leftValue - rightValue : rightValue - leftValue
}

function dedupeBuildingItems(items: BuildingListItem[]) {
  const itemMap = new Map<string, BuildingListItem>()

  for (const item of items) {
    const uuid = normalizeText(item.Uuid)

    if (!uuid || itemMap.has(uuid)) {
      continue
    }

    itemMap.set(uuid, item)
  }

  return [...itemMap.values()]
}

function dedupeOptions(items: FilterOption[]) {
  const optionMap = new Map<string, FilterOption>()

  for (const item of items) {
    if (!item.uuid || optionMap.has(item.uuid)) {
      continue
    }

    optionMap.set(item.uuid, item)
  }

  return [...optionMap.values()]
}

function buildMultiSelectLabel(
  selectedIds: string[],
  options: FilterOption[],
  config: { placeholder: string; unit: string },
) {
  if (!selectedIds.length) {
    return config.placeholder
  }

  const nameMap = new Map(options.map(item => [item.uuid, item.name]))
  const names = selectedIds.map(uuid => nameMap.get(uuid)).filter((value): value is string => Boolean(value))

  if (!names.length) {
    return config.placeholder
  }

  if (names.length <= 2) {
    return names.join("、")
  }

  return `已选 ${names.length}${config.unit}`
}

function updateCollapsedChipWidths() {
  collapsedNameWidth.value = measureCollapsedChipWidth(nameMeasureRef.value, 102, 248)
  collapsedCustomerWidth.value = measureCollapsedChipWidth(customerMeasureRef.value, 96, 248)
  collapsedParkWidth.value = measureCollapsedChipWidth(parkMeasureRef.value, 96, 248)
}

function startCollapsedChipResizeObserver() {
  if (typeof ResizeObserver === "undefined") {
    return
  }

  collapsedChipResizeObserver?.disconnect()
  collapsedChipResizeObserver = new ResizeObserver(() => {
    updateCollapsedChipWidths()
  })

  for (const refValue of [nameMeasureRef.value, customerMeasureRef.value, parkMeasureRef.value]) {
    const element = resolveMeasuredElement(refValue)

    if (element) {
      collapsedChipResizeObserver.observe(element)
    }
  }
}

function measureCollapsedChipWidth(
  target: ComponentPublicInstance | HTMLElement | null,
  minWidth: number,
  maxWidth: number,
) {
  const element = resolveMeasuredElement(target)

  if (!element) {
    return minWidth
  }

  const measuredWidth = Math.ceil(element.getBoundingClientRect().width)
  return Math.max(minWidth, Math.min(maxWidth, measuredWidth))
}

function resolveMeasuredElement(target: ComponentPublicInstance | HTMLElement | null) {
  if (target instanceof HTMLElement) {
    return target
  }

  const element = target?.$el
  return element instanceof HTMLElement ? element : null
}

function filterKnownOptions(values: string[], options: FilterOption[]) {
  const validUuids = new Set(options.map(item => item.uuid))
  return values.filter(value => validUuids.has(value))
}

function normalizeQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0])
  }

  return typeof value === "string" ? value.trim() : ""
}

function normalizeQueryList(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  return normalizeQueryValue(value)
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
}

function clearNameDebounceTimer() {
  if (!nameDebounceTimer) {
    return
  }

  clearTimeout(nameDebounceTimer)
  nameDebounceTimer = null
}

function extractDatePart(value: string) {
  const [datePart] = value.split(/[ T]/)
  return datePart ?? value
}

function getSortTimestamp(value: string) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function parseAreaValue(value: unknown) {
  const normalized = toText(value)

  if (!normalized) {
    return null
  }

  const numeric = Number(normalized.replace(/[^\d.]/g, ""))
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeText(value: unknown) {
  if (typeof value === "string") {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return ""
}

function toText(value: unknown, fallback = "") {
  const normalized = normalizeText(value)
  return normalized || fallback
}
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <AlertTitle>建筑列表加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadBuildings">
            <i class="ri-refresh-line text-sm" />
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TablePage
      :page="page"
      :loading="loading"
      toolbar-sort-behavior="toggle"
      :toolbar-sort-direction="sortDirection"
      fill-available-height
      @refresh-action="loadBuildings"
      @primary-action="handleCreateBuilding"
      @toolbar-sort-toggle="handleToolbarSortToggle"
    >
      <template #controls-prefix>
        <div ref="filterControlsRef" class="mr-2 flex min-w-max items-center gap-2">
          <div
            class="relative h-8 shrink-0 overflow-visible transition-[width] duration-280 ease-[cubic-bezier(0.2,0,0,1)]"
            :style="{ width: `${nameControlWidth}px` }"
          >
            <div
              class="absolute inset-0 transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.2,0,0,1)]"
              :class="expandedControl === 'name' ? 'pointer-events-none scale-[0.92] opacity-0 blur-[2px]' : 'pointer-events-auto scale-100 opacity-100 blur-0'"
            >
              <FilterChip
                icon="ri-text"
                :label="nameTriggerLabel"
                :selected="Boolean(appliedName)"
                caret
                class="absolute left-0 top-1/2 min-w-0 w-full -translate-y-1/2 justify-start overflow-hidden text-[13px] [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate"
                @click="toggleControl('name')"
              />
            </div>

            <div
              class="absolute inset-0 origin-left transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.2,0,0,1)]"
              :class="expandedControl === 'name' ? 'pointer-events-auto scale-100 opacity-100 blur-0' : 'pointer-events-none scale-[0.96] opacity-0 blur-[2px]'"
            >
              <InputGroup class="relative h-8 w-full rounded-full bg-background">
                <InputGroupAddon class="pl-2.5 pr-2">
                  <InputGroupText>
                    <i class="ri-text text-[15px]" />
                    建筑名称
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  v-model="draftName"
                  data-building-search-input
                  placeholder="输入建筑名称搜索"
                  class="min-w-0 pr-9"
                  @keydown.enter="handleNameEnter"
                  @keydown.esc="collapseControl('name')"
                />
                <button
                  type="button"
                  class="absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-180 ease-out hover:bg-interactive-hover hover:text-foreground active:scale-[0.96]"
                  aria-label="收起建筑名称搜索"
                  @click="collapseControl('name')"
                >
                  <i class="ri-close-line text-[16px]" />
                </button>
              </InputGroup>
            </div>
          </div>

          <div
            class="relative h-8 shrink-0 overflow-visible transition-[width] duration-280 ease-[cubic-bezier(0.2,0,0,1)]"
            :style="{ width: `${customerControlWidth}px` }"
          >
            <div
              class="absolute inset-0 transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.2,0,0,1)]"
              :class="expandedControl === 'customer' ? 'pointer-events-none scale-[0.92] opacity-0 blur-[2px]' : 'pointer-events-auto scale-100 opacity-100 blur-0'"
            >
              <FilterChip
                icon="ri-price-tag-3-line"
                :label="customerTriggerLabel"
                :selected="Boolean(selectedCustomerUuids.length)"
                caret
                class="absolute left-0 top-1/2 min-w-0 w-full -translate-y-1/2 justify-start overflow-hidden text-[13px] [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate"
                @click="toggleControl('customer')"
              />
            </div>

            <div
              class="absolute inset-0 origin-left transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.2,0,0,1)]"
              :class="expandedControl === 'customer' ? 'pointer-events-auto scale-100 opacity-100 blur-0' : 'pointer-events-none scale-[0.96] opacity-0 blur-[2px]'"
            >
              <InputGroup class="relative h-8 w-full rounded-full bg-background">
                <InputGroupAddon class="pl-2.5 pr-2">
                  <InputGroupText>
                    <i class="ri-price-tag-3-line text-[15px]" />
                    所属客户
                  </InputGroupText>
                </InputGroupAddon>
                <Select
                  v-model="selectedCustomerUuids"
                  v-model:open="customerSelectOpen"
                  multiple
                  :disabled="customerOptionsLoading"
                >
                  <SelectTrigger
                    data-building-customer-trigger
                    class="h-full w-full rounded-none border-0 bg-transparent px-2 pr-9 shadow-none focus-visible:border-0 focus-visible:ring-0 data-[state=open]:border-0 data-[state=open]:ring-0"
                  >
                    <span class="truncate text-left">{{ customerSelectLabel }}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="customer in customerOptions" :key="customer.uuid" :value="customer.uuid">
                      {{ customer.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  class="absolute right-1 top-1/2 z-10 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-180 ease-out hover:bg-interactive-hover hover:text-foreground active:scale-[0.96]"
                  aria-label="收起所属客户筛选"
                  @click="collapseControl('customer')"
                >
                  <i class="ri-close-line text-[16px]" />
                </button>
              </InputGroup>
            </div>
          </div>

          <div
            class="relative h-8 shrink-0 overflow-visible transition-[width] duration-280 ease-[cubic-bezier(0.2,0,0,1)]"
            :style="{ width: `${parkControlWidth}px` }"
          >
            <div
              class="absolute inset-0 transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.2,0,0,1)]"
              :class="expandedControl === 'park' ? 'pointer-events-none scale-[0.92] opacity-0 blur-[2px]' : 'pointer-events-auto scale-100 opacity-100 blur-0'"
            >
              <FilterChip
                icon="ri-price-tag-3-line"
                :label="parkTriggerLabel"
                :selected="Boolean(selectedParkUuids.length)"
                caret
                class="absolute left-0 top-1/2 min-w-0 w-full -translate-y-1/2 justify-start overflow-hidden text-[13px] [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate"
                @click="toggleControl('park')"
              />
            </div>

            <div
              class="absolute inset-0 origin-left transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.2,0,0,1)]"
              :class="expandedControl === 'park' ? 'pointer-events-auto scale-100 opacity-100 blur-0' : 'pointer-events-none scale-[0.96] opacity-0 blur-[2px]'"
            >
              <InputGroup class="relative h-8 w-full rounded-full bg-background">
                <InputGroupAddon class="pl-2.5 pr-2">
                  <InputGroupText>
                    <i class="ri-price-tag-3-line text-[15px]" />
                    所属园区
                  </InputGroupText>
                </InputGroupAddon>
                <Select
                  v-model="selectedParkUuids"
                  v-model:open="parkSelectOpen"
                  multiple
                  :disabled="parkOptionsLoading"
                >
                  <SelectTrigger
                    data-building-park-trigger
                    class="h-full w-full rounded-none border-0 bg-transparent px-2 pr-9 shadow-none focus-visible:border-0 focus-visible:ring-0 data-[state=open]:border-0 data-[state=open]:ring-0"
                  >
                    <span class="truncate text-left">{{ parkSelectLabel }}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="park in parkOptions" :key="park.uuid" :value="park.uuid">
                      {{ park.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  class="absolute right-1 top-1/2 z-10 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-180 ease-out hover:bg-interactive-hover hover:text-foreground active:scale-[0.96]"
                  aria-label="收起所属园区筛选"
                  @click="collapseControl('park')"
                >
                  <i class="ri-close-line text-[16px]" />
                </button>
              </InputGroup>
            </div>
          </div>

          <FilterChip
            icon="ri-close-circle-line"
            label="清空筛选"
            variant="ghost"
            :class="[
              'h-6 shrink-0 self-center px-2',
              canResetFilters ? '' : 'pointer-events-none opacity-40',
            ]"
            @click="handleResetFilters"
          />
        </div>
        <div class="pointer-events-none fixed left-[-9999px] top-[-9999px] opacity-0" aria-hidden="true">
          <FilterChip
            ref="nameMeasureRef"
            icon="ri-text"
            :label="nameTriggerLabel"
            :selected="Boolean(appliedName)"
            caret
            class="text-[13px]"
          />
          <FilterChip
            ref="customerMeasureRef"
            icon="ri-price-tag-3-line"
            :label="customerTriggerLabel"
            :selected="Boolean(selectedCustomerUuids.length)"
            caret
            class="mt-2 text-[13px]"
          />
          <FilterChip
            ref="parkMeasureRef"
            icon="ri-price-tag-3-line"
            :label="parkTriggerLabel"
            :selected="Boolean(selectedParkUuids.length)"
            caret
            class="mt-2 text-[13px]"
          />
        </div>
      </template>

      <template #cell-parkName="{ row }">
        <button
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click.stop="handleOpenParkDetail(row)"
        >
          <span class="truncate">{{ row.parkName }}</span>
          <i class="ri-arrow-right-up-line shrink-0 text-sm" />
        </button>
      </template>

      <template #cell-customerName="{ row }">
        <div v-if="row.customerLoading" class="flex max-w-full items-center">
          <Skeleton class="h-4 w-24 max-w-full" />
        </div>
        <button
          v-else-if="row.customerUuid"
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-link transition-colors hover:text-link-hover"
          @click.stop="handleOpenCustomerDetail(row)"
        >
          <span class="truncate">{{ row.customerName }}</span>
          <i class="ri-arrow-right-up-line shrink-0 text-sm" />
        </button>
        <span v-else class="truncate text-muted-foreground">{{ row.customerName }}</span>
      </template>

      <template #footer>
        <Pagination
          v-model:page="pageNum"
          :items-per-page="pageSize"
          :total="total"
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
                :is-active="item.value === pageNum"
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

    <LinkedEntityDetailSheet
      :open="Boolean(activeLinkedDetailKind) && Boolean(activeLinkedDetailUuid)"
      :kind="activeLinkedDetailKind"
      :uuid="activeLinkedDetailUuid"
      :customer-uuid="activeLinkedDetailCustomerUuid"
      @update:open="handleLinkedDetailSheetOpenChange"
    />

    <BuildingDetailSheet
      :open="buildingDetailSheetOpen"
      :building-uuid="activeBuildingSheetUuid"
      :park-uuid="activeBuildingSheetParkUuid"
      @update:open="handleBuildingDetailSheetOpenChange"
    />
  </section>
</template>
