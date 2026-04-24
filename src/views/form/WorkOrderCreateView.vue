<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import FormDatePicker from "@/components/form/FormDatePicker.vue"
import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail, fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import { fetchInspectionPlans, type InspectionPlanListItem } from "@/lib/inspection-plans-api"
import { fetchInspectionServices, type InspectionServiceListItem } from "@/lib/inspection-services-api"
import { fetchParks, type ParkListItem } from "@/lib/parks-api"
import { fetchRepairWorkOrderDictionaries, type RepairDictionaryOption } from "@/lib/repair-work-order-dictionaries"
import { createRepairWorkOrder, createWorkOrder, updateWorkOrder } from "@/lib/work-orders-api"

type WorkOrderPageKind = "inspection" | "repair"

type QuickNavItem = {
  id: string
  label: string
}

type WorkOrderFormState = {
  customerUuid: string
  planUuid: string
  serviceUuid: string
  packageName: string
  deadline: string
  status: string
  remark: string
  parkUuid: string
  title: string
  reportType: string
  important: string
  content: string
}

type PlanOption = {
  uuid: string
  name: string
  serviceUuid: string
  serviceName: string
}

type CustomerOption = {
  uuid: string
  name: string
}

type ServiceOption = {
  uuid: string
  name: string
}

type ParkOption = {
  uuid: string
  name: string
}

const props = withDefaults(defineProps<{
  kind?: WorkOrderPageKind
}>(), {
  kind: "inspection",
})

const DEFAULT_INSPECTION_STATUS = "1"

function createEmptyForm(): WorkOrderFormState {
  return {
    customerUuid: "",
    planUuid: "",
    serviceUuid: "",
    packageName: "",
    deadline: "",
    status: DEFAULT_INSPECTION_STATUS,
    remark: "",
    parkUuid: "",
    title: "",
    reportType: "",
    important: "",
    content: "",
  }
}

const router = useRouter()
const route = useRoute()
const form = reactive<WorkOrderFormState>(createEmptyForm())
const initialFormState = ref<WorkOrderFormState>(createEmptyForm())
const customerName = ref("")
const loadError = ref("")
const submitting = ref(false)
const customerLoading = ref(false)
const relatedOptionsLoading = ref(false)
const customerOptions = ref<CustomerOption[]>([])
const planOptions = ref<PlanOption[]>([])
const serviceOptions = ref<ServiceOption[]>([])
const parkOptions = ref<ParkOption[]>([])
const repairImportanceOptions = ref<RepairDictionaryOption[]>([])
const repairTypeOptions = ref<RepairDictionaryOption[]>([])
const repairDictionariesLoading = ref(false)
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const formSectionsRef = ref<HTMLElement | null>(null)
const STICKY_HEADER_OFFSET = 112
let observer: IntersectionObserver | null = null
let observerActive = false
let suppressCustomerWatch = false

