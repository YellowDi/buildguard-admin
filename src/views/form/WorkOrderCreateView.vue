<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import FormDatePicker from "@/components/form/FormDatePicker.vue"
import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
import InspectionBuildingCards from "@/components/detail/InspectionBuildingCards.vue"
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage, handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail, fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import type { InspectionItemOption } from "@/lib/inspection-item-options"
import { fetchInspectionPlans, type InspectionPlanListItem } from "@/lib/inspection-plans-api"
import { fetchInspectionServices, type InspectionServiceListItem } from "@/lib/inspection-services-api"
import { fetchParks, type ParkListItem } from "@/lib/parks-api"
import { fetchRepairWorkOrderDictionaries, type RepairDictionaryOption } from "@/lib/repair-work-order-dictionaries"
import { uploadTencentCosFile } from "@/lib/tencent-cos-sdk"
import { cn } from "@/lib/utils"
import {
  createRepairWorkOrder,
  createWorkOrder,
  fetchWorkOrderInspectionHistoryDetail,
  fetchRepairWorkOrderDetail,
  fetchWorkOrderDetail,
  fetchWorkOrders,
  updateRepairWorkOrder,
  updateWorkOrder,
  type RepairWorkOrderDetailResult,
  type WorkOrderBuildInfo,
  type WorkOrderBuildInspectionItem,
  type WorkOrderDetailResult,
  type WorkOrderListItem,
} from "@/lib/work-orders-api"

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
  reportType: string
  important: string
  content: string
  inspectionWorkOrderUuid: string
  workOrderInspectionBuildUuid: string[]
  repairFiles: RepairFormFile[]
}

type RepairFormFile = {
  id: string
  name: string
  url: string
  type: number
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

type RepairInspectionItemOption = InspectionItemOption & {
  buildUuid: string
  buildName: string
  parkUuid: string
  parkName: string
  serviceName: string
  categoryRawName: string
  workOrderUuid: string
  workOrderNo: string
  resultValue: number | null
  resultLabel: string
  scoreValue: number | null
  scoreText: string
  issueText: string
  executorName: string
  createdAt: string
}

type RepairInspectionSourceWorkOrder = {
  uuid: string
  orderNo: string
  createdAt: string
  resultLabel: string
  scoreText: string
}

type RepairInspectionWorkOrderOption = RepairInspectionSourceWorkOrder & {
  items: RepairInspectionItemOption[]
}

const props = withDefaults(defineProps<{
  kind?: WorkOrderPageKind
}>(), {
  kind: "inspection",
})

const DEFAULT_INSPECTION_STATUS = "1"
const NO_REPAIR_INSPECTION_WORK_ORDER_VALUE = "__no-repair-inspection-work-order__"

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
    reportType: "",
    important: "",
    content: "",
    inspectionWorkOrderUuid: "",
    workOrderInspectionBuildUuid: [],
    repairFiles: [],
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
const repairInspectionWorkOrderOptions = ref<RepairInspectionWorkOrderOption[]>([])
const repairInspectionItemOptions = ref<RepairInspectionItemOption[]>([])
const repairDictionariesLoading = ref(false)
const repairInspectionWorkOrdersLoading = ref(false)
const repairInspectionWorkOrdersError = ref("")
const repairInspectionItemsLoading = ref(false)
const repairInspectionItemsError = ref("")
const repairInspectionSourceWorkOrder = ref<RepairInspectionSourceWorkOrder | null>(null)
const repairFileInputRef = ref<HTMLInputElement | null>(null)
const repairFilesUploading = ref(false)
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const formSectionsRef = ref<HTMLElement | null>(null)
const STICKY_HEADER_OFFSET = 112
let observer: IntersectionObserver | null = null
let observerActive = false
let suppressCustomerWatch = false
let suppressRepairParkWatch = false
let suppressRepairInspectionWorkOrderWatch = false
let latestRepairInspectionWorkOrdersRequestId = 0
let latestRepairInspectionItemsRequestId = 0

const isRepairKind = computed(() => props.kind === "repair")
const isInspectionEditMode = computed(() => route.name === "inspection-work-order-edit")
const isRepairEditMode = computed(() => route.name === "repair-work-order-edit")
const isEditMode = computed(() => isInspectionEditMode.value || isRepairEditMode.value)
const isRepairFormMode = computed(() => isRepairKind.value && !isInspectionEditMode.value)
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
const queryReportType = computed(() => typeof route.query.reportType === "string" ? route.query.reportType.trim() : "")
const queryImportant = computed(() => typeof route.query.important === "string" ? route.query.important.trim() : "")
const queryContent = computed(() => typeof route.query.content === "string" ? route.query.content : "")
const queryReturnTo = computed(() => typeof route.query.returnTo === "string" ? route.query.returnTo.trim() : "")
const pageTitle = computed(() => {
  if (isInspectionEditMode.value) {
    return "编辑检测工单"
  }

  if (isRepairEditMode.value) {
    return "编辑报修工单"
  }

  return isRepairKind.value ? "添加报修工单" : "添加检测工单"
})
const repairInspectionBuildGroups = computed(() => {
  const groups = new Map<string, {
    key: string
    buildUuid: string
    buildName: string
    parkName: string
    selectedCount: number
    items: RepairInspectionItemOption[]
  }>()

  repairInspectionItemOptions.value.forEach((item) => {
    const key = item.buildUuid || `build-${item.buildName}`
    const current = groups.get(key) ?? {
      key,
      buildUuid: item.buildUuid,
      buildName: item.buildName || "未命名建筑",
      parkName: item.parkName,
      selectedCount: 0,
      items: [],
    }

    current.items.push(item)
    groups.set(key, current)
  })

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      selectedCount: group.items.reduce((count, item) => (
        form.workOrderInspectionBuildUuid.includes(item.uuid) ? count + 1 : count
      ), 0),
      items: [...group.items].sort((left, right) => (
        left.categoryRawName.localeCompare(right.categoryRawName, "zh-CN")
        || left.name.localeCompare(right.name, "zh-CN")
      )),
    }))
    .sort((left, right) => left.buildName.localeCompare(right.buildName, "zh-CN"))
})
const repairInspectionBuildings = computed(() => repairInspectionBuildGroups.value.map((group) => {
  const completedCount = group.items.filter(item => item.resultValue !== null).length

  return {
    key: group.key,
    buildName: group.buildName,
    status: "completed" as const,
    completedCount,
    totalCount: group.items.length,
    progressValue: group.items.length ? Math.round((completedCount / group.items.length) * 100) : 0,
    progressLabel: "已反馈",
    deadlineText: repairInspectionSourceWorkOrder.value?.createdAt ?? "-",
    scoreText: `${group.selectedCount} / ${group.items.length}`,
    groups: Array.from(group.items.reduce((bucket, item) => {
      const key = item.categoryUuid || item.categoryRawName || "未分类"
      const current = bucket.get(key) ?? {
        key,
        title: item.categoryRawName || "未分类",
        scoreText: "",
        scoreValue: null as number | null,
        items: [] as Array<{
          key: string
          name: string
          categoryName: string
          resultLabel: string
          scoreText: string
          scoreValue: number | null
        }>,
      }

      current.items.push({
        key: item.uuid,
        name: item.name,
        categoryName: item.categoryRawName,
        resultLabel: item.resultLabel,
        scoreText: item.scoreText,
        scoreValue: item.scoreValue,
      })
      const categoryScore = current.items.reduce((sum, row) => sum + Math.max(0, row.scoreValue ?? 0), 0)
      current.scoreValue = categoryScore
      current.scoreText = formatRepairInspectionScore(categoryScore)
      bucket.set(key, current)
      return bucket
    }, new Map<string, {
      key: string
      title: string
      scoreText: string
      scoreValue: number | null
      items: Array<{
        key: string
        name: string
        categoryName: string
        resultLabel: string
        scoreText: string
        scoreValue: number | null
      }>
    }>()).values()),
  }
}))
const disabledRepairInspectionItemKeys = computed(() => repairInspectionItemOptions.value
  .filter(item => item.resultValue === 1 || item.resultLabel === "正常")
  .map(item => item.uuid)
  .filter(Boolean))
