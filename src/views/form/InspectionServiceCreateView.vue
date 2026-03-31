<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
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

const DEFAULT_LEVEL_OPTIONS = ["S级", "A级", "B级", "C级"] as const

function createEmptyForm(): InspectionServiceFormState {
  return {
    customerUuid: "",
    name: "",
    level: "",
    managerName: "",
    managerPhone: "",
    templateUuid: "",
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
const groupedBuildings = computed(() => {
  const groups = new Map<string, BuildOption[]>()

  for (const item of buildingOptions.value) {
    const parkName = item.parkName || "未命名园区"
    const current = groups.get(parkName) ?? []
    current.push(item)
    groups.set(parkName, current)
  }

  return Array.from(groups.entries()).map(([parkName, builds]) => ({
    parkName,
    builds,
  }))
})
const selectedBuildCount = computed(() => form.buildUuids.length)
const canSubmit = computed(() =>
  Boolean(
    normalizeText(form.customerUuid)
    && normalizeText(form.name)
    && normalizeText(form.level)
    && normalizeText(form.managerName)
    && normalizeText(form.managerPhone)
    && normalizeText(form.templateUuid)
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

function handleSelectInspectionItems() {
  toast.info("选择检测项功能即将上线")
}

function applyTemplate(template: TemplateOption) {
  form.templateUuid = template.uuid
  templateLibraryOpen.value = false
  toast.success("检测模板已选中", {
    description: template.name || template.uuid,
  })
}


function buildingPickCardClass(checked: boolean, disabled: boolean) {
  return cn(
    "relative flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3.5 shadow-xs transition-all duration-200",
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

  if (!normalizeText(form.templateUuid)) {
    toast.error("请填写检测模板 UUID")
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
  Object.assign(form, {
    ...initialFormState.value,
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
      buildUuids: [],
      remark: normalizeText(detail.Remark),
    })

    if (nextCustomerUuid) {
      await loadBuildingsForCustomer(nextCustomerUuid, nextBuildUuids)
    }

    initialFormState.value = {
      customerUuid: nextCustomerUuid,
      name: normalizeText(detail.Name),
      level: normalizeText(detail.Level),
      managerName: normalizeText(detail.ManagerName),
      managerPhone: normalizeText(detail.ManagerPhone),
      templateUuid: normalizeText(detail.TemplateUuid),
      buildUuids: [...form.buildUuids],
      remark: normalizeText(detail.Remark),
    }
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

          <FormFieldSection
            id="section-template"
            quick-nav-label="检测模板"
            label="检测模板 UUID"
            :description="templateOptions.length ? '可直接输入模板 UUID，输入时会匹配下方已有模板候选。' : '当前未加载到模板候选，请直接输入模板 UUID。'"
            label-for="inspection-service-template"
          >
            <div class="space-y-3">
              <Input
                id="inspection-service-template"
                v-model="form.templateUuid"
                list="inspection-service-template-options"
                required
                :placeholder="templateLoading ? '正在加载模板候选...' : '请输入检测模板 UUID'"
                class="w-full"
                :disabled="loadingDetail"
                @focus="handleFocus('section-template')"
              />
              <datalist id="inspection-service-template-options">
                <option v-for="template in templateOptions" :key="template.uuid" :value="template.uuid">
                  {{ template.name }}
                </option>
              </datalist>
              <p v-if="selectedTemplateName" class="text-sm text-muted-foreground">
                当前匹配模板：{{ selectedTemplateName }}
              </p>
              <div v-if="selectedTemplateOption?.inspections.length" class="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p class="text-sm font-medium text-foreground">
                  当前模板包含 {{ selectedTemplateOption.inspections.length }} 个检测项
                </p>
                <div class="mt-2 space-y-2">
                  <div
                    v-for="inspection in selectedTemplateOption.inspections.slice(0, 4)"
                    :key="`${inspection.inspectionUuid}-${inspection.inspectionName}`"
                    class="rounded-lg border border-border/50 bg-background/90 px-3 py-2"
                  >
                    <div class="text-sm font-medium text-foreground">
                      {{ inspection.inspectionName || "未命名检测项" }}
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ inspection.categoryName || "未分类" }}
                    </div>
                  </div>
                </div>
                <p v-if="selectedTemplateOption.inspections.length > 4" class="mt-2 text-xs text-muted-foreground">
                  其余 {{ selectedTemplateOption.inspections.length - 4 }} 个检测项可在模板浮窗中查看。
                </p>
              </div>
            </div>
          </FormFieldSection>

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
                    {{ selectedCustomerName ? `当前客户：${selectedCustomerName}，已选择 ${selectedBuildCount} 个建筑。` : '请先选择所属客户。' }}
                  </FieldDescription>
                  <FieldDescription
                    v-if="form.customerUuid && groupedBuildings.length && !buildingLoading"
                    class="mt-1"
                  >
                    勾选要纳入当前检测服务的建筑。
                  </FieldDescription>
                </FieldGroup>
                <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    :disabled="loadingDetail"
                    @click="handleUseBuildingTemplate"
                    @focus="handleFocus('section-builds')"
                  >
                    使用模板
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    :disabled="loadingDetail"
                    @click="handleSelectInspectionItems"
                    @focus="handleFocus('section-builds')"
                  >
                    选择检测项
                  </Button>
                </div>
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

                <div v-if="groupedBuildings.length" class="space-y-6">
                  <div
                    v-for="group in groupedBuildings"
                    :key="group.parkName"
                    class="space-y-3"
                  >
                    <div class="flex flex-wrap items-center gap-2 sm:justify-between">
                      <div class="flex min-w-0 items-center gap-2">
                        <span
                          class="inline-flex size-2 shrink-0 rounded-full bg-[color:var(--theme-primary)] ring-2 ring-[color:var(--theme-primary)]/20"
                          aria-hidden="true"
                        />
                        <span class="truncate text-sm font-semibold tracking-tight text-foreground">
                          {{ group.parkName }}
                        </span>
                      </div>
                      <span
                        class="inline-flex shrink-0 items-center rounded-md border border-border/60 bg-background/80 px-2 py-0.5 text-xs tabular-nums text-muted-foreground"
                      >
                        {{ group.builds.length }} 个建筑
                      </span>
                    </div>

                    <div class="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
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
                          <p
                            class="mt-2 flex flex-col gap-0.5 border-t border-border/40 pt-2"
                            :title="build.uuid"
                          >
                            <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">UUID</span>
                            <span class="break-all font-mono text-[11px] leading-relaxed text-muted-foreground select-all">
                              {{ build.uuid }}
                            </span>
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
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
      <DialogContent class="max-w-4xl p-0">
        <DialogHeader class="border-b border-border/60 px-6 pt-6 pb-4">
          <DialogTitle>选择检测模板</DialogTitle>
          <DialogDescription>
            模板数据来自接口 `/bqi/inspection/service/template/list`。选中后会回填模板 UUID，并展示模板内检测项。
          </DialogDescription>
        </DialogHeader>

        <div class="flex max-h-[70vh] flex-col overflow-hidden">
          <div class="border-b border-border/60 px-6 py-4">
            <Input
              v-model="templateKeyword"
              placeholder="搜索模板名称、UUID、检测项名称或分类"
              class="w-full"
              :disabled="templateLibraryLoading"
            />
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-0">
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

            <div v-else class="space-y-4">
              <div
                v-for="template in filteredTemplateOptions"
                :key="template.uuid"
                :class="cn(
                  'rounded-2xl border p-4 transition-colors',
                  template.uuid === normalizeText(form.templateUuid)
                    ? 'border-[color:var(--theme-primary)]/45 bg-[color:var(--theme-primary)]/8'
                    : 'border-border/60 bg-background',
                )"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-foreground">
                      {{ template.name || "未命名模板" }}
                    </p>
                    <p class="mt-1 break-all font-mono text-[12px] text-muted-foreground">
                      {{ template.uuid }}
                    </p>
                    <p class="mt-2 text-xs text-muted-foreground">
                      共 {{ template.inspections.length }} 个检测项
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    :variant="template.uuid === normalizeText(form.templateUuid) ? 'default' : 'outline'"
                    @click="applyTemplate(template)"
                  >
                    {{ template.uuid === normalizeText(form.templateUuid) ? "当前已选" : "使用此模板" }}
                  </Button>
                </div>

                <div v-if="template.inspections.length" class="mt-4 space-y-2">
                  <div
                    v-for="inspection in template.inspections"
                    :key="`${template.uuid}-${inspection.inspectionUuid}-${inspection.inspectionName}`"
                    class="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-foreground">
                        {{ inspection.inspectionName || "未命名检测项" }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ inspection.categoryName || "未分类" }}
                      </p>
                    </div>
                    <p class="break-all font-mono text-[11px] text-muted-foreground sm:max-w-[48%] sm:text-right">
                      {{ inspection.inspectionUuid || "-" }}
                    </p>
                  </div>
                </div>

                <p v-else class="mt-4 text-sm text-muted-foreground">
                  该模板下暂无检测项。
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="border-t border-border/60 px-6 py-4">
          <Button type="button" variant="outline" @click="templateLibraryOpen = false">
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