const isRepairKind = computed(() => props.kind === "repair")
const isEditMode = computed(() => route.name === "inspection-work-order-edit")
const routeCustomerUuid = computed(() => {
  if (isEditMode.value) {
    return ""
  }

  return typeof route.params.id === "string" ? route.params.id.trim() : ""
})
const workOrderUuid = computed(() => isEditMode.value && typeof route.params.id === "string" ? route.params.id.trim() : "")
const queryCustomerName = computed(() => typeof route.query.customerName === "string" ? route.query.customerName.trim() : "")
const queryCustomerUuid = computed(() => typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : "")
const queryPlanUuid = computed(() => typeof route.query.planUuid === "string" ? route.query.planUuid.trim() : "")
const queryPlanName = computed(() => typeof route.query.planName === "string" ? route.query.planName.trim() : "")
const queryPackageName = computed(() => typeof route.query.packageName === "string" ? route.query.packageName.trim() : "")
const queryDeadline = computed(() => typeof route.query.deadline === "string" ? route.query.deadline.trim() : "")
const queryRemark = computed(() => typeof route.query.remark === "string" ? route.query.remark : "")
const queryParkUuid = computed(() => typeof route.query.parkUuid === "string" ? route.query.parkUuid.trim() : "")
const queryParkName = computed(() => typeof route.query.parkName === "string" ? route.query.parkName.trim() : "")
const queryTitle = computed(() => typeof route.query.title === "string" ? route.query.title.trim() : "")
const queryReportType = computed(() => typeof route.query.reportType === "string" ? route.query.reportType.trim() : "")
const queryImportant = computed(() => typeof route.query.important === "string" ? route.query.important.trim() : "")
const queryContent = computed(() => typeof route.query.content === "string" ? route.query.content : "")
const queryReturnTo = computed(() => typeof route.query.returnTo === "string" ? route.query.returnTo.trim() : "")
const pageTitle = computed(() => {
  if (isEditMode.value) {
    return "编辑检测工单"
  }

  return isRepairKind.value ? "添加报修工单" : "添加检测工单"
})
const canSubmit = computed(() => {
  if (isEditMode.value) {
    return Boolean(normalizeText(workOrderUuid.value) && !submitting.value)
  }

  if (isRepairKind.value) {
    return Boolean(
      normalizeText(form.customerUuid)
      && normalizeText(form.parkUuid)
      && normalizeText(form.title)
      && normalizeText(form.reportType)
      && normalizeText(form.important)
      && normalizeText(form.content)
      && !submitting.value
      && !customerLoading.value
      && !relatedOptionsLoading.value
      && !repairDictionariesLoading.value
    )
  }

  return Boolean(
    normalizeText(form.customerUuid)
    && normalizeText(form.planUuid)
    && normalizeText(form.serviceUuid)
    && normalizeText(form.deadline)
    && !submitting.value
    && !relatedOptionsLoading.value,
  )
})
const submitButtonLabel = computed(() => {
  if (submitting.value) {
    if (isEditMode.value) return "保存中..."
    return isRepairKind.value ? "提交中..." : "提交中..."
  }

  if (isEditMode.value) return "保存备注"
  return isRepairKind.value ? "添加报修工单" : "添加工单"
})
const resetDialogDescription = computed(() =>
  isEditMode.value
    ? "当前已修改的备注将恢复为最近一次加载的内容，此操作不可撤销。"
    : "当前已填写的工单信息都会被清空，此操作不可撤销。",
)

function handleFocus(sectionId: string) {
  activeNavId.value = sectionId
}

function goBack() {
  router.back()
}

function syncAnchorItems() {
  const sectionElements = formSectionsRef.value?.querySelectorAll<HTMLElement>("[data-quick-nav-label][id]") ?? []
  anchorItems.value = Array.from(sectionElements).map(section => ({
    id: section.id,
    label: section.dataset.quickNavLabel ?? section.id,
  }))

  if (!anchorItems.value.some(item => item.id === activeNavId.value)) {
    activeNavId.value = anchorItems.value[0]?.id ?? ""
  }
}

function scrollToSection(id: string) {
  activeNavId.value = id
  observerActive = false
  const section = document.getElementById(id)

  if (!section) {
    return
  }

  const rect = section.getBoundingClientRect()
  const top = rect.top + window.scrollY - STICKY_HEADER_OFFSET

  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })

  nextTick(() => {
    const focusable = section.querySelector<HTMLElement>(
      "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), button:not([disabled])",
    )
    focusable?.focus({ preventScroll: true })
    setTimeout(() => { observerActive = true }, 350)
  })
}

async function handleSubmit() {
  if (isEditMode.value) {
    await handleInspectionEditSubmit()
    return
  }

  if (isRepairKind.value) {
    await handleRepairCreateSubmit()
    return
  }

  await handleInspectionCreateSubmit()
}

