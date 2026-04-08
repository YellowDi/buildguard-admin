<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import TablePage from "@/components/table-page/TablePage.vue"
import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import { customerStatusMap } from "@/components/table-page/statusPresets"
import { createTablePageDefinition, useTablePage } from "@/components/table-page/useTablePage"
import type { TablePageSchema } from "@/components/table-page/types"
import { useRouteTableSearch } from "@/composables/useRouteTableSearch"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchInspectionPlans, type InspectionPlanListItem } from "@/lib/inspection-plans-api"
import { fetchParkDetail, fetchParks, type ParkDetailResult, type ParkListItem } from "@/lib/parks-api"

type CustomerRecord = {
  id: string
  detailId: string
  customerName: string
  status: number | null
  statusLabel: string
  business: string
  level: string
  levelLabel: string
  principalName: string
  principalPhone: string
  principalDisplay: string
  packageInfo: string
  packageName: string
  packageCode: string
  remainingTime: string
  remainingDays: number | null
  remainingFunds: string
  remainingFundsValue: number | null
  inspectionTimes: string
  inspectionTimesValue: number | null
  inspectionCycle: string
  parkCount: string
  parkCountValue: number | null
  buildingCount: string
  buildingCountValue: number | null
  riskDistribution: string
  riskHighValue: number | null
  riskRectificationValue: number | null
  riskNormalValue: number | null
  createdAt: string
}

type LinkedDetailSheetKind = "customer" | "service" | "plan" | "park"

const customers = ref<CustomerRecord[]>([])
const loading = ref(false)
const errorMessage = ref("")
const pageNum = ref(1)
const pageSize = ref(50)
const total = ref(0)
const activeLinkedDetailKind = ref<LinkedDetailSheetKind | null>(null)
const activeLinkedDetailUuid = ref("")
let latestRequestId = 0

