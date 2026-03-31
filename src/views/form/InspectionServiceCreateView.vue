<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import InspectionItemPicker from "@/components/inspection/InspectionItemPicker.vue"
import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
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
import { cn } from "@/lib/utils"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import {
  fetchInspectionServiceTemplates,
  type InspectionServiceTemplateRecord,
} from "@/lib/inspection-service-templates-api"
import {
  createInspectionService,
  fetchInspectionServiceDetail,
  updateInspectionService,
} from "@/lib/inspection-services-api"
import { fetchAllInspectionItemOptions, type InspectionItemOption } from "@/lib/inspection-item-options"

type QuickNavItem = {
  id: string
  label: string
}

type InspectionServiceFormState = {
  customerUuid: string
  name: string
  level: string
  managerName: string
  managerPhone: string
  templateUuid: string
  inspectionUuids: string[]
  buildUuids: string[]
  remark: string
}

type CustomerOption = {
  uuid: string
  name: string
}

type TemplateOption = {
  uuid: string
  name: string
  inspections: {
    categoryName: string
    inspectionName: string
    inspectionUuid: string
  }[]
}

type BuildOption = {
  uuid: string
  name: string
  parkName: string
}

type BuildGroup = {
  key: string
  parkName: string
  selectedCount: number
  builds: BuildOption[]
}

const DEFAULT_LEVEL_OPTIONS = ["S级", "A级", "B级", "C级"] as const

function createEmptyForm(): InspectionServiceFormState {
  return {
    customerUuid: "",
    name: "",
    level: "",
    managerName: "",
    managerPhone: "",
    templateUuid: "",
    inspectionUuids: [],
    buildUuids: [],
    remark: "",
  }
}

const router = useRouter()
const route = useRoute()
const form = reactive<InspectionServiceFormState>(createEmptyForm())
const initialFormState = ref<InspectionServiceFormState>(createEmptyForm())
const loadError = ref("")
const submitting = ref(false)
const loadingDetail = ref(false)
const customerLoading = ref(false)
const templateLoading = ref(false)
const buildingLoading = ref(false)
const customerOptions = ref<CustomerOption[]>([])
const templateOptions = ref<TemplateOption[]>([])
const buildingOptions = ref<BuildOption[]>([])
const templateLibraryOpen = ref(false)
const templateLibraryLoading = ref(false)
const templateLibraryError = ref("")
const templateKeyword = ref("")
const templateExpandedUuid = ref("")
const inspectionPickerLoading = ref(false)
const inspectionPickerError = ref("")
const inspectionItemOptions = ref<InspectionItemOption[]>([])
const inspectionSelectionMode = ref<"template" | "custom">("template")
const initialInspectionSelectionMode = ref<"template" | "custom">("template")
const expandedBuildGroupKey = ref("")
const loadedBuildingsCustomerUuid = ref("")
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const formSectionsRef = ref<HTMLElement | null>(null)
const suppressCustomerWatch = ref(false)
const STICKY_HEADER_OFFSET = 112
let observer: IntersectionObserver | null = null
let observerActive = false