const selectedRepairInspectionItemKeys = computed(() => normalizeTextArray(form.workOrderInspectionBuildUuid)
  .filter(uuid => !disabledRepairInspectionItemKeys.value.includes(uuid)))
const hasSelectedRepairInspectionItems = computed(() => selectedRepairInspectionItemKeys.value.length > 0)
const optionalRepairInspectionWorkOrderUuid = computed({
  get: () => form.inspectionWorkOrderUuid || NO_REPAIR_INSPECTION_WORK_ORDER_VALUE,
  set: (value: string) => {
    form.inspectionWorkOrderUuid = value === NO_REPAIR_INSPECTION_WORK_ORDER_VALUE ? "" : value
  },
})
const canSubmit = computed(() => {
  if (isInspectionEditMode.value) {
    return Boolean(normalizeText(workOrderUuid.value) && !submitting.value)
  }

  if (isRepairFormMode.value) {
    return Boolean(
      (!isRepairEditMode.value || normalizeText(workOrderUuid.value))
      &&
      normalizeText(form.customerUuid)
      && normalizeText(form.parkUuid)
      && normalizeText(form.reportType)
      && normalizeText(form.important)
      && (hasSelectedRepairInspectionItems.value || normalizeText(form.content))
      && !submitting.value
      && !customerLoading.value
      && !relatedOptionsLoading.value
      && !repairDictionariesLoading.value
      && !repairFilesUploading.value
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

  if (isInspectionEditMode.value) return "保存备注"
  if (isRepairEditMode.value) return "保存报修工单"
  return isRepairKind.value ? "添加报修工单" : "添加工单"
})
const resetDialogDescription = computed(() =>
  isInspectionEditMode.value
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
  if (isInspectionEditMode.value) {
    await handleInspectionEditSubmit()
    return
  }

  if (isRepairEditMode.value) {
    await handleRepairUpdateSubmit()
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

function buildRepairWorkOrderPayload() {
  if (!normalizeText(form.customerUuid)) {
    toast.error("所属客户信息缺失")
    return null
  }

  if (!normalizeText(form.parkUuid)) {
    toast.error("请选择园区")
    return null
  }

  const reportType = resolveRepairDictionarySubmitText(form.reportType, repairTypeOptions.value)

  if (!reportType) {
    toast.error("请选择报修类型")
    return null
  }

  const important = resolveRepairDictionarySubmitText(form.important, repairImportanceOptions.value)

  if (!important) {
    toast.error("请选择重要程度")
    return null
  }

  const selectedInspectionItemUuids = selectedRepairInspectionItemKeys.value
  const content = selectedInspectionItemUuids.length ? "" : normalizeText(form.content)

  if (!selectedInspectionItemUuids.length && !content) {
    toast.error("请填写报修内容")
    return null
  }

  const repairFiles = form.repairFiles
    .map(file => ({ Type: file.type, Url: normalizeText(file.url) }))
    .filter(file => file.Url)

  return {
    CustomerUuid: normalizeText(form.customerUuid),
    ParkUuid: normalizeText(form.parkUuid),
    ReportType: reportType,
    Important: important,
    Content: content,
    RepairFile: repairFiles,
    WorkOrderInspectionBuildUuid: selectedInspectionItemUuids,
  }
}

function resolveRepairDictionarySubmitText(value: unknown, options: RepairDictionaryOption[]) {
  const normalizedValue = normalizeText(value)

  if (!normalizedValue) {
    return ""
  }

  const matchedOption = options.find(option => (
    option.value === normalizedValue
    || option.uuid === normalizedValue
    || option.label === normalizedValue
    || (option.numericValue !== null && String(option.numericValue) === normalizedValue)
  ))

  return normalizeText(matchedOption?.label) || normalizedValue
}

async function handleRepairCreateSubmit() {
  const payload = buildRepairWorkOrderPayload()

  if (!payload) {
    return
  }

  submitting.value = true

  try {
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

async function handleRepairUpdateSubmit() {
  const uuid = normalizeText(workOrderUuid.value)

  if (!uuid) {
    toast.error("报修工单 Uuid 缺失")
    return
  }

  const payload = buildRepairWorkOrderPayload()

  if (!payload) {
    return
  }

  submitting.value = true

  try {
    await updateRepairWorkOrder({
      Uuid: uuid,
      CustomerUuid: payload.CustomerUuid,
      ParkUuid: payload.ParkUuid,
      ReportType: payload.ReportType,
      Important: payload.Important,
      Content: payload.Content,
      Status: parseIntegerField(form.status) ?? Number(DEFAULT_INSPECTION_STATUS),
    })

    toast.success("报修工单已更新")

    if (queryReturnTo.value === "repair-work-orders") {
      await router.push({ name: "repair-work-orders" })
      return
    }

    await router.push({
      name: "repair-work-order-detail",
      params: { id: uuid },
      query: {
        customerUuid: payload.CustomerUuid,
        returnTo: queryReturnTo.value || "repair-work-orders",
      },
    })
  } catch (error) {
    handleApiError(error, {
      title: "报修工单更新失败",
      fallback: "报修工单更新失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  Object.assign(form, cloneFormState(initialFormState.value))
}

function triggerRepairFileSelect() {
  if (repairFilesUploading.value || submitting.value) {
    return
  }

  repairFileInputRef.value?.click()
}

async function handleRepairFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])

  try {
    await uploadRepairFiles(files)
  } finally {
    if (input) {
      input.value = ""
    }
  }
}

async function handleRepairFileDrop(event: DragEvent) {
  await uploadRepairFiles(Array.from(event.dataTransfer?.files ?? []))
}

async function uploadRepairFiles(files: File[]) {
  if (!files.length || repairFilesUploading.value || submitting.value) {
    return
  }

  const imageFiles = files.filter(file => file.type.startsWith("image/"))

  if (imageFiles.length !== files.length) {
    toast.error("请上传图片格式的需维修图片")
  }

  if (!imageFiles.length) {
    return
  }

  repairFilesUploading.value = true

  try {
    for (const file of imageFiles) {
      const result = await uploadTencentCosFile({
        file,
        key: createRepairFileObjectKey(file),
        contentType: file.type || undefined,
      })

      form.repairFiles.push({
        id: createLocalId("repair-file"),
        name: file.name,
        url: result.url,
        type: 1,
      })
    }

    toast.success(imageFiles.length > 1 ? `已上传 ${imageFiles.length} 张需维修图片` : "需维修图片已上传")
  } catch (error) {
    toast.error("需维修图片上传失败", {
      description: getApiErrorMessage(error, "请稍后重试。"),
    })
  } finally {
    repairFilesUploading.value = false
  }
}

function removeRepairFile(fileId: string) {
  form.repairFiles = form.repairFiles.filter(file => file.id !== fileId)
}

function getRepairFileExtension(fileName: string) {
  const extension = normalizeText(fileName).split(".").pop()?.toUpperCase() ?? ""

  return extension && extension !== normalizeText(fileName).toUpperCase() ? extension : "IMG"
}

async function loadFormContext() {
  loadError.value = ""
  customerOptions.value = []
  planOptions.value = []
  serviceOptions.value = []
  parkOptions.value = []
  repairInspectionWorkOrderOptions.value = []
  repairInspectionItemOptions.value = []

  try {
    if (isRepairKind.value) {
      await ensureRepairDictionaries()
    }

    if (isEditMode.value) {
      await loadEditContext()
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

async function loadEditContext() {
  if (isRepairEditMode.value) {
    await loadRepairEditContext()
    return
  }

  loadInspectionEditContext()
}

function loadInspectionEditContext() {
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
  initialFormState.value = cloneFormState(nextForm)
}

async function loadRepairEditContext() {
  const uuid = normalizeText(workOrderUuid.value)

  if (!uuid) {
    loadError.value = "报修工单 Uuid 缺失，无法加载编辑表单。"
    return
  }

  relatedOptionsLoading.value = true

  try {
    const detail = await fetchRepairWorkOrderDetail({ Uuid: uuid })
    const customerUuid = normalizeText(detail.CustomerUuid) || normalizeRouteField(queryCustomerUuid.value)
    const parkUuid = normalizeText(detail.ParkUuid) || normalizeRouteField(queryParkUuid.value)
    const selectedInspectionItemUuids = normalizeTextArray(detail.WorkOrderInspectionBuildUuid)
    const status = toNumber(detail.Status)
    const nextForm = {
      ...createEmptyForm(),
      customerUuid,
      parkUuid,
      status: status === null ? DEFAULT_INSPECTION_STATUS : String(status),
      reportType: normalizeText(detail.ReportType),
      important: normalizeText(detail.Important),
      content: normalizeText(detail.Content),
      workOrderInspectionBuildUuid: selectedInspectionItemUuids,
    }

    customerName.value = normalizeText(detail.CustomerName)
      || normalizeText(detail.CorpName)
      || queryCustomerName.value
      || "当前客户"

    if (customerUuid) {
      await loadParksForCustomer(customerUuid)

      if (!parkOptions.value.some(item => item.uuid === nextForm.parkUuid)) {
        nextForm.parkUuid = parkOptions.value[0]?.uuid ?? nextForm.parkUuid
      }
    }

    suppressRepairParkWatch = true
    Object.assign(form, nextForm)

    if (customerUuid && nextForm.parkUuid) {
      await loadRepairInspectionWorkOrdersForSelection(
        customerUuid,
        nextForm.parkUuid,
        selectedInspectionItemUuids,
        true,
      )
    }

    initialFormState.value = cloneFormState(form)
  } finally {
    void nextTick(() => {
      suppressRepairParkWatch = false
    })
    relatedOptionsLoading.value = false
  }
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
      await loadRepairInspectionWorkOrdersForSelection(customerUuid, form.parkUuid)
    } else {
      await loadRelatedOptionsForCustomer(customerUuid)
    }

    initialFormState.value = cloneFormState(form)
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
    form.inspectionWorkOrderUuid = ""
    form.workOrderInspectionBuildUuid = []
    suppressCustomerWatch = false

    if (!form.customerUuid) {
      initialFormState.value = cloneFormState(createEmptyForm())
      return
    }

    relatedOptionsLoading.value = true
    if (isRepairKind.value) {
      await ensureRepairDictionaries()
    }
    await loadRelatedOptionsForCustomer(form.customerUuid, true)
    initialFormState.value = cloneFormState(form)
  } finally {
    customerLoading.value = false
    relatedOptionsLoading.value = false
  }
}

async function loadRelatedOptionsForCustomer(customerUuid: string, useRoutePrefill = false) {
  if (isRepairKind.value) {
    await loadParksForCustomer(customerUuid)
    applyRepairPrefill(useRoutePrefill)
    await loadRepairInspectionWorkOrdersForSelection(customerUuid, form.parkUuid)
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

async function loadRepairInspectionWorkOrdersForSelection(
  customerUuid: string,
  parkUuid: string,
  selectedInspectionItemUuids: string[] = [],
  loadItemsImmediately = false,
) {
  const normalizedCustomerUuid = normalizeText(customerUuid)
  const normalizedParkUuid = normalizeText(parkUuid)
  const normalizedSelectedUuids = normalizeTextArray(selectedInspectionItemUuids)
  const requestId = ++latestRepairInspectionWorkOrdersRequestId

  repairInspectionWorkOrderOptions.value = []
  repairInspectionItemOptions.value = []
  repairInspectionWorkOrdersError.value = ""
  repairInspectionItemsError.value = ""
  repairInspectionSourceWorkOrder.value = null
  repairInspectionWorkOrdersLoading.value = false
  repairInspectionItemsLoading.value = false
  form.inspectionWorkOrderUuid = ""
  form.workOrderInspectionBuildUuid = normalizedSelectedUuids

  if (!isRepairKind.value || !normalizedCustomerUuid || !normalizedParkUuid) {
    return
  }

  repairInspectionWorkOrdersLoading.value = true

  try {
    const options = await fetchInspectionWorkOrderOptions(normalizedCustomerUuid, normalizedParkUuid)

    if (requestId !== latestRepairInspectionWorkOrdersRequestId) {
      return
    }

    repairInspectionWorkOrderOptions.value = options
    suppressRepairInspectionWorkOrderWatch = loadItemsImmediately
    form.inspectionWorkOrderUuid = resolvePreferredRepairInspectionWorkOrderUuid(options, normalizedSelectedUuids)

    if (loadItemsImmediately && form.inspectionWorkOrderUuid) {
      await loadRepairInspectionItemsForSelection(
        normalizedCustomerUuid,
        normalizedParkUuid,
        form.inspectionWorkOrderUuid,
        normalizedSelectedUuids,
      )
    }

    if (loadItemsImmediately) {
      void nextTick(() => {
        suppressRepairInspectionWorkOrderWatch = false
      })
    }
  } catch (error) {
    suppressRepairInspectionWorkOrderWatch = false
    if (requestId === latestRepairInspectionWorkOrdersRequestId) {
      repairInspectionWorkOrdersError.value = handleApiError(error, {
        mode: "silent",
        fallback: "检测结果加载失败，请稍后重试。",
      })
    }
  } finally {
    if (requestId === latestRepairInspectionWorkOrdersRequestId) {
      repairInspectionWorkOrdersLoading.value = false
    }
  }
}

async function loadRepairInspectionItemsForSelection(
  customerUuid: string,
  parkUuid: string,
  workOrderUuid: string,
  selectedInspectionItemUuids: string[] = [],
) {
  const normalizedCustomerUuid = normalizeText(customerUuid)
  const normalizedParkUuid = normalizeText(parkUuid)
  const normalizedWorkOrderUuid = normalizeText(workOrderUuid)
  const normalizedSelectedUuids = normalizeTextArray(selectedInspectionItemUuids)
  const requestId = ++latestRepairInspectionItemsRequestId

  repairInspectionItemOptions.value = []
  repairInspectionItemsError.value = ""
  repairInspectionSourceWorkOrder.value = null
  repairInspectionItemsLoading.value = false
  form.workOrderInspectionBuildUuid = normalizedSelectedUuids

  if (!isRepairKind.value || !normalizedCustomerUuid || !normalizedParkUuid || !normalizedWorkOrderUuid) {
    return
  }

  const selectedWorkOrder = repairInspectionWorkOrderOptions.value.find(item => item.uuid === normalizedWorkOrderUuid)

  if (!selectedWorkOrder) {
    return
  }

  repairInspectionItemsLoading.value = true

  try {
    const items = await enrichRepairInspectionIssueText(selectedWorkOrder.items)

    if (requestId !== latestRepairInspectionItemsRequestId) {
      return
    }

    repairInspectionSourceWorkOrder.value = selectedWorkOrder
    repairInspectionItemOptions.value = items
    form.workOrderInspectionBuildUuid = normalizedSelectedUuids.filter(uuid => items.some(item => item.uuid === uuid))
  } catch (error) {
    if (requestId === latestRepairInspectionItemsRequestId) {
      repairInspectionItemsError.value = handleApiError(error, {
        mode: "silent",
        fallback: "检测项加载失败，请稍后重试。",
      })
    }
  } finally {
    if (requestId === latestRepairInspectionItemsRequestId) {
      repairInspectionItemsLoading.value = false
    }
  }
}

function resolvePreferredRepairInspectionWorkOrderUuid(
  options: RepairInspectionWorkOrderOption[],
  selectedInspectionItemUuids: string[],
) {
  const selectedUuidSet = new Set(selectedInspectionItemUuids)

  if (selectedUuidSet.size) {
    const matchedOption = options.find(option => option.items.some(item => selectedUuidSet.has(item.uuid)))

    if (matchedOption) {
      return matchedOption.uuid
    }
  }

  return ""
}

async function fetchInspectionWorkOrderOptions(customerUuid: string, parkUuid: string) {
  const result = await fetchWorkOrders({
    CustomerUuid: customerUuid,
    PageNum: 1,
    PageSize: 50,
  })
  const candidates = [...result.list]
    .filter(item => normalizeText(item.Uuid))
    .sort((left, right) => getWorkOrderSortTime(right) - getWorkOrderSortTime(left))
  const options: RepairInspectionWorkOrderOption[] = []

  for (const candidate of candidates) {
    const detail = await fetchWorkOrderDetail({ Uuid: normalizeText(candidate.Uuid) })
    const baseItems = buildRepairInspectionItemOptionsFromWorkOrder(detail, parkUuid)

    if (!baseItems.length) {
      continue
    }

    options.push({
      ...mapRepairInspectionSourceWorkOrder(detail),
      items: baseItems,
    })
  }

  return options
}

function buildRepairInspectionItemOptionsFromWorkOrder(detail: WorkOrderDetailResult, parkUuid: string) {
  const optionByUuid = new Map<string, RepairInspectionItemOption>()
  const builds = Array.isArray(detail.Builds) ? detail.Builds : []

  builds
    .filter(build => isInspectionBuildInPark(build, detail, parkUuid))
    .forEach((build) => {
      const buildUuid = normalizeText(build.BuildUuid)
      const buildName = normalizeText(build.BuildName) || "未命名建筑"
      const parkName = normalizeText(build.ParkName) || normalizeText(detail.ParkName)
      const items = Array.isArray(build.InspectionItems) ? build.InspectionItems : []

      items.forEach((item) => {
        const uuid = normalizeText(item.Uuid)

        if (!uuid || optionByUuid.has(uuid)) {
          return
        }

        const categoryName = normalizeText(item.CategoryName) || normalizeText(item.CategoryContent) || "未分类"
        const resultValue = toNumber(item.Result)
        const scoreValue = toNumber(item.Score)

        optionByUuid.set(uuid, {
          id: optionByUuid.size + 1,
          uuid,
          name: normalizeText(item.InspectionItemName) || normalizeText(item.Name) || `检测项 ${optionByUuid.size + 1}`,
          categoryUuid: normalizeText(item.CategoryUuid),
          categoryName,
          buildUuid,
          buildName,
          parkUuid,
          parkName,
          serviceName: normalizeText(detail.ServiceName) || normalizeText(detail.PackageName),
          categoryRawName: categoryName,
          workOrderUuid: normalizeText(detail.Uuid),
          workOrderNo: normalizeText(detail.OrderNo),
          resultValue,
          resultLabel: formatRepairInspectionResultLabel(resultValue),
          scoreValue,
          scoreText: formatRepairInspectionScore(scoreValue),
          issueText: resolveRepairInspectionIssueText(item),
          executorName: normalizeText(item.UserName) || normalizeText(item.ExecutorName) || "-",
          createdAt: normalizeText(detail.CreatedAt),
        })
      })
    })

  return Array.from(optionByUuid.values()).sort((left, right) => (
    compareRepairInspectionResult(left, right)
    || left.buildName.localeCompare(right.buildName, "zh-CN")
    || left.categoryRawName.localeCompare(right.categoryRawName, "zh-CN")
    || left.name.localeCompare(right.name, "zh-CN")
  ))
}

async function enrichRepairInspectionIssueText(items: RepairInspectionItemOption[]) {
  const enriched = await Promise.all(items.map(async (item) => {
    if (!item.uuid) {
      return item
    }

    try {
      const history = await fetchWorkOrderInspectionHistoryDetail({ Uuid: item.uuid })
      const latest = history[0]
      const issueText = latest
        ? resolveRepairInspectionHistoryIssueText(latest, item)
        : ""

      return issueText ? { ...item, issueText } : item
    } catch {
      return item
    }
  }))

  return enriched
}

function mapRepairInspectionSourceWorkOrder(detail: WorkOrderDetailResult): RepairInspectionSourceWorkOrder {
  return {
    uuid: normalizeText(detail.Uuid),
    orderNo: normalizeText(detail.OrderNo) || "最近检测工单",
    createdAt: normalizeText(detail.CreatedAt) || normalizeText(detail.UpdatedAt) || "-",
    resultLabel: formatRepairInspectionWorkOrderResultLabel(toNumber(detail.Result)),
    scoreText: formatRepairInspectionWorkOrderScore(detail.Score),
  }
}

function isInspectionBuildInPark(build: WorkOrderBuildInfo, detail: WorkOrderDetailResult, parkUuid: string) {
  const buildParkUuid = normalizeText(build.ParkUuid)
  const detailParkUuid = normalizeText(detail.ParkUuid)

  if (buildParkUuid) {
    return buildParkUuid === parkUuid
  }

  if (detailParkUuid) {
    return detailParkUuid === parkUuid
  }

  return true
}

function getWorkOrderSortTime(item: WorkOrderListItem | WorkOrderDetailResult) {
  const timestamp = Date.parse(
    normalizeText(item.CreatedAt)
    || normalizeText(item.UpdatedAt)
    || normalizeText(item.Deadline),
  )

  return Number.isFinite(timestamp) ? timestamp : 0
}

function compareRepairInspectionResult(left: RepairInspectionItemOption, right: RepairInspectionItemOption) {
  return getRepairInspectionSeverityRank(right) - getRepairInspectionSeverityRank(left)
}

function getRepairInspectionSeverityRank(item: RepairInspectionItemOption) {
  if (item.resultValue === 3) return 4
  if (item.resultValue === 2) return 3
  if ((item.scoreValue ?? 0) > 0) return 2
  if (item.resultValue === 1) return 1
  return 0
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

function normalizeTextArray(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    const normalized = normalizeText(value)
    return normalized ? [normalized] : []
  }

  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(new Set(value.map(normalizeText).filter(Boolean)))
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function formatRepairInspectionResultLabel(value: number | null) {
  if (value === 1) return "正常"
  if (value === 2) return "轻微风险"
  if (value === 3) return "存在隐患"
  if (value === 0 || value === null) return "未反馈"

  return `结果 ${value}`
}

function formatRepairInspectionWorkOrderResultLabel(value: number | null) {
  if (value === 1) return "正常"
  if (value === 2) return "轻微风险"
  if (value === 3) return "存在隐患"
  if (value === 0 || value === null) return "未反馈"

  return `结果 ${value}`
}

function formatRepairInspectionScore(value: number | null) {
  if (value === null) {
    return "-"
  }

  if (Number.isInteger(value)) {
    return `-${value} 分`
  }

  return `-${value.toFixed(1).replace(/\.0$/, "")} 分`
}

function formatRepairInspectionWorkOrderScore(value: unknown) {
  const score = toNumber(value)

  if (score === null) {
    return "-"
  }

  return Number.isInteger(score) ? `${score} 分` : `${score.toFixed(1).replace(/\.0$/, "")} 分`
}

function resolveRepairInspectionIssueText(item: WorkOrderBuildInspectionItem) {
  const record = item as Record<string, unknown>
  return normalizeText(record.Content)
    || normalizeText(record.MeasureContent)
    || normalizeText(record.RepairContent)
    || normalizeText(record.Remark)
    || normalizeText(record.Description)
}

function resolveRepairInspectionHistoryIssueText(
  historyItem: { Content?: string, MeasureContent?: string, Name?: string },
  fallback: RepairInspectionItemOption,
) {
  const content = normalizeText(historyItem.Content)
  const measureContent = normalizeText(historyItem.MeasureContent)
  const name = normalizeText(historyItem.Name)
  const normalizedInspectionName = fallback.name.trim().replace(/\s+/g, "")

  if (content && content.trim().replace(/\s+/g, "") !== normalizedInspectionName) {
    return content
  }

  if (measureContent) {
    return measureContent
  }

  if (name && name.trim().replace(/\s+/g, "") !== normalizedInspectionName) {
    return name
  }

  return ""
}

function cloneFormState(value: WorkOrderFormState): WorkOrderFormState {
  return {
    ...value,
    workOrderInspectionBuildUuid: [...value.workOrderInspectionBuildUuid],
    repairFiles: value.repairFiles.map(file => ({ ...file })),
  }
}

function createRepairFileObjectKey(file: File) {
  const now = new Date()
  const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const random = Math.random().toString(36).slice(2, 10)
  const extension = getObjectKeyFileExtension(file.name)

  return `repair/${datePrefix}/${Date.now()}-${random}${extension}`
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getObjectKeyFileExtension(value: string) {
  const fileName = normalizeText(value).split("?")[0]
  const lastDotIndex = fileName.lastIndexOf(".")

  return lastDotIndex > -1 ? fileName.slice(lastDotIndex).toLowerCase() : ""
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
  suppressRepairParkWatch = false
  suppressRepairInspectionWorkOrderWatch = false
  customerName.value = ""
  customerOptions.value = []
  planOptions.value = []
  serviceOptions.value = []
  parkOptions.value = []
  repairInspectionWorkOrderOptions.value = []
  repairInspectionItemOptions.value = []
  repairInspectionWorkOrdersError.value = ""
  repairInspectionItemsError.value = ""
  repairInspectionSourceWorkOrder.value = null
  Object.assign(form, createEmptyForm())

  if (isEditMode.value) {
    initialFormState.value = cloneFormState(createEmptyForm())
    return
  }

  if (routeCustomerUuid.value) {
    form.customerUuid = routeCustomerUuid.value
    customerName.value = queryCustomerName.value || "当前客户"
    initialFormState.value = cloneFormState({
      ...createEmptyForm(),
      customerUuid: routeCustomerUuid.value,
    })
    return
  }

  initialFormState.value = cloneFormState(createEmptyForm())
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
      repairInspectionWorkOrderOptions.value = []
      repairInspectionItemOptions.value = []
      repairInspectionWorkOrdersError.value = ""
      repairInspectionItemsError.value = ""
      repairInspectionSourceWorkOrder.value = null
      form.planUuid = ""
      form.serviceUuid = ""
      form.packageName = ""
      form.parkUuid = ""
      form.inspectionWorkOrderUuid = ""
      form.workOrderInspectionBuildUuid = []
      form.repairFiles = []
      return
    }

    const matchedCustomer = customerOptions.value.find(item => item.uuid === normalizeText(nextCustomerUuid))
    customerName.value = matchedCustomer?.name ?? ""

    relatedOptionsLoading.value = true
    form.repairFiles = []

    try {
      await loadRelatedOptionsForCustomer(nextCustomerUuid)
    } finally {
      relatedOptionsLoading.value = false
    }
  },
)

watch(
  () => form.parkUuid,
  (nextParkUuid, previousParkUuid) => {
    if (!isRepairFormMode.value || suppressRepairParkWatch || nextParkUuid === previousParkUuid) {
      return
    }

    void loadRepairInspectionWorkOrdersForSelection(form.customerUuid, nextParkUuid)
  },
)

watch(
  () => form.inspectionWorkOrderUuid,
  (nextWorkOrderUuid, previousWorkOrderUuid) => {
    if (!isRepairFormMode.value || suppressRepairInspectionWorkOrderWatch || nextWorkOrderUuid === previousWorkOrderUuid) {
      return
    }

    void loadRepairInspectionItemsForSelection(form.customerUuid, form.parkUuid, nextWorkOrderUuid)
  },
)

watch(
  [() => [...form.workOrderInspectionBuildUuid], disabledRepairInspectionItemKeys],
  ([selectedItemKeys, disabledItemKeys]) => {
    const disabledItemKeySet = new Set(disabledItemKeys)
    const nextSelectedItemKeys = normalizeTextArray(selectedItemKeys).filter(uuid => !disabledItemKeySet.has(uuid))

    if (nextSelectedItemKeys.length !== form.workOrderInspectionBuildUuid.length) {
      form.workOrderInspectionBuildUuid = nextSelectedItemKeys
      return
    }

    if (nextSelectedItemKeys.length && normalizeText(form.content)) {
      form.content = ""
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
  <section
    :class="cn(
      'mx-auto flex w-full min-w-0 flex-col gap-6 pb-8',
      isRepairFormMode ? 'max-w-[1021px]' : 'max-w-4xl',
    )"
  >
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

    <div
      :class="cn(
        'grid min-w-0',
        isRepairFormMode
          ? 'gap-0 lg:grid-cols-[minmax(0,1fr)_1px_460px]'
          : 'gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]',
      )"
    >
      <form
        :class="cn(
          'min-w-0 space-y-0',
          isRepairFormMode ? 'lg:sticky lg:top-24 lg:self-start lg:pr-6' : '',
        )"
        @submit.prevent="handleSubmit"
      >
        <div ref="formSectionsRef" class="min-w-0 space-y-0">
          <FormFieldSection
            id="section-customer"
            quick-nav-label="所属客户"
            label="所属客户"
            label-for="work-order-customer"
            :layout="isRepairFormMode ? 'vertical' : 'responsive'"
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

          <template v-if="isRepairFormMode">
            <FormFieldSection
              id="section-park"
              quick-nav-label="所属园区"
              label="所属园区"
              label-for="work-order-park"
              layout="vertical"
            >
              <Select v-model="form.parkUuid" :disabled="relatedOptionsLoading || !form.customerUuid || !parkOptions.length">
                <SelectTrigger id="work-order-park" class="w-full" @focus="handleFocus('section-park')">
                  <SelectValue :placeholder="!form.customerUuid ? '请先选择所属客户' : relatedOptionsLoading ? '正在加载园区...' : parkOptions.length ? '请选择所属园区' : '当前客户暂无园区'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="park in parkOptions" :key="park.uuid" :value="park.uuid">
                    {{ park.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormFieldSection>

            <FormFieldSection
              id="section-inspection-work-order"
              quick-nav-label="检测结果"
              label="检测结果"
              label-for="repair-source-work-order"
              layout="vertical"
            >
              <Select
                v-model="optionalRepairInspectionWorkOrderUuid"
                :disabled="repairInspectionWorkOrdersLoading || !form.customerUuid || !form.parkUuid || !repairInspectionWorkOrderOptions.length"
              >
                <SelectTrigger id="repair-source-work-order" class="w-full" @focus="handleFocus('section-inspection-work-order')">
                  <SelectValue
                    :placeholder="!form.customerUuid || !form.parkUuid ? '请先选择客户和园区' : repairInspectionWorkOrdersLoading ? '正在加载检测结果...' : repairInspectionWorkOrderOptions.length ? '请选择检测结果' : '当前客户园区暂无检测结果'"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="NO_REPAIR_INSPECTION_WORK_ORDER_VALUE">
                    暂不选择检测结果
                  </SelectItem>
                  <SelectItem
                    v-for="option in repairInspectionWorkOrderOptions"
                    :key="option.uuid"
                    :value="option.uuid"
                  >
                    {{ option.orderNo }} / {{ option.createdAt }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="repairInspectionWorkOrdersError" class="mt-1 text-xs text-destructive">
                {{ repairInspectionWorkOrdersError }}
              </p>
            </FormFieldSection>

            <FormFieldSection
              id="section-report-type"
              quick-nav-label="报修类型"
              label="报修类型"
              label-for="work-order-report-type"
              layout="vertical"
            >
              <Select v-model="form.reportType" :multiple="false" :disabled="repairDictionariesLoading || !repairTypeOptions.length">
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
              layout="vertical"
            >
              <Select v-model="form.important" :multiple="false" :disabled="repairDictionariesLoading || !repairImportanceOptions.length">
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
              v-if="!isRepairEditMode"
              id="section-repair-files"
              quick-nav-label="需维修图片"
              label="需维修图片"
              align="start"
              layout="vertical"
            >
              <div
                :class="cn(
                  'relative flex w-full flex-col rounded-lg border border-dashed border-input bg-background/92 px-4 py-4 transition-[background-color,color] duration-180 ease-out',
                  repairFilesUploading || submitting ? 'cursor-not-allowed opacity-75' : 'hover:bg-[var(--form-control-hover-background)]',
                )"
                @dragover.prevent
                @drop.prevent="handleRepairFileDrop"
              >
                <input
                  ref="repairFileInputRef"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  class="hidden"
                  :disabled="repairFilesUploading || submitting"
                  @change="handleRepairFileChange"
                >

                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex min-w-0 gap-3">
                    <div class="flex size-10 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/35 text-muted-foreground">
                      <i :class="repairFilesUploading ? 'ri-loader-4-line animate-spin text-[20px]' : 'ri-image-add-line text-[20px]'" />
                    </div>
                    <div class="min-w-0 pt-0.5">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="text-sm font-medium text-foreground">
                          {{ repairFilesUploading ? "正在上传图片" : "上传现场需维修图片" }}
                        </p>
                        <span
                          v-if="form.repairFiles.length"
                          class="inline-flex h-5 items-center rounded-md bg-muted px-1.5 text-[12px] font-medium text-muted-foreground tabular-nums"
                        >
                          {{ form.repairFiles.length }} 张
                        </span>
                      </div>
                      <p class="mt-1 text-xs leading-5 text-muted-foreground">
                        支持 JPG、PNG、WEBP，可多选上传，也可以将图片拖放到此处。
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    class="h-9 shrink-0 gap-2 rounded-md"
                    :disabled="repairFilesUploading || submitting"
                    @click="triggerRepairFileSelect"
                    @focus="handleFocus('section-repair-files')"
                  >
                    <i :class="repairFilesUploading ? 'ri-loader-4-line animate-spin text-sm' : 'ri-upload-2-line text-sm'" />
                    {{ repairFilesUploading ? "上传中..." : form.repairFiles.length ? "继续上传" : "选择图片" }}
                  </Button>
                </div>

                <div v-if="form.repairFiles.length" class="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  <figure
                    v-for="file in form.repairFiles"
                    :key="file.id"
                    class="group relative aspect-square overflow-hidden rounded-lg bg-muted shadow-(--shadow-border) transition-[background-color] duration-180 ease-out hover:bg-[var(--form-control-hover-background)]"
                  >
                    <img
                      :src="file.url"
                      :alt="file.name || '需维修图片'"
                      class="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/5"
                    >
                    <figcaption class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/36 to-transparent px-2.5 pb-2 pt-8">
                      <p class="truncate text-[12px] font-medium leading-4 text-white">
                        {{ file.name || "需维修图片" }}
                      </p>
                      <p class="mt-0.5 text-[11px] leading-4 text-white/72">
                        {{ getRepairFileExtension(file.name) }}
                      </p>
                    </figcaption>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      class="absolute right-1.5 top-1.5 size-8 bg-background/92 text-foreground opacity-0 shadow-sm transition-[opacity,background-color] duration-180 ease-out hover:bg-background group-hover:opacity-100 focus-visible:opacity-100"
                      :disabled="repairFilesUploading || submitting"
                      :aria-label="`移除${file.name || '需维修图片'}`"
                      @click="removeRepairFile(file.id)"
                    >
                      <i class="ri-close-line text-base" />
                    </Button>
                  </figure>
                </div>
              </div>
            </FormFieldSection>

            <FormFieldSection
              id="section-content"
              quick-nav-label="报修内容"
              label="报修内容"
              label-for="work-order-content"
              align="start"
              layout="vertical"
              last
            >
              <Textarea
                id="work-order-content"
                v-model="form.content"
                :disabled="hasSelectedRepairInspectionItems"
                :placeholder="hasSelectedRepairInspectionItems ? '已选择检测条目，无需填写报修内容' : '请输入报修内容'"
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

      <Separator v-if="isRepairFormMode" orientation="vertical" class="hidden h-auto bg-border/80 lg:block" />

      <div
        v-if="isRepairFormMode"
        id="section-inspection-items"
        class="min-w-0 lg:max-w-[460px] lg:pl-6"
      >
        <section class="pt-5 pb-5">
          <div>
            <div v-if="repairInspectionWorkOrdersLoading || repairInspectionItemsLoading" class="space-y-3">
              <Skeleton class="h-4 w-40 max-w-full" />
              <div class="grid gap-2.5">
                <Skeleton
                  v-for="slot in 5"
                  :key="`repair-inspection-skeleton-${slot}`"
                  class="h-[4.75rem] w-full rounded-xl"
                />
              </div>
            </div>

            <div v-else-if="repairInspectionWorkOrdersError || repairInspectionItemsError" class="rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <p class="text-sm font-medium text-destructive">检测项加载失败</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ repairInspectionWorkOrdersError || repairInspectionItemsError }}</p>
            </div>

            <div v-else-if="!form.customerUuid || !form.parkUuid" class="border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
              请先在左侧选择客户和园区。
            </div>

            <div v-else-if="!form.inspectionWorkOrderUuid" class="border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
              未选择检测结果，可直接提交；选择检测结果后可勾选检测项。
            </div>

            <InspectionBuildingCards
              v-else
              v-model:selected-item-keys="form.workOrderInspectionBuildUuid"
              title="检测项"
              :count="repairInspectionItemOptions.length"
              :buildings="repairInspectionBuildings"
              :selectable-disabled-item-keys="disabledRepairInspectionItemKeys"
              selectable
              :show-header="false"
              empty-title="暂无检测结果"
              empty-description="当前检测工单暂无可选检测结果。"
              empty-items-text="当前建筑暂无检测结果。"
              total-label="检测结果"
              empty-icon="ri-file-search-line"
              class="max-h-[calc(100vh-18rem)] overflow-y-auto pr-1"
            />
          </div>

        </section>
      </div>

      <FormQuickNav
        v-if="!isRepairFormMode && anchorItems.length"
        class="hidden lg:sticky lg:top-24 lg:block lg:self-start"
        :active-id="activeNavId"
        :items="anchorItems"
        @select="scrollToSection"
      />
    </div>
  </section>
</template>