const schema: TablePageSchema<CustomerRecord> = {
  title: "客户",
  description: "管理客户信息和服务情况，查看合同、资产和检测记录",
  rowKey: "id",
  data: [],
  showIndex: true,
  stickyHeader: true,
  emptyState: {
    title: "暂无客户数据",
    description: "暂时还没有客户数据，您可以先添加一个客户。",
    icon: "ri-customer-service-2-line",
  },
  rowActions: [
    {
      key: "view-detail",
      label: "查看详情",
      onClick: (row) => {
        if (!row.detailId) {
          toast.error("当前客户缺少 Uuid，无法打开详情")
          return
        }

        void router.push({ name: "customer-detail", params: { id: row.detailId } })
      },
    },
  ],
  onRowClick: row => {
    if (!row.detailId) {
      toast.error("当前客户缺少 Uuid，无法打开详情")
      return
    }

    void router.push({ name: "customer-detail", params: { id: row.detailId } })
  },
  onQuickAction: row => {
    if (!row.detailId) {
      toast.error("当前客户缺少 Uuid，无法打开侧边详情")
      return
    }

    activeLinkedDetailKind.value = "customer"
    activeLinkedDetailUuid.value = row.detailId
  },
  columns: [
    {
      key: "customerName",
      label: "客户名称",
      filterType: "text",
      emphasis: "strong",
      tone: "primary",
      filter: {
        type: "text",
        label: "客户名称",
        placeholder: "输入客户名称",
        defaultVisible: true,
      },
      sort: true,
    },
    {
      key: "statusLabel",
      label: "客户状态",
      filterType: "tag",
      cellRenderer: {
        kind: "status",
        map: customerStatusMap,
        fallback: { tone: "gray", icon: "dot" },
      },
      filter: {
        type: "tag",
        label: "客户状态",
        defaultVisible: true,
      },
      sort: {
        label: "客户状态",
        kind: "metric",
        value: row => row.status ?? 0,
      },
    },
    {
      key: "principalDisplay",
      label: "责任人",
      cellRenderer: {
        kind: "dual-inline",
        primaryKey: "principalName",
        secondaryKey: "principalPhone",
      },
      filter: {
        type: "text",
        label: "责任人",
        placeholder: "输入责任人或手机号",
        defaultVisible: true,
        value: row => row.principalDisplay,
      },
      sort: {
        label: "责任人",
        value: row => row.principalName === "-" ? row.principalPhone : row.principalName,
      },
    },
    {
      key: "levelLabel",
      label: "客户等级",
      filterType: "tag",
      filter: {
        type: "tag",
        defaultVisible: true,
      },
      sort: {
        label: "客户等级",
        value: row => row.levelLabel,
      },
    },
    {
      key: "business",
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
      key: "packageInfo",
      label: "服务信息",
      filterType: "text",
      width: "fill",
      slot: "cell-packageInfo",
      filter: {
        type: "text",
        label: "服务信息",
        placeholder: "输入服务名称或编码",
      },
      sort: true,
    },
    {
      key: "remainingTime",
      label: "剩余时间",
      filterType: "time",
      filter: {
        type: "text",
        label: "剩余时间",
        placeholder: "输入剩余时间",
      },
      sort: {
        label: "剩余时间",
        kind: "metric",
        value: row => row.remainingDays ?? -1,
      },
    },
    {
      key: "remainingFunds",
      label: "剩余资金",
      filterType: "number",
      filter: {
        type: "number",
        label: "剩余资金",
        placeholder: "输入剩余资金",
      },
      sort: {
        label: "剩余资金",
        kind: "metric",
        value: row => row.remainingFundsValue ?? -1,
      },
    },
    {
      key: "inspectionTimes",
      label: "检测次数",
      filterType: "number",
      filter: {
        type: "number",
        label: "检测次数",
        placeholder: "输入检测次数",
      },
      sort: {
        label: "检测次数",
        kind: "metric",
        value: row => row.inspectionTimesValue ?? -1,
      },
    },
    {
      key: "inspectionCycle",
      label: "检测周期",
      filterType: "text",
      filter: {
        type: "text",
        label: "检测周期",
        placeholder: "输入检测周期",
      },
      sort: true,
    },
    {
      key: "parkCount",
      label: "园区数量",
      filterType: "number",
      variant: "metric",
      cellRenderer: {
        kind: "metric-unit",
        unit: "个",
      },
      filter: {
        type: "number",
        label: "园区数量",
        placeholder: "输入园区数量",
        value: row => row.parkCountValue ?? "",
      },
      sort: {
        label: "园区数量",
        kind: "metric",
        value: row => row.parkCountValue ?? -1,
      },
    },
    {
      key: "buildingCount",
      label: "建筑数量",
      filterType: "number",
      variant: "metric",
      cellRenderer: {
        kind: "metric-unit",
        unit: "栋",
      },
      filter: {
        type: "number",
        label: "建筑数量",
        placeholder: "输入建筑数量",
        value: row => row.buildingCountValue ?? "",
      },
      sort: {
        label: "建筑数量",
        kind: "metric",
        value: row => row.buildingCountValue ?? -1,
      },
    },
    {
      key: "riskDistribution",
      label: "风险分布",
      filterType: "text",
      width: "fill",
      filter: {
        type: "text",
        label: "风险分布",
        placeholder: "输入风险分布",
      },
      sort: {
        label: "风险分布",
        kind: "metric",
        value: row => row.riskHighValue ?? -1,
      },
    },
    {
      key: "createdAt",
      label: "创建时间",
      filterType: "time",
      tone: "muted",
      format: "numeric",
      filter: {
        type: "date",
        label: "创建时间",
        value: row => extractDatePart(row.createdAt),
      },
      sort: {
        label: "创建时间",
        kind: "metric",
        value: row => toTimestamp(row.createdAt) ?? -1,
      },
    },
  ],
  filters: [
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
    storageKey: "customers-sort-preferences-v2",
    initialField: "createdAt",
    initialDirection: "desc",
  },
  tabs: {
    mode: "enum",
    all: { label: "全部", value: "all" },
    field: "levelLabel",
  },
}

const page = useTablePage({
  ...createTablePageDefinition(schema),
  primaryActionLabel: "添加客户",
  rows: customers,
})
const route = useRoute()
const router = useRouter()
const showInitialLoading = computed(() => loading.value && !customers.value.length && !errorMessage.value)

useRouteTableSearch(page, route)

watch([pageNum, pageSize], ([nextPageNum, nextPageSize], [previousPageNum, previousPageSize]) => {
  if (nextPageNum === previousPageNum && nextPageSize === previousPageSize) {
    return
  }

  void loadCustomers()
}, { immediate: true })

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function buildPageFilterText(row: CustomerRecord) {
  return [
    row.customerName,
    row.statusLabel,
    row.principalDisplay,
    row.levelLabel,
    row.business,
    row.packageInfo,
    row.remainingTime,
    row.remainingFunds,
    row.inspectionTimes,
    row.inspectionCycle,
    row.parkCount,
    row.buildingCount,
    row.riskDistribution,
    row.createdAt,
  ].join(" ")
}