const queryCustomerUuid = computed(() => typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : "")
const queryCustomerName = computed(() => typeof route.query.customerName === "string" ? route.query.customerName.trim() : "")
const inspectionServiceUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const isEditMode = computed(() => route.name === "inspection-service-edit" && Boolean(inspectionServiceUuid.value))
const pageTitle = computed(() => isEditMode.value ? "编辑检测服务" : "添加检测服务")
const selectedCustomerName = computed(() =>
  customerOptions.value.find(item => item.uuid === form.customerUuid)?.name
  || queryCustomerName.value
  || "",
)
const selectedTemplateName = computed(() =>
  templateOptions.value.find(item => item.uuid === normalizeText(form.templateUuid))?.name || "",
)
const selectedTemplateOption = computed(() =>
  templateOptions.value.find(item => item.uuid === normalizeText(form.templateUuid)) ?? null,
)
const filteredTemplateOptions = computed(() => {
  const keyword = normalizeText(templateKeyword.value).toLowerCase()

  if (!keyword) {
    return templateOptions.value
  }

  return templateOptions.value.filter((item) => {
    return item.name.toLowerCase().includes(keyword)
      || item.uuid.toLowerCase().includes(keyword)
      || item.inspections.some(inspection =>
        inspection.inspectionName.toLowerCase().includes(keyword)
        || inspection.categoryName.toLowerCase().includes(keyword),
      )
  })
})
const levelOptions = computed(() => {
  const detected = new Set<string>()
  const values: string[] = [...DEFAULT_LEVEL_OPTIONS]

  for (const item of inspectionLevelsCache.value) {
    if (!detected.has(item)) {
      detected.add(item)
      values.push(item)
    }
  }

  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
})
const groupedBuildings = computed<BuildGroup[]>(() => {
  const groups = new Map<string, BuildOption[]>()

  for (const item of buildingOptions.value) {
    const parkName = item.parkName || "未命名园区"
    const current = groups.get(parkName) ?? []
    current.push(item)
    groups.set(parkName, current)
  }

  return Array.from(groups.entries()).map(([parkName, builds]) => ({
    key: `park-${parkName}`,
    parkName,
    selectedCount: builds.reduce((count, build) => (
      form.buildUuids.includes(build.uuid) ? count + 1 : count
    ), 0),
    builds,
  }))
})
const selectedTemplateInspectionUuids = computed(() => dedupeText(
  (selectedTemplateOption.value?.inspections ?? []).map(inspection => inspection.inspectionUuid),
))
const selectedInspectionCount = computed(() => form.inspectionUuids.length)
const inspectionSelectionHint = computed(() => {
  if (selectedInspectionCount.value > 0) {
    return inspectionSelectionMode.value === "custom"
      ? `当前已手动选择 ${selectedInspectionCount.value} 个检测项。`
      : `已同步当前模板的 ${selectedInspectionCount.value} 个检测项，可继续手动调整。`
  }

  if (normalizeText(form.templateUuid)) {
    return "当前模板暂无检测项，或模板候选尚未同步完成。"
  }

  return "请先选择检测模板，再按需调整检测项。"
})

watch(templateLibraryOpen, (open) => {
  if (open) {
    templateExpandedUuid.value = ""
  }
})
const selectedBuildCount = computed(() => form.buildUuids.length)
const canSubmit = computed(() =>
  Boolean(
    normalizeText(form.customerUuid)
    && normalizeText(form.name)
    && normalizeText(form.level)
    && normalizeText(form.managerName)
    && normalizeText(form.managerPhone)
    && form.inspectionUuids.length > 0
    && form.buildUuids.length > 0
    && !submitting.value
    && !loadingDetail.value
    && !customerLoading.value
    && !templateLoading.value
    && !buildingLoading.value,
  ),
)
const submitButtonLabel = computed(() => {
  if (loadingDetail.value) {
    return "加载中..."
  }

  if (submitting.value) {
    return isEditMode.value ? "保存中..." : "提交中..."
  }

  return isEditMode.value ? "保存检测服务" : "添加检测服务"
})
const inspectionLevelsCache = ref<string[]>([])

async function handleUseBuildingTemplate() {
  templateLibraryOpen.value = true

  if (!templateOptions.value.length && !templateLibraryLoading.value) {
    try {
      await loadTemplateOptions()
    } catch {
      // Error state is rendered inside the dialog; keep the dialog open.
    }
  }
}

function applyTemplate(template: TemplateOption) {
  form.templateUuid = template.uuid
  syncInspectionSelectionFromTemplate(template)
  templateLibraryOpen.value = false
  toast.success("检测模板已选中", {
    description: template.name || template.uuid,
  })
}

function syncInspectionSelectionFromTemplate(template = selectedTemplateOption.value) {
  inspectionSelectionMode.value = "template"
  form.inspectionUuids = dedupeText((template?.inspections ?? []).map(item => item.inspectionUuid))
}

function updateInspectionSelection(values: string[]) {
  inspectionSelectionMode.value = "custom"
  form.inspectionUuids = dedupeText(values)
}