async function handleInspectionEditSubmit() {
  if (!normalizeText(workOrderUuid.value)) {
    toast.error("工单 Uuid 缺失")
    return
  }

  submitting.value = true

  try {
    const payload = {
      Uuid: normalizeText(workOrderUuid.value),
      Remark: getOptionalText(form.remark),
    }
    const result = await updateWorkOrder(payload)

    toast.success("工单备注已更新", {
      description: result.Uuid
        ? `工单 UUID：${result.Uuid}`
        : "工单备注已提交到接口。",
    })

    if (queryReturnTo.value === "inspection-work-orders") {
      await router.push({ name: "inspection-work-orders" })
      return
    }

    if (normalizeText(form.customerUuid)) {
      await router.push({
        name: "customer-detail",
        params: { id: normalizeText(form.customerUuid) },
        query: { tab: "work-orders" },
      })
      return
    }

    router.back()
  } catch (error) {
    handleApiError(error, {
      title: "工单更新失败",
      fallback: "工单更新失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

async function handleInspectionCreateSubmit() {
  if (!normalizeText(form.customerUuid)) {
    toast.error("所属客户信息缺失")
    return
  }

  if (!normalizeText(form.planUuid)) {
    toast.error("请选择检测计划")
    return
  }

  if (!normalizeText(form.serviceUuid)) {
    toast.error("请选择检测服务")
    return
  }

  if (!normalizeText(form.deadline)) {
    toast.error("请选择截止时间")
    return
  }

  submitting.value = true

  try {
    const selectedService = serviceOptions.value.find(item => item.uuid === normalizeText(form.serviceUuid))
    const packageName = selectedService?.name || normalizeText(form.packageName)

    if (!packageName) {
      toast.error("检测服务信息缺失")
      return
    }

    const payload = {
      PlanUuid: normalizeText(form.planUuid),
      PackageName: packageName,
      CustomerUuid: normalizeText(form.customerUuid),
      Deadline: normalizeText(form.deadline),
      Status: parseIntegerField(form.status) ?? Number(DEFAULT_INSPECTION_STATUS),
      Remark: getOptionalText(form.remark),
    }
    const result = await createWorkOrder(payload)

    toast.success("工单已创建", {
      description: result.Uuid
        ? `工单 UUID：${result.Uuid}`
        : "工单信息已提交到接口。",
    })

    if (queryReturnTo.value === "inspection-work-orders") {
      await router.push({ name: "inspection-work-orders" })
      return
    }

    await router.push({
      name: "customer-detail",
      params: { id: payload.CustomerUuid },
      query: { tab: "work-orders" },
    })
  } catch (error) {
    handleApiError(error, {
      title: "工单创建失败",
      fallback: "工单创建失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

async function handleRepairCreateSubmit() {
  if (!normalizeText(form.customerUuid)) {
    toast.error("所属客户信息缺失")
    return
  }

  if (!normalizeText(form.parkUuid)) {
    toast.error("请选择园区")
    return
  }

  if (!normalizeText(form.title)) {
    toast.error("请填写报修标题")
    return
  }

  const reportType = parseIntegerField(form.reportType)

  if (reportType === null) {
    toast.error("请填写有效的报修类型")
    return
  }

  const important = parseIntegerField(form.important)

  if (important === null) {
    toast.error("请填写有效的重要程度")
    return
  }

  if (!normalizeText(form.content)) {
    toast.error("请填写报修内容")
    return
  }

  submitting.value = true

  try {
    const payload = {
      CustomerUuid: normalizeText(form.customerUuid),
      ParkUuid: normalizeText(form.parkUuid),
      Title: normalizeText(form.title),
      ReportType: reportType,
      Important: important,
      Content: normalizeText(form.content),
    }
    const result = await createRepairWorkOrder(payload)

    toast.success("报修工单已创建", {
      description: result.Uuid
        ? `工单 UUID：${result.Uuid}`
        : "报修工单信息已提交到接口。",
    })

    if (queryReturnTo.value === "repair-work-orders") {
      await router.push({ name: "repair-work-orders" })
      return
    }

    await router.push({ name: "repair-work-orders" })
  } catch (error) {
    handleApiError(error, {
      title: "报修工单创建失败",
      fallback: "报修工单创建失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  Object.assign(form, initialFormState.value)
}

async function loadFormContext() {
  loadError.value = ""
  customerOptions.value = []
  planOptions.value = []
  serviceOptions.value = []
  parkOptions.value = []

  try {
    if (isEditMode.value) {
      loadEditContext()
      return
    }

    if (routeCustomerUuid.value) {
      await loadFixedCustomerContext(routeCustomerUuid.value)
      return
    }

    await loadSelectableCustomerContext()
  } catch (error) {
    customerName.value = queryCustomerName.value || "当前客户"
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "工单表单初始化失败，请稍后重试。",
    })
  }
}

function loadEditContext() {
  if (!workOrderUuid.value) {
    loadError.value = "工单 Uuid 缺失，无法加载编辑表单。"
    return
  }

  const nextForm = {
    ...createEmptyForm(),
    customerUuid: normalizeRouteField(queryCustomerUuid.value),
    planUuid: normalizeRouteField(queryPlanUuid.value),
    serviceUuid: "",
    packageName: normalizeRouteField(queryPackageName.value),
    deadline: normalizeRouteField(queryDeadline.value),
    status: DEFAULT_INSPECTION_STATUS,
    remark: normalizeRouteField(queryRemark.value),
  }

  customerName.value = queryCustomerName.value || "当前客户"
  planOptions.value = queryPlanUuid.value
    ? [{
        uuid: queryPlanUuid.value,
        name: queryPlanName.value || queryPlanUuid.value,
        serviceUuid: "",
        serviceName: normalizeRouteField(queryPackageName.value),
      }]
    : []

  Object.assign(form, nextForm)
  initialFormState.value = { ...nextForm }
}

async function loadFixedCustomerContext(customerUuid: string) {
  relatedOptionsLoading.value = true

  try {
    const customerDetail = await fetchCustomerDetail({ Uuid: customerUuid })
    customerName.value = normalizeText(customerDetail.CorpName) || queryCustomerName.value || "当前客户"
    form.customerUuid = customerUuid

    if (isRepairKind.value) {
      await ensureRepairDictionaries()
      await loadParksForCustomer(customerUuid)
      applyRepairPrefill()
    } else {
      await loadRelatedOptionsForCustomer(customerUuid)
    }

    initialFormState.value = { ...form }
  } finally {
    relatedOptionsLoading.value = false
  }
}

async function loadSelectableCustomerContext() {
  customerLoading.value = true

  try {
    const customers = await fetchAllCustomers()
    customerOptions.value = customers.map(mapCustomerOption)

    if (!customerOptions.value.length) {
      throw new Error("当前没有可用客户，无法创建工单。")
    }

    const preferredCustomerUuid = normalizeText(queryCustomerUuid.value) || normalizeText(form.customerUuid)
    const nextCustomer = customerOptions.value.find(item => item.uuid === preferredCustomerUuid)

    suppressCustomerWatch = true
    form.customerUuid = nextCustomer?.uuid ?? ""
    customerName.value = nextCustomer?.name ?? ""
    form.planUuid = ""
    form.serviceUuid = ""
    form.packageName = ""
    form.parkUuid = ""
    suppressCustomerWatch = false

    if (!form.customerUuid) {
      initialFormState.value = createEmptyForm()
      return
    }

    relatedOptionsLoading.value = true
    if (isRepairKind.value) {
      await ensureRepairDictionaries()
    }
    await loadRelatedOptionsForCustomer(form.customerUuid, true)
    initialFormState.value = { ...form }
  } finally {
    customerLoading.value = false
    relatedOptionsLoading.value = false
  }
}

async function loadRelatedOptionsForCustomer(customerUuid: string, useRoutePrefill = false) {
  if (isRepairKind.value) {
    await loadParksForCustomer(customerUuid)
    applyRepairPrefill(useRoutePrefill)
    return
  }

  await Promise.all([
    loadPlansForCustomer(customerUuid),
    loadServicesForCustomer(customerUuid),
  ])
  applyInspectionPrefill(useRoutePrefill)
}

async function loadPlansForCustomer(customerUuid: string) {
  const normalizedCustomerUuid = normalizeText(customerUuid)

  planOptions.value = []
  form.planUuid = ""

  if (!normalizedCustomerUuid) {
    return
  }

  const plans = await fetchAllInspectionPlans(normalizedCustomerUuid)
  planOptions.value = plans.map(mapPlanOption)
}

async function loadServicesForCustomer(customerUuid: string) {
  const normalizedCustomerUuid = normalizeText(customerUuid)

  serviceOptions.value = []
  form.serviceUuid = ""
  form.packageName = ""

  if (!normalizedCustomerUuid) {
    return
  }

  const services = await fetchAllInspectionServices(normalizedCustomerUuid)
  serviceOptions.value = services.map(mapServiceOption).filter(item => item.uuid)
}

async function loadParksForCustomer(customerUuid: string) {
  const normalizedCustomerUuid = normalizeText(customerUuid)

  parkOptions.value = []
  form.parkUuid = ""

  if (!normalizedCustomerUuid) {
    return
  }

  const parks = await fetchAllParks(normalizedCustomerUuid)
  parkOptions.value = parks.map(mapParkOption)
}

function applyInspectionPrefill(useRoutePrefill = false) {
  const preferredPlanUuid = useRoutePrefill ? normalizeText(queryPlanUuid.value) : ""
  const hasPreferredPlan = preferredPlanUuid && planOptions.value.some(item => item.uuid === preferredPlanUuid)

  form.planUuid = hasPreferredPlan
    ? preferredPlanUuid
    : planOptions.value[0]?.uuid ?? preferredPlanUuid

  const selectedPlan = planOptions.value.find(item => item.uuid === form.planUuid)
  const matchedQueryService = useRoutePrefill
    ? serviceOptions.value.find(item => item.name === normalizeText(queryPackageName.value))
    : undefined
  const preferredServiceUuid = selectedPlan?.serviceUuid
    || matchedQueryService?.uuid
    || form.serviceUuid
  const hasPreferredService = preferredServiceUuid && serviceOptions.value.some(item => item.uuid === preferredServiceUuid)

  form.serviceUuid = hasPreferredService
    ? preferredServiceUuid
    : serviceOptions.value[0]?.uuid ?? ""
  syncPackageNameWithSelectedService()

  if (useRoutePrefill) {
    form.deadline = normalizeRouteField(queryDeadline.value)
    form.status = DEFAULT_INSPECTION_STATUS
    form.remark = normalizeRouteField(queryRemark.value)
  }
}

function applyRepairPrefill(useRoutePrefill = false) {
  const preferredParkUuid = normalizeText(queryParkUuid.value)
  const fallbackParkUuid = useRoutePrefill ? preferredParkUuid : ""

  if (useRoutePrefill && queryParkUuid.value && queryParkName.value && !parkOptions.value.some(item => item.uuid === queryParkUuid.value)) {
    parkOptions.value = [{ uuid: queryParkUuid.value, name: queryParkName.value }, ...parkOptions.value]
  }

  const hasPreferredPark = useRoutePrefill && preferredParkUuid && parkOptions.value.some(item => item.uuid === preferredParkUuid)

  if (hasPreferredPark || !parkOptions.value.length) {
    form.parkUuid = fallbackParkUuid
  } else {
    form.parkUuid = parkOptions.value[0]?.uuid ?? ""
  }

  if (useRoutePrefill) {
    form.title = normalizeRouteField(queryTitle.value)
    form.reportType = normalizeRouteField(queryReportType.value)
    form.important = normalizeRouteField(queryImportant.value)
    form.content = normalizeRouteField(queryContent.value)
  }
}

async function ensureRepairDictionaries() {
  if (repairImportanceOptions.value.length || repairTypeOptions.value.length) {
    return
  }

  repairDictionariesLoading.value = true

  try {
    const dictionaries = await fetchRepairWorkOrderDictionaries()
    repairImportanceOptions.value = dictionaries.importanceOptions
    repairTypeOptions.value = dictionaries.typeOptions
  } finally {
    repairDictionariesLoading.value = false
  }
}

async function fetchAllInspectionPlans(customerUuid: string) {
  const pageSize = 200
  const allItems: InspectionPlanListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchInspectionPlans({
      CustomerUuid: customerUuid,
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    const matchedItems = result.list.filter(item => normalizeText(item.CustomerUuid) === customerUuid)
    allItems.push(...matchedItems)

    if (!result.list.length || (total > 0 && pageNum * pageSize >= total)) {
      break
    }

    pageNum += 1
  }

  return dedupePlans(allItems)
}

async function fetchAllInspectionServices(customerUuid: string) {
  const pageSize = 200
  const allItems: InspectionServiceListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchInspectionServices({
      CustomerUuid: customerUuid,
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    const matchedItems = result.list.filter(item => normalizeText(item.CustomerUuid) === customerUuid)
    allItems.push(...matchedItems)

    if (!result.list.length || (total > 0 && pageNum * pageSize >= total)) {
      break
    }

    pageNum += 1
  }

  return dedupeServices(allItems)
}

async function fetchAllParks(customerUuid: string) {
  const pageSize = 200
  const allItems: ParkListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchParks({
      CustomerUuid: customerUuid,
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    const matchedItems = result.list.filter(item => normalizeText(item.CustomerUuid) === customerUuid)
    allItems.push(...matchedItems)

    if (!result.list.length || (total > 0 && pageNum * pageSize >= total)) {
      break
    }

    pageNum += 1
  }

  return dedupeParks(allItems)
}

async function fetchAllCustomers() {
  const pageSize = 200
  const allItems: CustomerListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchCustomers({
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && pageNum * pageSize >= total)) {
      break
    }

    pageNum += 1
  }

  return dedupeCustomers(allItems)
}

function dedupePlans(items: InspectionPlanListItem[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const uuid = normalizeText(item.Uuid)

    if (!uuid || seen.has(uuid)) {
      return false
    }

    seen.add(uuid)
    return true
  })
}

function dedupeParks(items: ParkListItem[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const uuid = normalizeText(item.Uuid)

    if (!uuid || seen.has(uuid)) {
      return false
    }

    seen.add(uuid)
    return true
  })
}

function dedupeServices(items: InspectionServiceListItem[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const uuid = normalizeText(item.Uuid)

    if (!uuid || seen.has(uuid)) {
      return false
    }

    seen.add(uuid)
    return true
  })
}

function dedupeCustomers(items: CustomerListItem[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const uuid = normalizeText(item.Uuid)

    if (!uuid || seen.has(uuid)) {
      return false
    }

    seen.add(uuid)
    return true
  })
}

function mapPlanOption(item: InspectionPlanListItem): PlanOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.ServiceName) || `检测计划 ${normalizeText(item.Id) || "-"}`,
    serviceUuid: normalizeText(item.ServiceUuid),
    serviceName: normalizeText(item.ServiceName),
  }
}

function mapServiceOption(item: InspectionServiceListItem): ServiceOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.Name) || `检测服务 ${normalizeText(item.Id) || "-"}`,
  }
}

function mapParkOption(item: ParkListItem): ParkOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.Name) || `园区 ${normalizeText(item.Id) || "-"}`,
  }
}