async function loadCustomers() {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchCustomers({
      PageNum: pageNum.value,
      PageSize: pageSize.value,
    })

    if (requestId !== latestRequestId) {
      return
    }

    total.value = result.total
    customers.value = await buildCustomerRecords(result.list)

    const maxPage = Math.max(1, Math.ceil((result.total || 0) / pageSize.value))

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
      return
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    customers.value = []
    total.value = 0
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function buildCustomerRecords(list: CustomerListItem[]) {
  const customerIds = uniqueText(
    list
      .map(item => getCustomerId(item))
      .filter(Boolean),
  )
  const shouldLoadBuildings = list.some(item => getFirstNumber(item, ["BuildNum", "BuildingNum", "BuildCount"]) === null)
  const [parks, buildings, inspectionPlans] = await Promise.all([
    fetchAllParks(),
    shouldLoadBuildings ? fetchAllBuildings() : Promise.resolve([]),
    fetchAllInspectionPlans(),
  ])
  const customerUuidByCustomerId = buildCustomerUuidByCustomerId(parks)
  const customerUuidByCustomerName = buildCustomerUuidByCustomerName(list, inspectionPlans)
  const customerParks = parks.filter(park => customerIds.includes(getParkCustomerId(park)))
  const customerParkDetails = await fetchParkDetails(customerParks)
  const parkDetailMap = new Map(customerParkDetails.map(detail => [toText(detail.Uuid), detail]))
  const parksByCustomerId = groupParksByCustomerId(customerParks)
  const buildingCountByParkUuid = buildCountByParkUuid(buildings)
  const plansByCustomerId = groupPlansByCustomerId(inspectionPlans)

  return list.map((item, index) => normalizeCustomerRecord(
    item,
    index,
    parksByCustomerId,
    customerUuidByCustomerId,
    customerUuidByCustomerName,
    parkDetailMap,
    buildingCountByParkUuid,
    plansByCustomerId,
  ))
}

function resolveCustomerDetailId(
  item: CustomerListItem,
  customerName: string,
  customerUuidByCustomerId?: Map<string, string>,
  customerUuidByCustomerName?: Map<string, string>,
) {
  const directUuid = getCustomerUuid(item)

  if (directUuid) {
    return directUuid
  }

  const customerId = getCustomerId(item)

  if (customerId && customerUuidByCustomerId?.has(customerId)) {
    return customerUuidByCustomerId.get(customerId) ?? ""
  }

  if (customerName && customerUuidByCustomerName?.has(customerName)) {
    return customerUuidByCustomerName.get(customerName) ?? ""
  }

  return ""
}

function formatLevelLabel(level: string) {
  if (!level) {
    return "未评级"
  }

  return level
}

function formatCustomerStatus(status: number | null) {
  if (status === 1) {
    return "正常"
  }

  if (status === 2) {
    return "封禁"
  }

  if (status === 3) {
    return "未完善"
  }

  return "未填写"
}

function normalizeCustomerRecord(
  item: CustomerListItem,
  index: number,
  parksByCustomerId: Map<string, ParkListItem[]>,
  customerUuidByCustomerId: Map<string, string>,
  customerUuidByCustomerName: Map<string, string>,
  parkDetailMap: Map<string, ParkDetailResult>,
  buildingCountByParkUuid: Map<string, number>,
  plansByCustomerId: Map<string, InspectionPlanListItem[]>,
): CustomerRecord {
  const customerId = getCustomerId(item)
  const customerPlans = plansByCustomerId.get(customerId) ?? []
  const customerParks = parksByCustomerId.get(customerId) ?? []
  const customerName = resolveCustomerName(item, customerPlans, customerParks, parkDetailMap)
  const principalName = toText(item.PrincipalName, "-")
  const principalPhone = toText(item.PrincipalPhone, "-")
  const packageName = getPrimaryPackageName(item, customerPlans)
  const packageCode = getPrimaryPackageCode(item, customerPlans)
  const remainingDays = getRemainingDays(customerPlans)
  const inspectionTimesValue = customerPlans.length || null
  const inspectionCycle = getInspectionCycle(customerPlans)
  const status = getFirstNumber(item, ["Status", "status"])
  const parkCountValue = getFirstNumber(item, ["ParkNum", "ParkCount", "ParksCount"], customerParks.length || null)
  const buildingCountValue = getFirstNumber(item, ["BuildNum", "BuildingNum", "BuildCount"], getBuildingCount(customerParks, buildingCountByParkUuid))
  const riskDistributionMetrics = getRiskDistributionMetrics()
  const createdAt = toText(item.CreatedAt, "-")

  return {
    id: `${pageNum.value}-${index + 1}-${principalPhone}-${customerName}`,
    detailId: resolveCustomerDetailId(item, customerName, customerUuidByCustomerId, customerUuidByCustomerName),
    customerName,
    status,
    statusLabel: formatCustomerStatus(status),
    business: getFirstText(item, ["Business", "Industry", "IndustryName"], "未填写"),
    level: getLevelValue(item),
    levelLabel: formatLevelLabel(getLevelValue(item)),
    principalName,
    principalPhone,
    principalDisplay: [principalName, principalPhone].filter(value => value && value !== "-").join(" "),
    packageInfo: formatPackageInfo(packageName, packageCode),
    packageName,
    packageCode,
    remainingTime: formatRemainingTime(remainingDays),
    remainingDays,
    remainingFunds: "-",
    remainingFundsValue: null,
    inspectionTimes: formatCount(inspectionTimesValue, "次"),
    inspectionTimesValue,
    inspectionCycle,
    parkCount: parkCountValue === null ? "-" : String(parkCountValue),
    parkCountValue,
    buildingCount: buildingCountValue === null ? "-" : String(buildingCountValue),
    buildingCountValue,
    riskDistribution: formatRiskDistribution(
      riskDistributionMetrics.high,
      riskDistributionMetrics.rectification,
      riskDistributionMetrics.normal,
    ),
    riskHighValue: riskDistributionMetrics.high,
    riskRectificationValue: riskDistributionMetrics.rectification,
    riskNormalValue: riskDistributionMetrics.normal,
    createdAt,
  }
}

function getLevelValue(item: CustomerListItem) {
  return getFirstText(item, ["Level", "CustomerLevel", "LevelLabel", "CustomerLevelLabel", "LevelName"], "")
}

function formatPackageInfo(packageName: string, packageCode: string) {
  if (!packageName || packageName === "-") {
    return "-"
  }

  return packageCode ? `${packageName} (${packageCode})` : packageName
}

function formatRemainingTime(days: number | null) {
  if (days === null) {
    return "-"
  }

  if (days < 0) {
    return "已过期"
  }

  return `${days} 天`
}

function formatFunds(value: number | null) {
  if (value === null) {
    return "-"
  }

  return `${value} 万`
}

function formatCount(value: number | null, unit: string) {
  if (value === null) {
    return "-"
  }

  return `${value} ${unit}`
}

function formatRiskDistribution(high: number | null, rectification: number | null, normal: number | null) {
  const values = [
    ["高位", high],
    ["整改", rectification],
    ["正常", normal],
  ].filter(([, value]) => value !== null)

  if (!values.length) {
    return "-"
  }

  return values.map(([label, value]) => `${label} ${value}`).join(" / ")
}

async function fetchAllParks() {
  const pageSize = 200
  const allItems: ParkListItem[] = []
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

    allItems.push(...result.list)

    if (!result.list.length || (totalCount > 0 && allItems.length >= totalCount)) {
      break
    }

    currentPage += 1
  }

  return allItems
}