function buildingPickCardClass(checked: boolean, disabled: boolean) {
  return cn(
    "relative flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3 shadow-xs transition-all duration-200",
    "outline-none focus-within:ring-2 focus-within:ring-[color:var(--theme-primary)]/25",
    disabled && "cursor-not-allowed opacity-55",
    checked
      ? "border-[color:var(--theme-primary)]/50 bg-[color:var(--theme-primary)]/10 shadow-sm ring-1 ring-[color:var(--theme-primary)]/15"
      : "border-border/55 bg-background/95 hover:border-[color:var(--theme-primary)]/35 hover:bg-muted/45 hover:shadow-sm",
  )
}

function handleFocus(sectionId: string) {
  activeNavId.value = sectionId
}

function goBack() {
  if (isEditMode.value && inspectionServiceUuid.value) {
    void router.push({
      name: "inspection-service-detail",
      params: { id: inspectionServiceUuid.value },
    })
    return
  }

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
      'input:not([type=hidden]):not([disabled]), textarea:not([disabled]), button:not([disabled])',
    )
    focusable?.focus({ preventScroll: true })
    setTimeout(() => { observerActive = true }, 350)
  })
}

async function handleSubmit() {
  if (loadingDetail.value) {
    return
  }

  if (!normalizeText(form.customerUuid)) {
    toast.error("请选择所属客户")
    return
  }

  if (!normalizeText(form.name)) {
    toast.error("请填写服务名称")
    return
  }

  if (!normalizeText(form.level)) {
    toast.error("请填写服务等级")
    return
  }

  if (!normalizeText(form.managerName) || !normalizeText(form.managerPhone)) {
    toast.error("请完善负责人信息")
    return
  }

  if (!form.inspectionUuids.length) {
    toast.error("请至少选择一个检测项")
    return
  }

  if (!form.buildUuids.length) {
    toast.error("请至少选择一个建筑")
    return
  }

  submitting.value = true

  try {
    const payload = {
      Name: normalizeText(form.name),
      CustomerUuid: normalizeText(form.customerUuid),
      Level: normalizeText(form.level),
      ManagerName: normalizeText(form.managerName),
      ManagerPhone: normalizeText(form.managerPhone),
      TemplateUuid: normalizeText(form.templateUuid),
      InspectionUuids: dedupeText(form.inspectionUuids),
      BuildUuids: dedupeText(form.buildUuids),
      Remark: getOptionalText(form.remark),
    }

    if (isEditMode.value) {
      const result = await updateInspectionService({
        Uuid: inspectionServiceUuid.value,
        ...payload,
      })

      toast.success("检测服务已更新", {
        description: result.Uuid
          ? `服务 UUID：${result.Uuid}`
          : `${selectedCustomerName.value || "当前客户"}的检测服务信息已保存。`,
      })

      await router.push({
        name: "inspection-service-detail",
        params: { id: result.Uuid || inspectionServiceUuid.value },
      })
      return
    }

    const result = await createInspectionService(payload)

    toast.success("检测服务已创建", {
      description: result.Uuid
        ? `服务 UUID：${result.Uuid}`
        : `${selectedCustomerName.value || "当前客户"}的检测服务已提交到接口。`,
    })

    await router.push({ name: "inspection-services" })
  } catch (error) {
    handleApiError(error, {
      title: isEditMode.value ? "检测服务更新失败" : "检测服务创建失败",
      fallback: isEditMode.value ? "检测服务更新失败，请稍后重试。" : "检测服务创建失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  inspectionSelectionMode.value = initialInspectionSelectionMode.value
  Object.assign(form, {
    ...initialFormState.value,
    inspectionUuids: [...initialFormState.value.inspectionUuids],
    buildUuids: [...initialFormState.value.buildUuids],
  })
}

async function loadInitialOptions() {
  loadError.value = ""
  customerLoading.value = true

  try {
    const customers = await fetchAllCustomers()

    try {
      await loadTemplateOptions()
    } catch {
      templateOptions.value = []
    }

    try {
      await loadInspectionItemOptions()
    } catch {
      inspectionItemOptions.value = []
    }

    customerOptions.value = customers
      .map(mapCustomerOption)
      .filter(item => item.uuid)

    if (!form.customerUuid) {
      const preferredCustomerUuid = customerOptions.value.some(item => item.uuid === queryCustomerUuid.value)
        ? queryCustomerUuid.value
        : customerOptions.value[0]?.uuid ?? ""

      form.customerUuid = preferredCustomerUuid
    }

    if (isEditMode.value) {
      await loadInspectionServiceForEdit(inspectionServiceUuid.value)
    } else {
      initialFormState.value = {
        ...createEmptyForm(),
        customerUuid: form.customerUuid,
      }

      if (form.customerUuid) {
        await loadBuildingsForCustomer(form.customerUuid)
      }
    }
  } catch (error) {
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: isEditMode.value ? "检测服务编辑页初始化失败，请稍后重试。" : "检测服务表单初始化失败，请稍后重试。",
    })
  } finally {
    customerLoading.value = false
  }
}

async function loadBuildingsForCustomer(customerUuid: string, selectedBuildUuids: string[] = []) {
  if (customerUuid && loadedBuildingsCustomerUuid.value === customerUuid && buildingOptions.value.length) {
    form.buildUuids = dedupeText(selectedBuildUuids.length ? selectedBuildUuids : form.buildUuids)
    return
  }

  loadError.value = ""
  loadedBuildingsCustomerUuid.value = ""
  buildingOptions.value = []
  form.buildUuids = []

  if (!customerUuid) {
    return
  }

  buildingLoading.value = true

  try {
    const buildings = await fetchAllBuildings(customerUuid)
    buildingOptions.value = buildings
      .map(mapBuildOption)
      .filter(item => item.uuid)
    loadedBuildingsCustomerUuid.value = customerUuid
    form.buildUuids = dedupeText(
      selectedBuildUuids.filter(buildUuid => buildingOptions.value.some(option => option.uuid === buildUuid)),
    )
    initialFormState.value = {
      ...initialFormState.value,
      customerUuid,
      buildUuids: [...form.buildUuids],
    }
  } catch (error) {
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "所属建筑加载失败，请稍后重试。",
    })
  } finally {
    buildingLoading.value = false
  }
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

    if (!result.list.length || (total > 0 && allItems.length >= total)) {
      break
    }

    pageNum += 1
  }

  return dedupeByUuid(allItems)
}