function mapCustomerOption(item: CustomerListItem): CustomerOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.CorpName) || normalizeText(item.CustomerName) || `客户 ${normalizeText(item.Id) || "-"}`,
  }
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

function getOptionalText(value: unknown) {
  const normalized = normalizeText(value)
  return normalized || undefined
}

function normalizeRouteField(value: string) {
  return value === "-" ? "" : value
}

function parseIntegerField(value: string) {
  if (!/^\d+$/.test(value.trim())) {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

function syncPackageNameWithSelectedService() {
  const selectedService = serviceOptions.value.find(item => item.uuid === normalizeText(form.serviceUuid))
  form.packageName = selectedService?.name ?? ""
}

function resetLocalStateForRoute() {
  loadError.value = ""
  customerName.value = ""
  customerOptions.value = []
  planOptions.value = []
  serviceOptions.value = []
  parkOptions.value = []
  Object.assign(form, createEmptyForm())

  if (isEditMode.value) {
    initialFormState.value = createEmptyForm()
    return
  }

  if (routeCustomerUuid.value) {
    form.customerUuid = routeCustomerUuid.value
    customerName.value = queryCustomerName.value || "当前客户"
    initialFormState.value = {
      ...createEmptyForm(),
      customerUuid: routeCustomerUuid.value,
    }
    return
  }

  initialFormState.value = createEmptyForm()
}

onMounted(() => {
  resetLocalStateForRoute()
  void loadFormContext()

  nextTick(() => {
    syncAnchorItems()
    observer = new IntersectionObserver(
      (entries) => {
        if (!observerActive) {
          return
        }

        const intersecting = entries.filter(entry =>
          entry.isIntersecting && anchorItems.value.some(item => item.id === entry.target.id),
        )

        if (!intersecting.length) {
          return
        }

        const topmost = anchorItems.value.find(item =>
          intersecting.some(entry => entry.target.id === item.id),
        )

        if (topmost) {
          activeNavId.value = topmost.id
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    )

    anchorItems.value.forEach((item) => {
      const element = document.getElementById(item.id)

      if (element) {
        observer?.observe(element)
      }
    })

    setTimeout(() => { observerActive = true }, 150)
  })
})

onUnmounted(() => {
  observer?.disconnect()
})

watch(
  () => route.fullPath,
  () => {
    resetLocalStateForRoute()
    void loadFormContext()
  },
)

watch(
  () => form.customerUuid,
  async (nextCustomerUuid, previousCustomerUuid) => {
    if (routeCustomerUuid.value || suppressCustomerWatch || nextCustomerUuid === previousCustomerUuid || isEditMode.value) {
      return
    }

    if (!normalizeText(nextCustomerUuid)) {
      customerName.value = ""
      planOptions.value = []
      serviceOptions.value = []
      parkOptions.value = []
      form.planUuid = ""
      form.serviceUuid = ""
      form.packageName = ""
      form.parkUuid = ""
      return
    }

    const matchedCustomer = customerOptions.value.find(item => item.uuid === normalizeText(nextCustomerUuid))
    customerName.value = matchedCustomer?.name ?? ""

    relatedOptionsLoading.value = true

    try {
      await loadRelatedOptionsForCustomer(nextCustomerUuid)
    } finally {
      relatedOptionsLoading.value = false
    }
  },
)

watch(
  () => form.planUuid,
  (nextPlanUuid, previousPlanUuid) => {
    if (isRepairKind.value || isEditMode.value || nextPlanUuid === previousPlanUuid) {
      return
    }

    const selectedPlan = planOptions.value.find(item => item.uuid === normalizeText(nextPlanUuid))

    if (!selectedPlan) {
      return
    }

    const matchedService = serviceOptions.value.find(item => item.uuid === selectedPlan.serviceUuid)
      ?? serviceOptions.value.find(item => item.name === selectedPlan.serviceName)

    if (matchedService) {
      form.serviceUuid = matchedService.uuid
    }
  },
)

watch(
  () => form.serviceUuid,
  () => {
    if (isRepairKind.value || isEditMode.value) {
      return
    }

    syncPackageNameWithSelectedService()
  },
)
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      :title="pageTitle"
      :primary-action="{ label: submitButtonLabel, icon: 'ri-file-add-line', disabled: !canSubmit }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: resetDialogDescription }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="loadError" variant="destructive">
      <AlertTitle>工单表单初始化失败</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        <span>{{ loadError }}</span>
        <Button size="sm" variant="outline" class="gap-2" @click="loadFormContext">
          <i class="ri-refresh-line text-sm" />
          重试
        </Button>
      </AlertDescription>
    </Alert>

    <div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]">
      <form class="min-w-0 space-y-0" @submit.prevent="handleSubmit">
        <div ref="formSectionsRef" class="min-w-0 space-y-0">
          <FormFieldSection
            id="section-customer"
            quick-nav-label="所属客户"
            label="所属客户"
            label-for="work-order-customer"
          >
            <Input
              v-if="routeCustomerUuid || isEditMode"
              id="work-order-customer"
              :model-value="customerName || '当前客户'"
              disabled
              class="w-full"
              @focus="handleFocus('section-customer')"
            />
            <Select v-else v-model="form.customerUuid" :disabled="customerLoading || submitting">
              <SelectTrigger id="work-order-customer" class="w-full" @focus="handleFocus('section-customer')">
                <SelectValue :placeholder="customerLoading ? '正在加载客户...' : '请选择所属客户'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="customer in customerOptions" :key="customer.uuid" :value="customer.uuid">
                  {{ customer.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <template v-if="isRepairKind && !isEditMode">
            <FormFieldSection
              id="section-park"
              quick-nav-label="所属园区"
              label="所属园区"
            >
              <Select v-if="parkOptions.length" v-model="form.parkUuid" :disabled="relatedOptionsLoading">
                <SelectTrigger id="work-order-park" class="w-full" @focus="handleFocus('section-park')">
                  <SelectValue :placeholder="relatedOptionsLoading ? '正在加载园区...' : '请选择所属园区'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="park in parkOptions" :key="park.uuid" :value="park.uuid">
                    {{ park.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input
                v-else
                id="work-order-park"
                v-model="form.parkUuid"
                required
                :placeholder="relatedOptionsLoading ? '正在加载园区...' : '请输入园区 UUID'"
                class="w-full"
                @focus="handleFocus('section-park')"
              />
            </FormFieldSection>

            <FormFieldSection
              id="section-title"
              quick-nav-label="报修标题"
              label="报修标题"
              label-for="work-order-title"
            >
              <Input
                id="work-order-title"
                v-model="form.title"
                required
                placeholder="请输入报修标题"
                class="w-full"
                @focus="handleFocus('section-title')"
              />
            </FormFieldSection>

            <FormFieldSection
              id="section-report-type"
              quick-nav-label="报修类型"
              label="报修类型"
              label-for="work-order-report-type"
            >
              <Select v-model="form.reportType" :disabled="repairDictionariesLoading || !repairTypeOptions.length">
                <SelectTrigger id="work-order-report-type" class="w-full" @focus="handleFocus('section-report-type')">
                  <SelectValue :placeholder="repairDictionariesLoading ? '正在加载报修类型...' : repairTypeOptions.length ? '请选择报修类型' : '暂无可用报修类型'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="option in repairTypeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormFieldSection>

            <FormFieldSection
              id="section-important"
              quick-nav-label="重要程度"
              label="重要程度"
              label-for="work-order-important"
            >
              <Select v-model="form.important" :disabled="repairDictionariesLoading || !repairImportanceOptions.length">
                <SelectTrigger id="work-order-important" class="w-full" @focus="handleFocus('section-important')">
                  <SelectValue :placeholder="repairDictionariesLoading ? '正在加载重要程度...' : repairImportanceOptions.length ? '请选择重要程度' : '暂无可用重要程度'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="option in repairImportanceOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormFieldSection>

            <FormFieldSection
              id="section-content"
              quick-nav-label="报修内容"
              label="报修内容"
              label-for="work-order-content"
              align="start"
              last
            >
              <Textarea
                id="work-order-content"
                v-model="form.content"
                placeholder="请输入报修内容"
                class="min-h-[120px] w-full resize-y"
                @focus="handleFocus('section-content')"
              />
            </FormFieldSection>
          </template>

          <template v-else>
            <FormFieldSection
              id="section-plan"
              quick-nav-label="检测计划"
              label="检测计划"
            >
              <Input
                v-if="isEditMode"
                id="work-order-plan"
                :model-value="queryPlanName || form.planUuid || '-'"
                disabled
                class="w-full"
                @focus="handleFocus('section-plan')"
              />
              <Select v-else v-model="form.planUuid" :disabled="relatedOptionsLoading || !form.customerUuid || !planOptions.length">
                <SelectTrigger id="work-order-plan" class="w-full" @focus="handleFocus('section-plan')">
                  <SelectValue :placeholder="!form.customerUuid ? '请先选择所属客户' : relatedOptionsLoading ? '正在加载检测计划...' : planOptions.length ? '请选择检测计划' : '当前客户暂无检测计划'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="plan in planOptions" :key="plan.uuid" :value="plan.uuid">
                    {{ plan.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormFieldSection>

            <FormFieldSection
              id="section-package"
              quick-nav-label="检测服务名称"
              label="检测服务名称"
            >
              <Input
                v-if="isEditMode"
                id="work-order-package"
                :model-value="queryPackageName || form.packageName || '-'"
                disabled
                class="w-full"
                @focus="handleFocus('section-package')"
              />
              <Select v-else v-model="form.serviceUuid" :disabled="relatedOptionsLoading || !form.customerUuid || !serviceOptions.length">
                <SelectTrigger id="work-order-package" class="w-full" @focus="handleFocus('section-package')">
                  <SelectValue :placeholder="!form.customerUuid ? '请先选择所属客户' : relatedOptionsLoading ? '正在加载检测服务...' : serviceOptions.length ? '请选择检测服务' : '当前客户暂无检测服务'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="service in serviceOptions" :key="service.uuid" :value="service.uuid">
                    {{ service.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormFieldSection>

            <FormFieldSection
              id="section-deadline"
              quick-nav-label="截止时间"
              label="截止时间"
              label-for="work-order-deadline"
            >
              <FormDatePicker
                id="work-order-deadline"
                v-model="form.deadline"
                :disabled="isEditMode"
                :placeholder="isEditMode ? '-' : '请选择截止时间'"
                @focus="handleFocus('section-deadline')"
              />
            </FormFieldSection>

            <FormFieldSection
              id="section-remark"
              quick-nav-label="备注"
              label="备注"
              label-for="work-order-remark"
              align="start"
              last
            >
              <Textarea
                id="work-order-remark"
                v-model="form.remark"
                placeholder="请输入备注"
                class="min-h-[120px] w-full resize-y"
                @focus="handleFocus('section-remark')"
              />
            </FormFieldSection>
          </template>
        </div>
      </form>

      <FormQuickNav
        v-if="anchorItems.length"
        class="hidden lg:sticky lg:top-24 lg:block lg:self-start"
        :active-id="activeNavId"
        :items="anchorItems"
        @select="scrollToSection"
      />
    </div>
  </section>
</template>