async function fetchAllBuildings() {
  const pageSize = 200
  const allItems: BuildingListItem[] = []
  let currentPage = 1
  let totalCount = 0

  while (currentPage <= 20) {
    const result = await fetchBuildings({
      PageNum: currentPage,
      PageSize: pageSize,
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

async function fetchAllInspectionPlans() {
  const pageSize = 200
  const allItems: InspectionPlanListItem[] = []
  let currentPage = 1
  let totalCount = 0

  while (currentPage <= 20) {
    const result = await fetchInspectionPlans({
      PageNum: currentPage,
      PageSize: pageSize,
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

async function fetchParkDetails(parks: ParkListItem[]) {
  const tasks = parks
    .map(park => toText(park.Uuid))
    .filter(Boolean)
    .map(async (uuid) => {
      try {
        return await fetchParkDetail({ Uuid: uuid })
      } catch {
        return null
      }
    })

  const results = await Promise.all(tasks)
  return results.filter((item): item is ParkDetailResult => item !== null)
}

function buildCustomerUuidByCustomerId(parks: ParkListItem[]) {
  const map = new Map<string, string>()

  for (const park of parks) {
    const customerId = getFirstText(park, ["CustomerId"], "")
    const customerUuid = getFirstText(park, ["CustomerUuid"], "")

    if (!customerId || !customerUuid || map.has(customerId)) {
      continue
    }

    map.set(customerId, customerUuid)
  }

  return map
}

function buildCustomerUuidByCustomerName(
  customers: CustomerListItem[],
  inspectionPlans: InspectionPlanListItem[],
) {
  const map = new Map<string, string>()

  for (const customer of customers) {
    const customerName = getDirectCustomerName(customer)
    const customerUuid = getCustomerUuid(customer)

    if (!customerName || !customerUuid || map.has(customerName)) {
      continue
    }

    map.set(customerName, customerUuid)
  }

  for (const plan of inspectionPlans) {
    const customerName = toText(plan.CorpName)
    const customerUuid = toText(plan.CustomerUuid)

    if (!customerName || !customerUuid || map.has(customerName)) {
      continue
    }

    map.set(customerName, customerUuid)
  }

  return map
}

function groupParksByCustomerId(parks: ParkListItem[]) {
  const map = new Map<string, ParkListItem[]>()

  for (const park of parks) {
    const customerId = getParkCustomerId(park)

    if (!customerId) {
      continue
    }

    const group = map.get(customerId) ?? []
    group.push(park)
    map.set(customerId, group)
  }

  return map
}

function groupPlansByCustomerId(plans: InspectionPlanListItem[]) {
  const map = new Map<string, InspectionPlanListItem[]>()

  for (const plan of plans) {
    const customerId = toText(plan.CustomerUuid)

    if (!customerId) {
      continue
    }

    const group = map.get(customerId) ?? []
    group.push(plan)
    map.set(customerId, group)
  }

  return map
}

function buildCountByParkUuid(buildings: BuildingListItem[]) {
  const map = new Map<string, number>()

  for (const building of buildings) {
    const parkUuid = toText(building.ParkUuid)

    if (!parkUuid) {
      continue
    }

    map.set(parkUuid, (map.get(parkUuid) ?? 0) + 1)
  }

  return map
}

function getCustomerId(item: CustomerListItem) {
  const numericId = getFirstNumber(item, ["Id", "id", "CustomerId", "customerId"])
  return numericId === null ? "" : String(numericId)
}

function getCustomerUuid(item: CustomerListItem) {
  return getFirstText(item, ["Uuid", "uuid", "CustomerUuid"], "")
}

function getDirectCustomerName(item: CustomerListItem) {
  return getFirstText(item, ["CorpName", "CustomerName", "Name", "CompanyName"], "")
}

function getParkCustomerId(park: ParkListItem) {
  return getFirstText(park, ["CustomerUuid", "CustomerId"], "")
}

function resolveCustomerName(
  item: CustomerListItem,
  plans: InspectionPlanListItem[],
  parks: ParkListItem[],
  parkDetailMap: Map<string, ParkDetailResult>,
) {
  const directName = getFirstText(item, ["CorpName", "CustomerName", "Name", "CompanyName"], "")

  if (directName) {
    return directName
  }

  const planName = uniqueText(plans.map(plan => toText(plan.CorpName)).filter(Boolean))[0]

  if (planName) {
    return planName
  }

  for (const park of parks) {
    const detail = parkDetailMap.get(toText(park.Uuid))
    const detailName = toText(detail?.CorpName)

    if (detailName) {
      return detailName
    }

    const parkName = toText(park.CorpName)

    if (parkName) {
      return parkName
    }
  }

  return "未命名客户"
}

function getPrimaryPackageName(item: CustomerListItem, plans: InspectionPlanListItem[]) {
  const listServices = uniqueText(
    (Array.isArray(item.Services) ? item.Services : [])
      .map(service => toText(service?.Name))
      .filter(Boolean),
  )

  if (listServices.length) {
    return listServices.join("、")
  }

  const serviceNames = uniqueText(plans.map(plan => toText(plan.ServiceName)).filter(Boolean))

  if (!serviceNames.length) {
    return "-"
  }

  return serviceNames.join("、")
}

function getPrimaryPackageCode(item: CustomerListItem, plans: InspectionPlanListItem[]) {
  const listServiceCodes = uniqueText(
    (Array.isArray(item.Services) ? item.Services : [])
      .map(service => toText(service?.Uuid, toText(service?.Id)))
      .filter(Boolean),
  )

  if (listServiceCodes.length) {
    return listServiceCodes.join("、")
  }

  const serviceCodes = uniqueText(
    plans.map(plan => getFirstText(plan, ["ServiceUuid", "ContractCode", "Code"], "")).filter(Boolean),
  )

  if (!serviceCodes.length) {
    return ""
  }

  return serviceCodes.join("、")
}

function getInspectionCycle(plans: InspectionPlanListItem[]) {
  const durations = uniqueText(
    plans
      .map(plan => toNumber(plan.Duration))
      .filter((value): value is number => value !== null)
      .map(value => `${value}天`),
  )

  if (!durations.length) {
    return "-"
  }

  return durations.join("、")
}

function getRemainingDays(plans: InspectionPlanListItem[]) {
  const now = Date.now()
  const candidateValues = plans
    .map((plan) => {
      const nextTime = toTimestamp(plan.NextTime)

      if (nextTime === null) {
        return null
      }

      return Math.ceil((nextTime - now) / (1000 * 60 * 60 * 24))
    })
    .filter((value): value is number => value !== null)

  if (!candidateValues.length) {
    return null
  }

  candidateValues.sort((a, b) => a - b)
  return candidateValues[0]
}

function getBuildingCount(parks: ParkListItem[], buildingCountByParkUuid: Map<string, number>) {
  const totalCount = parks.reduce((sum, park) => sum + (buildingCountByParkUuid.get(toText(park.Uuid)) ?? 0), 0)
  return totalCount || null
}

function getRiskDistributionMetrics() {
  return {
    high: null,
    rectification: null,
    normal: null,
  }
}

function getFirstText(
  record: Record<string, unknown>,
  keys: string[],
  fallback = "",
) {
  for (const key of keys) {
    const value = toText(record[key])

    if (value) {
      return value
    }
  }

  return fallback
}

function getFirstNumber(
  record: Record<string, unknown>,
  keys: string[],
  fallback?: number | null,
) {
  for (const key of keys) {
    const value = toNumber(record[key])

    if (value !== null) {
      return value
    }
  }

  return typeof fallback === "number" && Number.isFinite(fallback) ? fallback : null
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return fallback
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const normalized = Number(value.trim())
    return Number.isFinite(normalized) ? normalized : null
  }

  return null
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
}

function toTimestamp(value: unknown) {
  const text = toText(value)

  if (!text) {
    return null
  }

  const timestamp = new Date(text.replace(" ", "T")).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function jumpToInspectionServices(row: unknown) {
  if (!row || typeof row !== "object") {
    return
  }

  const customerName = toText((row as { customerName?: unknown }).customerName, "")
  const packageName = toText((row as { packageName?: unknown }).packageName, "")
  const packageCode = toText((row as { packageCode?: unknown }).packageCode, "")
  const query = customerName && customerName !== "未命名客户"
    ? customerName
    : packageName && packageName !== "-"
      ? packageName
      : packageCode

  void router.push({
    name: "inspection-services",
    query: query ? { q: query } : undefined,
  })
}

function handleCreateCustomer() {
  router.push({ name: "customer-create" })
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  if (!open) {
    activeLinkedDetailKind.value = null
    activeLinkedDetailUuid.value = ""
  }
}

</script>

<template>
  <TablePageLoading v-if="showInitialLoading" />

  <section v-else class="flex min-h-0 flex-1 flex-col">
    <div v-if="errorMessage" class="px-4 pb-3 pt-3">
      <Alert variant="destructive">
        <i class="ri-error-warning-line" />
        <AlertTitle>客户接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" class="gap-2" @click="loadCustomers">
            <i class="ri-refresh-line text-sm" />
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <TablePage :page="page" @primary-action="handleCreateCustomer">
      <template #cell-packageInfo="{ row }">
        <button
          type="button"
          class="inline-flex max-w-full items-center gap-1 text-left text-[#2B67F6] transition-colors hover:text-[#1D4ED8]"
          @click="jumpToInspectionServices(row)"
        >
          <span class="truncate">{{ row.packageInfo }}</span>
          <i class="ri-arrow-right-up-line shrink-0 text-sm" />
        </button>
      </template>
    </TablePage>

    <LinkedEntityDetailSheet
      :open="Boolean(activeLinkedDetailKind) && Boolean(activeLinkedDetailUuid)"
      :kind="activeLinkedDetailKind"
      :uuid="activeLinkedDetailUuid"
      @update:open="handleLinkedDetailSheetOpenChange"
    />

    <div class="-mx-4 pt-3">
      <div class="flex w-full justify-end px-4">
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
      </div>
    </div>
  </section>
</template>