async function loadTemplateOptions() {
  templateLoading.value = true
  templateLibraryLoading.value = true
  templateLibraryError.value = ""

  const pageSize = 200
  const allItems: InspectionServiceTemplateRecord[] = []
  let pageNum = 1
  let total = 0

  try {
    while (pageNum <= 20) {
      const result = await fetchInspectionServiceTemplates({
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

    const options = dedupeText(allItems.map(item => normalizeText(item.Uuid))).map((uuid) => {
      const current = allItems.find(item => normalizeText(item.Uuid) === uuid)

      return {
        uuid,
        name: normalizeText(current?.Name) || `模板 ${normalizeText(current?.Id) || uuid || "-"}`,
        inspections: Array.isArray(current?.Inspections)
          ? current.Inspections.map(inspection => ({
              categoryName: normalizeText(inspection.CategoryName),
              inspectionName: normalizeText(inspection.InspectionName),
              inspectionUuid: normalizeText(inspection.InspectionUuid),
            }))
          : [],
      }
    })

    templateOptions.value = options
    return options
  } catch (error) {
    templateLibraryError.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测模板列表加载失败，请稍后重试。",
    })
    throw error
  } finally {
    templateLoading.value = false
    templateLibraryLoading.value = false
  }
}

async function loadInspectionItemOptions() {
  inspectionPickerLoading.value = true
  inspectionPickerError.value = ""

  try {
    inspectionItemOptions.value = await fetchAllInspectionItemOptions()
  } catch (error) {
    inspectionPickerError.value = handleApiError(error, {
      mode: "silent",
      title: "检测项接口加载失败",
      fallback: "检测项列表加载失败，请稍后重试。",
    })
    throw error
  } finally {
    inspectionPickerLoading.value = false
  }
}


async function fetchAllBuildings(customerUuid: string) {
  const pageSize = 200
  const allItems: BuildingListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchBuildings({
      CustomerUuid: customerUuid,
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

  return dedupeByUuid(allItems)
}

async function loadInspectionServiceForEdit(uuid: string) {
  if (!uuid) {
    loadError.value = "检测服务 Uuid 缺失，无法加载编辑资料。"
    return
  }

  loadingDetail.value = true
  loadError.value = ""

  try {
    const detail = await fetchInspectionServiceDetail({ Uuid: uuid })
    const nextCustomerUuid = normalizeText(detail.CustomerUuid)
    const nextInspectionUuids = dedupeText([
      ...((Array.isArray(detail.InspectionUuids) ? detail.InspectionUuids : []).map(item => normalizeText(item))),
      ...((Array.isArray(detail.Inspections) ? detail.Inspections : []).map(item => normalizeText(item.InspectionUuid))),
    ])
    const nextBuildUuids = dedupeText(
      (Array.isArray(detail.Builds) ? detail.Builds : []).map(item => normalizeText(item.BuildUuid)),
    )

    suppressCustomerWatch.value = true

    Object.assign(form, {
      customerUuid: nextCustomerUuid,
      name: normalizeText(detail.Name),
      level: normalizeText(detail.Level),
      managerName: normalizeText(detail.ManagerName),
      managerPhone: normalizeText(detail.ManagerPhone),
      templateUuid: normalizeText(detail.TemplateUuid),
      inspectionUuids: [...nextInspectionUuids],
      buildUuids: [],
      remark: normalizeText(detail.Remark),
    })

    inspectionSelectionMode.value = nextInspectionUuids.length ? "custom" : "template"

    if (nextCustomerUuid) {
      await loadBuildingsForCustomer(nextCustomerUuid, nextBuildUuids)
    }

    if (!inspectionItemOptions.value.length && nextInspectionUuids.length) {
      try {
        await loadInspectionItemOptions()
      } catch {
        // Keep the page interactive; selected UUIDs can still be previewed from template data when available.
      }
    }

    initialFormState.value = {
      customerUuid: nextCustomerUuid,
      name: normalizeText(detail.Name),
      level: normalizeText(detail.Level),
      managerName: normalizeText(detail.ManagerName),
      managerPhone: normalizeText(detail.ManagerPhone),
      templateUuid: normalizeText(detail.TemplateUuid),
      inspectionUuids: [...form.inspectionUuids],
      buildUuids: [...form.buildUuids],
      remark: normalizeText(detail.Remark),
    }
    initialInspectionSelectionMode.value = inspectionSelectionMode.value
  } catch (error) {
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测服务资料加载失败，请稍后重试。",
    })
  } finally {
    suppressCustomerWatch.value = false
    loadingDetail.value = false
  }
}

function mapCustomerOption(item: CustomerListItem): CustomerOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.CorpName) || `客户 ${normalizeText(item.Id) || "-"}`,
  }
}

function mapBuildOption(item: BuildingListItem): BuildOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.Name) || "未命名建筑",
    parkName: normalizeText(item.ParkName) || "未命名园区",
  }
}

function isBuildChecked(buildUuid: string) {
  return form.buildUuids.includes(buildUuid)
}

function updateBuildChecked(buildUuid: string, checked: boolean | "indeterminate") {
  if (checked === "indeterminate") {
    return
  }

  if (checked) {
    form.buildUuids = dedupeText([...form.buildUuids, buildUuid])
    return
  }

  form.buildUuids = form.buildUuids.filter(item => item !== buildUuid)
}

watch(
  groupedBuildings,
  (groups) => {
    if (!groups.length) {
      expandedBuildGroupKey.value = ""
      return
    }

    if (groups.some(group => group.key === expandedBuildGroupKey.value)) {
      return
    }

    expandedBuildGroupKey.value = groups[0]?.key ?? ""
  },
  { immediate: true },
)

function dedupeByUuid<T extends { Uuid?: unknown }>(items: T[]) {
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

function dedupeText(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
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

function resetLocalStateForRoute() {
  loadError.value = ""
  loadingDetail.value = false
  templateLibraryOpen.value = false
  templateLibraryError.value = ""
  templateKeyword.value = ""
  inspectionPickerLoading.value = false
  inspectionPickerError.value = ""
  inspectionItemOptions.value = []
  inspectionSelectionMode.value = "template"
  initialInspectionSelectionMode.value = "template"
  customerOptions.value = []
  templateOptions.value = []
  buildingOptions.value = []
  loadedBuildingsCustomerUuid.value = ""
  Object.assign(form, createEmptyForm())

  if (queryCustomerUuid.value) {
    form.customerUuid = queryCustomerUuid.value
  }

  initialFormState.value = {
    ...createEmptyForm(),
    customerUuid: form.customerUuid,
  }
}

onMounted(() => {
  resetLocalStateForRoute()
  void loadInitialOptions()

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
  () => form.customerUuid,
  (customerUuid, previousCustomerUuid) => {
    if (suppressCustomerWatch.value || customerUuid === previousCustomerUuid) {
      return
    }

    void loadBuildingsForCustomer(customerUuid)
  },
)

watch(
  selectedTemplateInspectionUuids,
  (inspectionUuids) => {
    if (inspectionSelectionMode.value !== "template") {
      return
    }

    form.inspectionUuids = [...inspectionUuids]
  },
  { immediate: true },
)

watch(
  () => [route.name, route.params.id, route.query.customerUuid, route.query.customerName] as const,
  () => {
    resetLocalStateForRoute()
    void loadInitialOptions()
  },
)
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      :title="pageTitle"
      :primary-action="{ label: submitButtonLabel, icon: isEditMode ? 'ri-save-line' : 'ri-add-line', disabled: !canSubmit }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: isEditMode ? '当前已修改的检测服务信息将恢复为最近一次加载的内容，此操作不可撤销。' : '当前已填写的检测服务信息都会被清空，此操作不可撤销。' }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="loadError" variant="destructive">
      <AlertTitle>{{ isEditMode ? "检测服务资料加载失败" : "检测服务表单初始化失败" }}</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        <span>{{ loadError }}</span>
        <Button size="sm" variant="outline" @click="loadInitialOptions">
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
          >
            <Select v-model="form.customerUuid" :disabled="loadingDetail || customerLoading || !customerOptions.length">
              <SelectTrigger id="inspection-service-customer" class="w-full" @focus="handleFocus('section-customer')">
                <SelectValue :placeholder="customerLoading ? '正在加载客户...' : '请选择所属客户'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="customer in customerOptions" :key="customer.uuid" :value="customer.uuid">
                  {{ customer.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-name"
            quick-nav-label="服务名称"
            label="服务名称"
            label-for="inspection-service-name"
          >
            <Input
              id="inspection-service-name"
              v-model="form.name"
              required
              placeholder="请输入服务名称"
              class="w-full"
              :disabled="loadingDetail"
              @focus="handleFocus('section-name')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-level"
            quick-nav-label="服务等级"
            label="服务等级"
            description="支持直接输入，也可参考已有等级。"
            label-for="inspection-service-level"
          >
            <div class="space-y-3">
              <Input
                id="inspection-service-level"
                v-model="form.level"
                list="inspection-service-level-options"
                required
                placeholder="请输入服务等级，例如 A级、S级"
                class="w-full"
                :disabled="loadingDetail"
                @focus="handleFocus('section-level')"
              />
              <datalist id="inspection-service-level-options">
                <option v-for="level in levelOptions" :key="level" :value="level" />
              </datalist>
            </div>
          </FormFieldSection>

          <div
            id="section-inspections"
            data-quick-nav-label="检测项"
            class="scroll-mt-28 border-b border-dashed border-border py-5"
          >
            <FieldSet>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <FieldGroup class="min-w-0 flex-1 gap-1">
                  <FieldLegend>检测项</FieldLegend>
                  <FieldDescription>
                    {{ inspectionSelectionHint }}
                  </FieldDescription>
                </FieldGroup>
                <div class="flex shrink-0 items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    :disabled="loadingDetail"
                    @click="handleUseBuildingTemplate"
                    @focus="handleFocus('section-inspections')"
                  >
                    {{ selectedTemplateName ? `当前使用模板：${selectedTemplateName}` : "使用模板" }}
                  </Button>
                </div>
              </div>

              <div class="mt-4 overflow-hidden rounded-xl border border-border/60 bg-background">
                <InspectionItemPicker
                  :model-value="form.inspectionUuids"
                  :options="inspectionItemOptions"
                  :loading="inspectionPickerLoading"
                  :error-message="inspectionPickerError"
                  :disabled="submitting || loadingDetail"
                  @update:model-value="updateInspectionSelection"
                />
              </div>
            </FieldSet>
          </div>

          <FormFieldSection
            id="section-manager"
            quick-nav-label="负责人"
            label="负责人"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <Input
                v-model="form.managerName"
                required
                placeholder="请输入负责人姓名"
                class="w-full"
                :disabled="loadingDetail"
                @focus="handleFocus('section-manager')"
              />
              <Input
                v-model="form.managerPhone"
                required
                type="tel"
                inputmode="tel"
                placeholder="请输入负责人电话"
                class="w-full"
                :disabled="loadingDetail"
                @focus="handleFocus('section-manager')"
              />
            </div>
          </FormFieldSection>

          <div
            id="section-builds"
            data-quick-nav-label="服务建筑"
            class="scroll-mt-28 border-b border-dashed border-border py-5"
          >
            <FieldSet>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <FieldGroup class="min-w-0 flex-1 gap-1">
                  <FieldLegend>服务建筑</FieldLegend>
                  <FieldDescription>
                    {{
                      selectedCustomerName
                        ? `当前客户：${selectedCustomerName}，已选择 ${selectedBuildCount} 个建筑。${form.customerUuid && groupedBuildings.length && !buildingLoading ? " 勾选要纳入当前检测服务的建筑。" : ""}`
                        : "请先选择所属客户。"
                    }}
                  </FieldDescription>
                </FieldGroup>
              </div>

              <div class="mt-3 w-full min-w-0">
                <template v-if="buildingLoading">
                  <div class="space-y-3">
                    <Skeleton class="h-4 w-52 max-w-full" />
                    <div class="grid gap-2.5 sm:grid-cols-2">
                      <Skeleton
                        v-for="slot in 4"
                        :key="`building-pick-skeleton-${slot}`"
                        class="h-[4.75rem] w-full rounded-xl"
                      />
                    </div>
                  </div>
                </template>
                <template v-else-if="form.customerUuid && !groupedBuildings.length">
                  <p class="text-sm text-muted-foreground">
                    当前客户下暂无可选建筑。
                  </p>
                </template>

                <Accordion
                  v-if="groupedBuildings.length"
                  v-model="expandedBuildGroupKey"
                  type="single"
                  collapsible
                  class="space-y-3"
                >
                  <AccordionItem
                    v-for="group in groupedBuildings"
                    :key="group.key"
                    :value="group.key"
                    class="overflow-hidden rounded-md border border-border/55 bg-background/95 shadow-xs data-[state=open]:bg-[#FAFAFA]"
                  >
                    <AccordionTrigger class="px-3.5 py-3 text-left hover:no-underline">
                      <div class="flex min-w-0 items-center gap-2">
                        <span class="truncate text-sm font-semibold text-foreground">{{ group.parkName }}</span>
                        <span class="shrink-0 text-xs text-muted-foreground">
                          已选 {{ group.selectedCount }} / {{ group.builds.length }} 栋
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent class="px-3.5">
                      <div class="grid gap-2.5 pt-1 sm:grid-cols-2 sm:gap-3">
                        <label
                          v-for="build in group.builds"
                          :key="build.uuid"
                          :class="buildingPickCardClass(isBuildChecked(build.uuid), loadingDetail)"
                          @click="handleFocus('section-builds')"
                        >
                          <Checkbox
                            :model-value="isBuildChecked(build.uuid)"
                            :disabled="loadingDetail"
                            class="mt-0.5"
                            @update:model-value="updateBuildChecked(build.uuid, $event)"
                          />
                          <div class="min-w-0 flex-1">
                            <div class="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                              {{ build.name }}
                            </div>
                          </div>
                        </label>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </FieldSet>
          </div>

          <FormFieldSection
            id="section-remark"
            quick-nav-label="备注"
            label="备注"
            label-for="inspection-service-remark"
            align="start"
            last
          >
            <Textarea
              id="inspection-service-remark"
              v-model="form.remark"
              placeholder="请输入备注"
              class="min-h-[120px] w-full resize-y"
              :disabled="loadingDetail"
              @focus="handleFocus('section-remark')"
            />
          </FormFieldSection>
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

    <Dialog v-model:open="templateLibraryOpen">
      <DialogContent class="max-w-4xl gap-0 p-0">
        <DialogHeader class="p-4">
          <DialogTitle>选择检测模板</DialogTitle>
          <DialogDescription>
            从下方列表中选择一个检测模板，系统会自动带出模板内的检测项，您可以在保存前继续增删和调整。
          </DialogDescription>
        </DialogHeader>

        <div class="flex max-h-[70vh] flex-col overflow-hidden">
          <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1">
            <div class="mb-4">
              <Input
                v-model="templateKeyword"
                placeholder="搜索模板名称或检测项名称"
                class="w-full"
                :disabled="templateLibraryLoading"
              />
            </div>

            <div v-if="templateLibraryError" class="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p class="text-sm font-medium text-destructive">
                检测模板加载失败
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ templateLibraryError }}
              </p>
            </div>

            <div v-else-if="templateLibraryLoading" class="space-y-3">
              <Skeleton v-for="slot in 4" :key="`template-library-skeleton-${slot}`" class="h-28 w-full rounded-2xl" />
            </div>

            <div v-else-if="!filteredTemplateOptions.length" class="rounded-xl border border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
              没有匹配的模板。
            </div>

            <Accordion
              v-else
              v-model="templateExpandedUuid"
              type="single"
              collapsible
              class="space-y-3"
            >
              <AccordionItem
                v-for="template in filteredTemplateOptions"
                :key="template.uuid"
                :value="template.uuid"
                :class="cn(
                  'overflow-hidden rounded-md border bg-background/95 shadow-xs',
                  template.uuid === normalizeText(form.templateUuid)
                    ? 'border-[color:var(--theme-primary)]/45 bg-[color:var(--theme-primary)]/8'
                    : 'border-border/55',
                )"
              >
                <div class="flex items-center justify-between gap-3 px-3.5 py-3">
                  <AccordionTrigger class="min-w-0 flex-1 justify-start py-0 text-left hover:no-underline">
                    <div class="flex min-w-0 items-center gap-2">
                      <span class="truncate text-sm font-semibold text-foreground">
                        {{ template.name || "未命名模板" }}
                      </span>
                      <span class="shrink-0 text-xs text-muted-foreground">
                        共 {{ template.inspections.length }} 个检测项
                      </span>
                    </div>
                  </AccordionTrigger>
                  <Button
                    type="button"
                    size="sm"
                    class="shrink-0"
                    :variant="template.uuid === normalizeText(form.templateUuid) ? 'default' : 'outline'"
                    @click.stop="applyTemplate(template)"
                  >
                    {{ template.uuid === normalizeText(form.templateUuid) ? "当前已选" : "使用此模板" }}
                  </Button>
                </div>

                <AccordionContent class="px-3.5">
                  <div v-if="template.inspections.length" class="pb-3 pt-1">
                    <div class="space-y-2">
                    <div
                      v-for="inspection in template.inspections"
                      :key="`${template.uuid}-${inspection.inspectionUuid}-${inspection.inspectionName}`"
                      class="flex flex-col gap-1 rounded-md border border-border/50 bg-muted/15 px-3 py-2.5"
                    >
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-foreground">
                          {{ inspection.inspectionName || "未命名检测项" }}
                        </p>
                        <p class="text-xs text-muted-foreground">
                          {{ inspection.categoryName || "未分类" }}
                        </p>
                      </div>
                    </div>
                  </div>
                  </div>

                  <p v-else class="pb-3 pt-1 text-sm text-muted-foreground">
                    该模板下暂无检测项。
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        <DialogFooter class="border-t border-border/60 p-4">
          <Button type="button" variant="outline" @click="templateLibraryOpen = false">
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
