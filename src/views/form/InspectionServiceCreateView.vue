<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import InspectionItemPicker from "@/components/inspection/InspectionItemPicker.vue"
import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { TooltipWrap } from "@/components/ui/tooltip"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import { fetchInspectionCategories, type InspectionCategoryRecord } from "@/lib/inspection-categories-api"
import {
  fetchInspectionServiceTemplates,
  type InspectionServiceTemplateRecord,
} from "@/lib/inspection-service-templates-api"
import {
  createInspectionService,
  fetchInspectionServiceDetail,
  updateInspectionService,
} from "@/lib/inspection-services-api"
import { fetchBusinessPresetEntryOptions, type BusinessPresetEntryOption } from "@/lib/business-preset-options"
import { fetchAllInspectionItemOptions, type InspectionItemOption } from "@/lib/inspection-item-options"
import { fetchParks, type ParkListItem } from "@/lib/parks-api"
import { cn } from "@/lib/utils"

type InspectionServiceBaseForm = {
  customerUuid: string
  parkUuid: string
  name: string
  level: string
  managerName: string
  managerPhone: string
  remark: string
}

type InspectionServiceCategoryScoreLimitDraft = InspectionCategoryScoreLimit

type InspectionServiceCategoryScoreLimitForm = {
  scoreLimit: string
}

type InspectionServiceBuildingConfig = {
  buildUuid: string
  buildName: string
  parkUuid: string
  parkName: string
  inspectionUuids: string[]
  categoryScoreLimitByCategoryUuid: Record<string, InspectionServiceCategoryScoreLimitDraft>
  templateSourceUuid?: string
  inspectionTouched?: boolean
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
    score: InspectionCategoryScoreLimit
  }[]
}

type ParkOption = {
  uuid: string
  name: string
}

type BuildOption = {
  uuid: string
  name: string
  parkUuid: string
  parkName: string
}

type InspectionCategoryOption = {
  uuid: string
  name: string
}

type InspectionCategoryScoreLimit = number | null

function createEmptyBaseForm(): InspectionServiceBaseForm {
  return {
    customerUuid: "",
    parkUuid: "",
    name: "",
    level: "",
    managerName: "",
    managerPhone: "",
    remark: "",
  }
}

function cloneBaseForm(source: InspectionServiceBaseForm): InspectionServiceBaseForm {
  return {
    customerUuid: source.customerUuid,
    parkUuid: source.parkUuid,
    name: source.name,
    level: source.level,
    managerName: source.managerName,
    managerPhone: source.managerPhone,
    remark: source.remark,
  }
}

function cloneBuildingConfig(config: InspectionServiceBuildingConfig): InspectionServiceBuildingConfig {
  return {
    ...config,
    inspectionUuids: [...config.inspectionUuids],
    categoryScoreLimitByCategoryUuid: { ...config.categoryScoreLimitByCategoryUuid },
  }
}

function cloneBuildingConfigs(configs: InspectionServiceBuildingConfig[]) {
  return configs.map(config => cloneBuildingConfig(config))
}

function createCategoryScoreLimitForm(scoreLimit: InspectionCategoryScoreLimit): InspectionServiceCategoryScoreLimitForm {
  return {
    scoreLimit: scoreLimit === null ? "" : String(scoreLimit),
  }
}

const router = useRouter()
const route = useRoute()
const form = reactive<InspectionServiceBaseForm>(createEmptyBaseForm())

const initialBaseForm = ref<InspectionServiceBaseForm>(createEmptyBaseForm())
const initialBuildingConfigs = ref<InspectionServiceBuildingConfig[]>([])
const initialBatchTemplateUuid = ref("")
const initialLegacyMultiParkMessage = ref("")

const loadError = ref("")
const submitting = ref(false)
const loadingDetail = ref(false)
const customerLoading = ref(false)
const relatedOptionsLoading = ref(false)
const serviceLevelOptionsLoading = ref(false)
const templateLoading = ref(false)
const templateLibraryOpen = ref(false)
const templateLibraryLoading = ref(false)
const templateLibraryError = ref("")
const templateKeyword = ref("")
const templateExpandedUuid = ref("")
const inspectionPickerLoading = ref(false)
const inspectionPickerError = ref("")
const inspectionCategoryLoading = ref(false)
const inspectionCategoryError = ref("")
const customerOptions = ref<CustomerOption[]>([])
const templateOptions = ref<TemplateOption[]>([])
const parkOptions = ref<ParkOption[]>([])
const buildingOptions = ref<BuildOption[]>([])
const inspectionItemOptions = ref<InspectionItemOption[]>([])
const inspectionCategoryOptions = ref<InspectionCategoryOption[]>([])
const serviceLevelEntries = ref<BusinessPresetEntryOption[]>([])
const globalCategoryScoreLimits = ref<Record<string, InspectionCategoryScoreLimit>>({})
const buildingConfigs = ref<InspectionServiceBuildingConfig[]>([])
const batchTemplateUuid = ref("")
const buildingEditorOpen = ref(false)
const activeBuildingEditorUuid = ref("")
const buildingEditorDraftUuids = ref<string[]>([])
const expandedBuildGroupKey = ref("")
const activeScoreLimitBuildUuid = ref("")
const scoreLimitDraftForms = ref<Record<string, InspectionServiceCategoryScoreLimitForm>>({})
const suppressCustomerWatch = ref(false)
const legacyMultiParkMessage = ref("")

let latestCustomerContextRequestId = 0
let latestDetailRequestId = 0

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
const selectedBatchTemplateOption = computed(() =>
  templateOptions.value.find(item => item.uuid === batchTemplateUuid.value) ?? null,
)
const selectedBatchTemplateName = computed(() => selectedBatchTemplateOption.value?.name ?? "")
const selectedTemplateInspectionUuids = computed(() => dedupeText(
  (selectedBatchTemplateOption.value?.inspections ?? []).map(item => item.inspectionUuid),
))
const selectedInspectionUuidsForSubmit = computed(() => dedupeText(
  buildingConfigs.value.flatMap(config => config.inspectionUuids),
))
const allBuildingsMatchSelectedTemplate = computed(() => (
  Boolean(batchTemplateUuid.value)
  && selectedTemplateInspectionUuids.value.length > 0
  && buildingConfigs.value.length > 0
  && buildingConfigs.value.every(config => haveSameTextSet(config.inspectionUuids, selectedTemplateInspectionUuids.value))
))
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
const inspectionItemNameByUuid = computed(() => new Map(
  inspectionItemOptions.value.map(item => [item.uuid, item.name] as const),
))
const inspectionItemByUuid = computed(() => new Map(
  inspectionItemOptions.value.map(item => [item.uuid, item] as const),
))
const inspectionCategoryNameByUuid = computed(() => new Map(
  inspectionCategoryOptions.value.map(item => [item.uuid, item.name] as const),
))
const inspectionCategoryByName = computed(() => new Map(
  inspectionCategoryOptions.value.map(item => [item.name, item] as const),
))
const serviceLevelOptions = computed(() => {
  const options = serviceLevelEntries.value.map(entry => ({
    value: entry.name,
    label: entry.name,
  }))
  const currentValue = normalizeText(form.level)

  if (currentValue && !options.some(option => option.value === currentValue)) {
    options.unshift({
      value: currentValue,
      label: currentValue,
    })
  }

  return dedupeSelectOptions(options)
})
const groupedBuildingParks = computed(() => {
  return parkOptions.value
    .map((park) => {
      const builds = buildingOptions.value
        .filter(item => item.parkUuid === park.uuid)
        .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))

      return {
        key: `park-${park.uuid}`,
        parkUuid: park.uuid,
        parkName: park.name || "未命名园区",
        selectedCount: builds.reduce((count, build) => (
          isBuildSelected(build.uuid) ? count + 1 : count
        ), 0),
        builds,
      }
    })
    .filter(group => group.builds.length > 0)
})
const activeBuildingParkGroup = computed(() =>
  groupedBuildingParks.value.find(group => group.parkUuid === form.parkUuid) ?? null,
)
const sortedBuildingConfigs = computed(() => {
  const orderMap = new Map(buildingOptions.value.map((item, index) => [item.uuid, index]))

  return [...buildingConfigs.value].sort((left, right) => {
    const leftOrder = orderMap.get(left.buildUuid)
    const rightOrder = orderMap.get(right.buildUuid)

    if (leftOrder === undefined && rightOrder === undefined) {
      return left.buildName.localeCompare(right.buildName, "zh-Hans-CN")
    }

    if (leftOrder === undefined) {
      return 1
    }

    if (rightOrder === undefined) {
      return -1
    }

    return leftOrder - rightOrder
  })
})
const selectedBuildCount = computed(() => buildingConfigs.value.length)
const isParkSelectionLocked = computed(() => selectedBuildCount.value > 0 && Boolean(form.parkUuid))
const currentBuildingEditor = computed(() =>
  buildingConfigs.value.find(config => config.buildUuid === activeBuildingEditorUuid.value) ?? null,
)
const currentBuildingEditorTitle = computed(() =>
  currentBuildingEditor.value?.buildName || "建筑检测项",
)
const currentScoreLimitConfig = computed(() =>
  buildingConfigs.value.find(config => config.buildUuid === activeScoreLimitBuildUuid.value) ?? null,
)
const categoryScoreLimitFeatureDisabledReason = computed(() => {
  if (inspectionCategoryLoading.value) {
    return "检测项分类加载中。"
  }

  if (inspectionCategoryError.value) {
    return inspectionCategoryError.value
  }

  if (!inspectionCategoryOptions.value.length) {
    return "当前没有可配置的检测项分类。"
  }

  return ""
})

type InspectionCategoryDraftOption = {
  uuid: string
  name: string
}

const isInteractionLocked = computed(() => loadingDetail.value || Boolean(legacyMultiParkMessage.value))
const canSubmit = computed(() =>
  Boolean(
    normalizeText(form.customerUuid)
    && normalizeText(form.name)
    && normalizeText(form.level)
    && normalizeText(form.managerName)
    && normalizeText(form.managerPhone)
    && buildingConfigs.value.length > 0
    && selectedInspectionUuidsForSubmit.value.length > 0
    && !legacyMultiParkMessage.value
    && !submitting.value
    && !loadingDetail.value
    && !customerLoading.value
    && !relatedOptionsLoading.value,
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

watch(templateLibraryOpen, (open) => {
  if (open) {
    templateExpandedUuid.value = ""
    return
  }

  templateKeyword.value = ""
})

watch(
  groupedBuildingParks,
  (groups) => {
    if (!groups.length) {
      expandedBuildGroupKey.value = ""
      return
    }

    const preferredGroup = groups.find(group => group.parkUuid === form.parkUuid)

    if (preferredGroup) {
      expandedBuildGroupKey.value = preferredGroup.key
      return
    }

    if (!groups.some(group => group.key === expandedBuildGroupKey.value)) {
      expandedBuildGroupKey.value = groups[0]?.key ?? ""
      form.parkUuid = groups[0]?.parkUuid ?? ""
      return
    }

    const expandedGroup = groups.find(group => group.key === expandedBuildGroupKey.value)
    if (expandedGroup && !form.parkUuid) {
      form.parkUuid = expandedGroup.parkUuid
    }
  },
  { immediate: true },
)

watch(
  expandedBuildGroupKey,
  (nextKey) => {
    if (isParkSelectionLocked.value || !nextKey) {
      return
    }

    const matchedGroup = groupedBuildingParks.value.find(group => group.key === nextKey)
    if (matchedGroup) {
      form.parkUuid = matchedGroup.parkUuid
    }
  },
)

watch(
  selectedBuildCount,
  (count) => {
    if (count > 0) {
      return
    }

    if (activeBuildingParkGroup.value) {
      form.parkUuid = activeBuildingParkGroup.value.parkUuid
      return
    }

    const expandedGroup = groupedBuildingParks.value.find(group => group.key === expandedBuildGroupKey.value)
    form.parkUuid = expandedGroup?.parkUuid ?? ""
  },
  { immediate: true },
)

watch(
  () => form.customerUuid,
  (customerUuid, previousCustomerUuid) => {
    if (suppressCustomerWatch.value || customerUuid === previousCustomerUuid) {
      return
    }

    batchTemplateUuid.value = ""
    legacyMultiParkMessage.value = ""
    void loadCustomerScopedOptions(customerUuid)
  },
)

watch(
  () => [route.name, route.params.id, route.query.customerUuid, route.query.customerName] as const,
  () => {
    resetLocalStateForRoute()
    void loadInitialOptions()
  },
  { immediate: true },
)

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

async function handleUseBuildingTemplate() {
  templateLibraryOpen.value = true

  if (!templateOptions.value.length && !templateLibraryLoading.value) {
    await loadTemplateOptions()
  }
}

function applyTemplate(template: TemplateOption) {
  const nextInspectionUuids = dedupeText(template.inspections.map(item => item.inspectionUuid))
  const nextCategoryScoreLimits = buildTemplateCategoryScoreLimitMap(template)

  batchTemplateUuid.value = template.uuid

  if (buildingConfigs.value.length) {
    buildingConfigs.value = buildingConfigs.value.map((config) => ({
      ...cloneBuildingConfig(config),
      inspectionUuids: [...nextInspectionUuids],
      categoryScoreLimitByCategoryUuid: { ...nextCategoryScoreLimits },
      templateSourceUuid: template.uuid,
      inspectionTouched: false,
    }))
  }

  templateLibraryOpen.value = false

  toast.success("检测模板已应用", {
    description: buildingConfigs.value.length
      ? `已同步到 ${buildingConfigs.value.length} 栋建筑，后续新选建筑也会默认带出该模板。`
      : "后续新选建筑将默认带出该模板内的检测项。",
  })
}

function isBuildSelected(buildUuid: string) {
  return buildingConfigs.value.some(config => config.buildUuid === buildUuid)
}

function updateBuildChecked(build: BuildOption, checked: boolean | "indeterminate") {
  if (checked === "indeterminate") {
    return
  }

  if (checked) {
    addBuildingConfig(build)
    return
  }

  removeBuildingConfig(build.uuid)
}

function addBuildingConfig(build: BuildOption) {
  if (isBuildSelected(build.uuid)) {
    return
  }

  if (isParkSelectionLocked.value && form.parkUuid && build.parkUuid !== form.parkUuid) {
    return
  }

  const nextInspectionUuids = [...selectedTemplateInspectionUuids.value]
  form.parkUuid = build.parkUuid

  buildingConfigs.value = [...buildingConfigs.value, {
    buildUuid: build.uuid,
    buildName: build.name,
    parkUuid: build.parkUuid,
    parkName: build.parkName,
    inspectionUuids: nextInspectionUuids,
    categoryScoreLimitByCategoryUuid: selectedBatchTemplateOption.value
      ? buildTemplateCategoryScoreLimitMap(selectedBatchTemplateOption.value)
      : {},
    templateSourceUuid: batchTemplateUuid.value || undefined,
    inspectionTouched: false,
  }]
}

function removeBuildingConfig(buildUuid: string) {
  buildingConfigs.value = buildingConfigs.value.filter(config => config.buildUuid !== buildUuid)

  if (activeBuildingEditorUuid.value === buildUuid) {
    closeBuildingEditor()
  }

  if (activeScoreLimitBuildUuid.value === buildUuid) {
    closeScoreLimitPopover()
  }

  if (!buildingConfigs.value.length) {
    const expandedGroup = groupedBuildingParks.value.find(group => group.key === expandedBuildGroupKey.value)
    form.parkUuid = expandedGroup?.parkUuid ?? ""
  }
}

function openBuildingEditor(config: InspectionServiceBuildingConfig) {
  activeBuildingEditorUuid.value = config.buildUuid
  buildingEditorDraftUuids.value = [...config.inspectionUuids]
  buildingEditorOpen.value = true
}

function saveBuildingEditor() {
  const current = currentBuildingEditor.value

  if (!current) {
    return
  }

  const nextInspectionUuids = dedupeText(buildingEditorDraftUuids.value)
  const target = buildingConfigs.value.find(config => config.buildUuid === current.buildUuid)

  if (!target) {
    return
  }

  target.inspectionUuids = [...nextInspectionUuids]
  target.inspectionTouched = true
  target.templateSourceUuid = undefined

  closeBuildingEditor()

  toast.success("建筑检测项已更新", {
    description: `${target.buildName} 当前共 ${target.inspectionUuids.length} 个检测项。`,
  })
}

function closeBuildingEditor() {
  buildingEditorOpen.value = false
  activeBuildingEditorUuid.value = ""
  buildingEditorDraftUuids.value = []
}

function handleScoreLimitPopoverOpenChange(buildUuid: string, open: boolean) {
  if (open) {
    const target = buildingConfigs.value.find(config => config.buildUuid === buildUuid)

    if (!target) {
      return
    }

    const categories = getInspectionCategoriesForConfig(target)

    if (!categories.length) {
      return
    }

    activeScoreLimitBuildUuid.value = buildUuid
    scoreLimitDraftForms.value = Object.fromEntries(
      categories.map((category) => {
        const existingScoreLimit = target.categoryScoreLimitByCategoryUuid[category.uuid]
        const initialScoreLimit = existingScoreLimit ?? getDefaultCategoryScoreLimit(category.uuid)

        return [category.uuid, createCategoryScoreLimitForm(initialScoreLimit)]
      }),
    )
    return
  }

  if (activeScoreLimitBuildUuid.value === buildUuid) {
    closeScoreLimitPopover()
  }
}

function updateScoreLimitField(
  categoryUuid: string,
  field: keyof InspectionServiceCategoryScoreLimitForm,
  value: string | number,
) {
  const current = scoreLimitDraftForms.value[categoryUuid]

  if (!current) {
    return
  }

  current[field] = typeof value === "number" ? String(value) : value
}

function resetScoreLimitDraft() {
  const buildUuid = activeScoreLimitBuildUuid.value

  if (!buildUuid) {
    return
  }

  handleScoreLimitPopoverOpenChange(buildUuid, true)
}

function saveScoreLimitDraft(buildUuid: string) {
  const target = buildingConfigs.value.find(config => config.buildUuid === buildUuid)

  if (!target) {
    return
  }

  const categories = getInspectionCategoriesForConfig(target)
  const nextScoreLimitMap: Record<string, InspectionServiceCategoryScoreLimitDraft> = {}

  for (const category of categories) {
    const formState = scoreLimitDraftForms.value[category.uuid]
    const defaultScoreLimit = getDefaultCategoryScoreLimit(category.uuid)
    const rawScoreLimit = formState?.scoreLimit.trim() ?? ""

    if (!rawScoreLimit) {
      if (defaultScoreLimit === null) {
        continue
      }

      toast.error(`请检查 ${category.name} 的分数上限，需为非负整数。`)
      return
    }

    const parsedScoreLimit = parseScoreLimitForm(formState)

    if (parsedScoreLimit === null) {
      toast.error(`请检查 ${category.name} 的分数上限，需为非负整数。`)
      return
    }

    if (!isSameScoreLimit(parsedScoreLimit, defaultScoreLimit)) {
      nextScoreLimitMap[category.uuid] = parsedScoreLimit
    }
  }

  target.categoryScoreLimitByCategoryUuid = nextScoreLimitMap
  closeScoreLimitPopover()

  toast.success("分数上限已更新", {
    description: Object.keys(nextScoreLimitMap).length
      ? `${target.buildName} 已配置 ${Object.keys(nextScoreLimitMap).length} 个分类的服务内分数上限。`
      : `${target.buildName} 已恢复为预设分数上限。`,
  })
}

function clearScoreLimitOverrides(buildUuid: string) {
  const target = buildingConfigs.value.find(config => config.buildUuid === buildUuid)

  if (!target) {
    return
  }

  target.categoryScoreLimitByCategoryUuid = {}
  closeScoreLimitPopover()

  toast.success("已恢复预设分数上限", {
    description: `${target.buildName} 当前不再使用服务内自定义分数上限。`,
  })
}

function closeScoreLimitPopover() {
  activeScoreLimitBuildUuid.value = ""
  scoreLimitDraftForms.value = {}
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

  if (!buildingConfigs.value.length) {
    toast.error("请至少选择一栋建筑")
    return
  }

  if (legacyMultiParkMessage.value) {
    toast.error(legacyMultiParkMessage.value)
    return
  }

  if (!selectedInspectionUuidsForSubmit.value.length) {
    toast.error("请至少配置一个检测项")
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
      BuildInfos: buildInspectionServiceBuildInfosPayload(),
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
        : `${selectedCustomerName.value || "当前客户"}的检测服务已创建成功。`,
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

async function handleReset() {
  suppressCustomerWatch.value = true
  Object.assign(form, cloneBaseForm(initialBaseForm.value))
  batchTemplateUuid.value = initialBatchTemplateUuid.value
  legacyMultiParkMessage.value = initialLegacyMultiParkMessage.value
  suppressCustomerWatch.value = false

  await loadCustomerScopedOptions(initialBaseForm.value.customerUuid, {
    keepParkUuid: initialBaseForm.value.parkUuid,
    keepBuildingConfigs: cloneBuildingConfigs(initialBuildingConfigs.value),
  })
}

async function loadInitialOptions() {
  loadError.value = ""
  customerLoading.value = true
  globalCategoryScoreLimits.value = {}

  try {
    const [customers] = await Promise.all([
      fetchAllCustomers(),
      loadServiceLevelOptions(),
      loadTemplateOptions(),
      loadInspectionItemOptions(),
      loadInspectionCategoryOptions(),
    ])

    customerOptions.value = customers
      .map(mapCustomerOption)
      .filter(item => item.uuid)

    if (isEditMode.value) {
      await loadInspectionServiceForEdit(inspectionServiceUuid.value)
      return
    }

    suppressCustomerWatch.value = true
    form.customerUuid = resolvePreferredCustomerUuid()
    suppressCustomerWatch.value = false

    if (form.customerUuid) {
      await loadCustomerScopedOptions(form.customerUuid)
    }

    syncInitialSnapshots()
  } catch (error) {
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: isEditMode.value ? "检测服务编辑页初始化失败，请稍后重试。" : "检测服务表单初始化失败，请稍后重试。",
    })
  } finally {
    customerLoading.value = false
  }
}

async function loadCustomerScopedOptions(
  customerUuid: string,
  options: {
    keepParkUuid?: string
    keepBuildingConfigs?: InspectionServiceBuildingConfig[]
  } = {},
) {
  const requestId = ++latestCustomerContextRequestId
  const normalizedCustomerUuid = normalizeText(customerUuid)

  closeBuildingEditor()
  closeScoreLimitPopover()
  parkOptions.value = []
  buildingOptions.value = []
  buildingConfigs.value = []
  form.parkUuid = ""

  if (!normalizedCustomerUuid) {
    return
  }

  relatedOptionsLoading.value = true
  loadError.value = ""

  try {
    const [parks, buildings] = await Promise.all([
      fetchAllParksForCustomer(normalizedCustomerUuid),
      fetchAllBuildingsForCustomer(normalizedCustomerUuid),
    ])

    if (requestId !== latestCustomerContextRequestId) {
      return
    }

    const nextBuildingOptions = buildings
      .map(mapBuildOption)
      .filter(item => item.uuid)
    const nextParkOptions = resolveParkOptions(parks, nextBuildingOptions)

    buildingOptions.value = nextBuildingOptions
    parkOptions.value = nextParkOptions
    form.parkUuid = nextParkOptions.some(item => item.uuid === options.keepParkUuid)
      ? normalizeText(options.keepParkUuid)
      : ""
    buildingConfigs.value = reconcileBuildingConfigs(options.keepBuildingConfigs ?? [], nextBuildingOptions)
  } catch (error) {
    if (requestId !== latestCustomerContextRequestId) {
      return
    }

    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "园区或建筑信息加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestCustomerContextRequestId) {
      relatedOptionsLoading.value = false
    }
  }
}

async function loadInspectionServiceForEdit(uuid: string) {
  if (!uuid) {
    loadError.value = "检测服务 Uuid 缺失，无法加载编辑资料。"
    return
  }

  const requestId = ++latestDetailRequestId
  loadingDetail.value = true
  loadError.value = ""

  try {
    const detail = await fetchInspectionServiceDetail({ Uuid: uuid })

    if (requestId !== latestDetailRequestId) {
      return
    }

    const nextCustomerUuid = normalizeText(detail.CustomerUuid)
    const nextBuildingConfigs: InspectionServiceBuildingConfig[] = []

    for (const [index, item] of (Array.isArray(detail.BuildInfos) ? detail.BuildInfos : (Array.isArray(detail.Builds) ? detail.Builds : [])).entries()) {
      const mappedConfig = mapServiceDetailBuildToConfig(item, index)

      if (mappedConfig) {
        nextBuildingConfigs.push(mappedConfig)
      }
    }
    const parkKeys = Array.from(new Set(nextBuildingConfigs.map(config => config.parkUuid).filter(Boolean)))
    const parkNames = Array.from(new Set(nextBuildingConfigs.map(config => config.parkName).filter(Boolean)))
    const hasLegacyMultiParkConflict = parkKeys.length > 1

    suppressCustomerWatch.value = true
    Object.assign(form, {
      customerUuid: nextCustomerUuid,
      parkUuid: hasLegacyMultiParkConflict ? "" : nextBuildingConfigs[0]?.parkUuid || "",
      name: normalizeText(detail.Name),
      level: normalizeText(detail.Level),
      managerName: normalizeText(detail.ManagerName),
      managerPhone: normalizeText(detail.ManagerPhone),
      remark: normalizeText(detail.Remark),
    })
    batchTemplateUuid.value = normalizeText(detail.TemplateUuid)
    legacyMultiParkMessage.value = hasLegacyMultiParkConflict
      ? `当前历史检测服务关联了多个园区（${parkNames.join("、")}），新页面仅支持单园区配置。为避免误删历史数据，当前页面已切换为只读兼容模式。`
      : ""

    if (nextCustomerUuid) {
      await loadCustomerScopedOptions(nextCustomerUuid, {
        keepParkUuid: form.parkUuid,
        keepBuildingConfigs: nextBuildingConfigs,
      })
    }

    suppressCustomerWatch.value = false

    if (requestId !== latestDetailRequestId) {
      return
    }

    syncInitialSnapshots()
  } catch (error) {
    if (requestId !== latestDetailRequestId) {
      return
    }

    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测服务资料加载失败，请稍后重试。",
    })
  } finally {
    suppressCustomerWatch.value = false
    if (requestId === latestDetailRequestId) {
      loadingDetail.value = false
    }
  }
}

function syncInitialSnapshots() {
  initialBaseForm.value = cloneBaseForm(form)
  initialBuildingConfigs.value = cloneBuildingConfigs(buildingConfigs.value)
  initialBatchTemplateUuid.value = batchTemplateUuid.value
  initialLegacyMultiParkMessage.value = legacyMultiParkMessage.value
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

async function loadServiceLevelOptions() {
  serviceLevelOptionsLoading.value = true

  try {
    const options = await fetchBusinessPresetEntryOptions(["serviceLevel"])
    serviceLevelEntries.value = options.serviceLevel ?? []
  } finally {
    serviceLevelOptionsLoading.value = false
  }
}

async function fetchAllParksForCustomer(customerUuid: string) {
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

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && allItems.length >= total)) {
      break
    }

    pageNum += 1
  }

  return dedupeByUuid(allItems)
}

async function fetchAllBuildingsForCustomer(customerUuid: string) {
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

    templateOptions.value = dedupeText(allItems.map(item => normalizeText(item.Uuid))).map((uuid) => {
      const current = allItems.find(item => normalizeText(item.Uuid) === uuid)

      return {
        uuid,
        name: normalizeText(current?.Name) || `模板 ${normalizeText(current?.Id) || uuid || "-"}`,
        inspections: Array.isArray(current?.Inspections)
          ? current.Inspections.map(inspection => ({
              categoryName: normalizeText(inspection.CategoryName),
              inspectionName: normalizeText(inspection.InspectionName),
              inspectionUuid: normalizeText(inspection.InspectionUuid),
              score: normalizeScoreLimitValue(inspection.Score),
            })).filter(inspection => inspection.inspectionUuid)
          : [],
      }
    })

    return templateOptions.value
  } catch (error) {
    templateOptions.value = []
    templateLibraryError.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测模板列表加载失败，请稍后重试。",
    })
    return []
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
    return inspectionItemOptions.value
  } catch (error) {
    inspectionItemOptions.value = []
    inspectionPickerError.value = handleApiError(error, {
      mode: "silent",
      title: "检测项加载失败",
      fallback: "检测项列表加载失败，请稍后重试。",
    })
    return []
  } finally {
    inspectionPickerLoading.value = false
  }
}

async function loadInspectionCategoryOptions() {
  inspectionCategoryLoading.value = true
  inspectionCategoryError.value = ""

  try {
    const result = await fetchInspectionCategories()
    globalCategoryScoreLimits.value = Object.fromEntries(
      result.list.map((item, index) => {
        const option = normalizeInspectionCategoryOption(item, index)
        return [option.uuid, resolveInspectionCategoryScoreLimit(item)]
      }),
    )
    inspectionCategoryOptions.value = result.list
      .map((item, index) => normalizeInspectionCategoryOption(item, index))
      .filter(item => item.uuid)
      .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))
    return inspectionCategoryOptions.value
  } catch (error) {
    globalCategoryScoreLimits.value = {}
    inspectionCategoryOptions.value = []
    inspectionCategoryError.value = handleApiError(error, {
      mode: "silent",
      title: "检测项分类加载失败",
      fallback: "检测项分类加载失败，请稍后重试。",
    })
    return []
  } finally {
    inspectionCategoryLoading.value = false
  }
}

function resolvePreferredCustomerUuid() {
  if (customerOptions.value.some(item => item.uuid === queryCustomerUuid.value)) {
    return queryCustomerUuid.value
  }

  return ""
}

function mapCustomerOption(item: CustomerListItem): CustomerOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.CorpName) || `客户 ${normalizeText(item.Id) || "-"}`,
  }
}

function mapBuildOption(item: BuildingListItem): BuildOption {
  const parkName = normalizeText(item.ParkName) || "未命名园区"

  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.Name) || "未命名建筑",
    parkUuid: resolveParkIdentity(item.ParkUuid, parkName),
    parkName,
  }
}

function normalizeInspectionCategoryOption(item: InspectionCategoryRecord, index: number): InspectionCategoryOption {
  const name = normalizeText(item.Name) || `分类 ${normalizeText(item.Id) || index + 1}`

  return {
    uuid: resolveInspectionCategoryKey(normalizeText(item.Uuid), name),
    name,
  }
}

function resolveParkOptions(parks: ParkListItem[], builds: BuildOption[]) {
  const bucket = new Map<string, ParkOption>()

  for (const item of parks) {
    const name = normalizeText(item.Name) || "未命名园区"
    const uuid = resolveParkIdentity(item.Uuid, name)

    if (!uuid) {
      continue
    }

    bucket.set(uuid, {
      uuid,
      name,
    })
  }

  for (const item of builds) {
    if (!item.parkUuid) {
      continue
    }

    if (!bucket.has(item.parkUuid)) {
      bucket.set(item.parkUuid, {
        uuid: item.parkUuid,
        name: item.parkName,
      })
    }
  }

  return Array.from(bucket.values())
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))
}

function reconcileBuildingConfigs(
  configs: InspectionServiceBuildingConfig[],
  availableBuildings: BuildOption[],
) {
  const buildingMap = new Map(availableBuildings.map(item => [item.uuid, item]))

  return configs.map((config) => {
    const matched = buildingMap.get(config.buildUuid)

    if (!matched) {
      return cloneBuildingConfig(config)
    }

    return {
      ...cloneBuildingConfig(config),
      buildName: matched.name,
      parkUuid: matched.parkUuid,
      parkName: matched.parkName,
    }
  })
}

function mapServiceDetailBuildToConfig(
  build: Record<string, unknown>,
  index: number,
) {
  const buildUuid = normalizeText(build.BuildUuid) || normalizeText(build.BuildId)
  const buildName = normalizeText(build.BuildName) || `建筑 ${index + 1}`
  const parkName = normalizeText(build.ParkName) || "未命名园区"
  const parkUuid = resolveParkIdentity(build.ParkUuid, parkName)
  const categoryList = Array.isArray(build.List) ? build.List : []

  if (!buildUuid) {
    return null
  }

  const inspectionUuids = dedupeText(categoryList.flatMap((category) => {
    const inspectionList = category && typeof category === "object" && Array.isArray((category as { List?: unknown }).List)
      ? (category as { List: Array<Record<string, unknown>> }).List
      : []

    return inspectionList.map(item => normalizeText(item.Uuid))
  }))

  const categoryScoreLimitByCategoryUuid = Object.fromEntries(
    categoryList.flatMap((category) => {
      if (!category || typeof category !== "object") {
        return []
      }

      const categoryName = normalizeText((category as { Name?: unknown }).Name)
      const categoryUuid = resolveInspectionCategoryKey(
        normalizeText((category as { Uuid?: unknown }).Uuid),
        categoryName,
      )
      const score = normalizeScoreLimitValue((category as { Score?: unknown }).Score)

      if (!categoryUuid || score === null) {
        return []
      }

      return [[categoryUuid, score] as const]
    }),
  )

  return {
    buildUuid,
    buildName,
    parkUuid,
    parkName,
    inspectionUuids: [...inspectionUuids],
    categoryScoreLimitByCategoryUuid,
    templateSourceUuid: batchTemplateUuid.value || undefined,
    inspectionTouched: false,
  } satisfies InspectionServiceBuildingConfig
}

function buildInspectionServiceBuildInfosPayload() {
  return buildingConfigs.value.map((config) => {
    const categoryMap = new Map<string, {
      uuid: string
      name: string
      score: InspectionCategoryScoreLimit
      items: Array<{ Uuid: string, Name: string }>
    }>()

    for (const inspectionUuid of config.inspectionUuids) {
      const inspection = inspectionItemByUuid.value.get(inspectionUuid)

      if (!inspection) {
        continue
      }

      const fallbackCategory = inspection.categoryName
        ? inspectionCategoryByName.value.get(inspection.categoryName)
        : undefined
      const categoryUuid = resolveInspectionCategoryKey(
        inspection.categoryUuid || fallbackCategory?.uuid || "",
        fallbackCategory?.name || inspection.categoryName || "未分类",
      )
      const categoryName = fallbackCategory?.name || inspection.categoryName || "未分类"

      if (!categoryUuid && !categoryName) {
        continue
      }

      const categoryKey = categoryUuid
      const current = categoryMap.get(categoryKey) ?? {
        uuid: isSyntheticInspectionCategoryKey(categoryUuid) ? "" : categoryUuid,
        name: categoryName,
        score: config.categoryScoreLimitByCategoryUuid[categoryKey] ?? getDefaultCategoryScoreLimit(categoryKey),
        items: [],
      }

      current.items.push({
        Uuid: inspection.uuid,
        Name: inspection.name,
      })

      categoryMap.set(categoryKey, current)
    }

    return {
      BuildUuid: config.buildUuid,
      List: Array.from(categoryMap.values()).map((category) => ({
        Uuid: category.uuid || undefined,
        Name: category.name || undefined,
        Score: category.score === null ? undefined : category.score,
        List: category.items,
      })),
    }
  })
}

function buildTemplateCategoryScoreLimitMap(template: TemplateOption) {
  const scoreMap: Record<string, InspectionServiceCategoryScoreLimitDraft> = {}

  for (const inspection of template.inspections) {
    if (inspection.score === null) {
      continue
    }

    const itemOption = inspectionItemByUuid.value.get(inspection.inspectionUuid)
    const fallbackCategory = inspection.categoryName
      ? inspectionCategoryByName.value.get(inspection.categoryName)
      : undefined
    const categoryUuid = resolveInspectionCategoryKey(
      itemOption?.categoryUuid || fallbackCategory?.uuid || "",
      fallbackCategory?.name || inspection.categoryName,
    )

    if (!categoryUuid) {
      continue
    }

    scoreMap[categoryUuid] = inspection.score
  }

  return scoreMap
}

function getInspectionCategoriesForConfig(config: InspectionServiceBuildingConfig): InspectionCategoryDraftOption[] {
  const categories = new Map<string, InspectionCategoryDraftOption>()

  for (const inspectionUuid of config.inspectionUuids) {
    const inspection = inspectionItemByUuid.value.get(inspectionUuid)

    if (!inspection) {
      continue
    }

    const fallbackCategory = inspection.categoryName
      ? inspectionCategoryByName.value.get(inspection.categoryName)
      : undefined
    const categoryUuid = resolveInspectionCategoryKey(
      inspection.categoryUuid || fallbackCategory?.uuid || "",
      fallbackCategory?.name || inspection.categoryName || "未分类",
    )
    const categoryName = fallbackCategory?.name || inspection.categoryName || "未分类"

    if (!categoryUuid || categories.has(categoryUuid)) {
      continue
    }

    categories.set(categoryUuid, {
      uuid: categoryUuid,
      name: categoryName,
    })
  }

  return Array.from(categories.values())
}

function getCategoryScoreLimitActionDisabledReason(config: InspectionServiceBuildingConfig) {
  if (categoryScoreLimitFeatureDisabledReason.value) {
    return categoryScoreLimitFeatureDisabledReason.value
  }

  if (!config.inspectionUuids.length) {
    return "请先为当前建筑选择检测项。"
  }

  if (!getInspectionCategoriesForConfig(config).length) {
    return "当前建筑没有可配置分数上限的检测分类。"
  }

  return ""
}

function getBuildingInspectionSummary(config: InspectionServiceBuildingConfig) {
  if (!config.inspectionUuids.length) {
    return "当前未配置检测项。"
  }

  const previewNames = config.inspectionUuids
    .slice(0, 3)
    .map(uuid => inspectionItemNameByUuid.value.get(uuid) || `检测项 ${uuid}`)

  if (config.inspectionUuids.length > 3) {
    return `${previewNames.join("、")} 等 ${config.inspectionUuids.length} 项`
  }

  return previewNames.join("、")
}

function getBuildingScoreLimitSummary(config: InspectionServiceBuildingConfig) {
  const categoryUuids = Object.keys(config.categoryScoreLimitByCategoryUuid)

  if (!categoryUuids.length) {
    return "使用预设分数上限"
  }

  const previewNames = categoryUuids
    .slice(0, 2)
    .map(uuid => resolveInspectionCategoryName(uuid))

  if (categoryUuids.length > 2) {
    return `${previewNames.join("、")} 等 ${categoryUuids.length} 个分类已自定义分数上限。`
  }

  return `${previewNames.join("、")} 已使用服务内分数上限。`
}

function getDefaultCategoryScoreLimit(categoryUuid: string): InspectionCategoryScoreLimit {
  return categoryUuid in globalCategoryScoreLimits.value
    ? globalCategoryScoreLimits.value[categoryUuid]
    : null
}

function resolveInspectionCategoryKey(categoryUuid: string, categoryName: string) {
  const normalizedUuid = normalizeText(categoryUuid)

  if (normalizedUuid) {
    return normalizedUuid
  }

  const normalizedName = normalizeText(categoryName)
  return normalizedName ? `inspection-category-name:${normalizedName}` : ""
}

function isSyntheticInspectionCategoryKey(categoryKey: string) {
  return categoryKey.startsWith("inspection-category-name:")
}

function resolveInspectionCategoryName(categoryKey: string) {
  const matchedName = inspectionCategoryNameByUuid.value.get(categoryKey)

  if (matchedName) {
    return matchedName
  }

  if (isSyntheticInspectionCategoryKey(categoryKey)) {
    return categoryKey.slice("inspection-category-name:".length) || "未命名分类"
  }

  return "未命名分类"
}

function resolveInspectionCategoryScoreLimit(item: InspectionCategoryRecord) {
  const value: unknown = item.Score

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value)
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)

    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed)
    }
  }

  return null
}

function parseScoreLimitForm(formState: InspectionServiceCategoryScoreLimitForm | undefined) {
  if (!formState) {
    return null
  }

  return parseScoreFieldValue(formState.scoreLimit)
}

function parseScoreFieldValue(value: string) {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function normalizeScoreLimitValue(value: unknown): InspectionCategoryScoreLimit {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value)
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)

    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed)
    }
  }

  return null
}

function isSameScoreLimit(left: InspectionCategoryScoreLimit, right: InspectionCategoryScoreLimit) {
  return left === right
}

function resetLocalStateForRoute() {
  loadError.value = ""
  submitting.value = false
  loadingDetail.value = false
  customerLoading.value = false
  relatedOptionsLoading.value = false
  serviceLevelOptionsLoading.value = false
  templateLoading.value = false
  templateLibraryOpen.value = false
  templateLibraryLoading.value = false
  templateLibraryError.value = ""
  templateKeyword.value = ""
  templateExpandedUuid.value = ""
  inspectionPickerLoading.value = false
  inspectionPickerError.value = ""
  inspectionCategoryLoading.value = false
  inspectionCategoryError.value = ""
  customerOptions.value = []
  templateOptions.value = []
  parkOptions.value = []
  buildingOptions.value = []
  inspectionItemOptions.value = []
  inspectionCategoryOptions.value = []
  serviceLevelEntries.value = []
  buildingConfigs.value = []
  batchTemplateUuid.value = ""
  closeBuildingEditor()
  closeScoreLimitPopover()
  legacyMultiParkMessage.value = ""
  Object.assign(form, createEmptyBaseForm())
  initialBaseForm.value = createEmptyBaseForm()
  initialBuildingConfigs.value = []
  initialBatchTemplateUuid.value = ""
  initialLegacyMultiParkMessage.value = ""
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

function dedupeText(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map(value => normalizeText(value)).filter(Boolean)))
}

function haveSameTextSet(left: string[], right: string[]) {
  const normalizedLeft = dedupeText(left).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
  const normalizedRight = dedupeText(right).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))

  if (normalizedLeft.length !== normalizedRight.length) {
    return false
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index])
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

function dedupeSelectOptions(options: Array<{ value: string; label: string }>) {
  const seen = new Set<string>()

  return options.filter((option) => {
    if (!option.value || seen.has(option.value)) {
      return false
    }

    seen.add(option.value)
    return true
  })
}

function resolveParkIdentity(parkUuid: unknown, parkName: unknown) {
  const normalizedParkUuid = normalizeText(parkUuid)

  if (normalizedParkUuid) {
    return normalizedParkUuid
  }

  const normalizedParkName = normalizeText(parkName)
  return normalizedParkName ? `park-name:${normalizedParkName}` : ""
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-[1021px] min-w-0 flex-col gap-6 pb-8">
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
        <Button size="sm" variant="outline" class="gap-2" @click="loadInitialOptions">
          <i class="ri-refresh-line text-sm" />
          重试
        </Button>
      </AlertDescription>
    </Alert>

    <div class="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1fr)_1px_460px]">
      <form class="min-w-0 lg:sticky lg:top-24 lg:self-start lg:pr-6" @submit.prevent="handleSubmit">
        <FormFieldSection
          id="section-customer"
          quick-nav-label="所属客户"
          label="所属客户"
          layout="vertical"
        >
          <Select v-model="form.customerUuid" :disabled="customerLoading || !customerOptions.length || Boolean(legacyMultiParkMessage)">
            <SelectTrigger id="inspection-service-customer" class="w-full">
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
          id="section-service"
          quick-nav-label="服务信息"
          layout="vertical"
        >
          <div class="grid gap-3 sm:grid-cols-10">
            <label class="space-y-2 sm:col-span-7">
              <span class="text-sm font-medium text-foreground">服务名称</span>
              <Input
                id="inspection-service-name"
                v-model="form.name"
                required
                placeholder="请输入服务名称"
                class="w-full"
                :disabled="isInteractionLocked"
              />
            </label>

            <label class="space-y-2 sm:col-span-3">
              <span class="text-sm font-medium text-foreground">服务等级</span>
              <Select v-model="form.level" :disabled="isInteractionLocked || serviceLevelOptionsLoading || !serviceLevelOptions.length">
                <SelectTrigger id="inspection-service-level" class="w-full">
                  <SelectValue :placeholder="serviceLevelOptionsLoading ? '正在加载服务等级...' : '请选择服务等级'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="option in serviceLevelOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
        </FormFieldSection>

        <FormFieldSection
          id="section-manager"
          quick-nav-label="负责人"
          label="负责人"
          layout="vertical"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <Input
              v-model="form.managerName"
              required
              placeholder="请输入负责人姓名"
              class="w-full"
              :disabled="isInteractionLocked"
            />
            <Input
              v-model="form.managerPhone"
              required
              type="tel"
              inputmode="tel"
              placeholder="请输入负责人电话"
              class="w-full"
              :disabled="isInteractionLocked"
            />
          </div>
        </FormFieldSection>

        <FormFieldSection
          id="section-builds"
          quick-nav-label="服务建筑"
          label="服务建筑"
          description="直接展开园区并勾选建筑；一旦选中某个园区内建筑，其他园区会锁定。"
          layout="vertical"
        >
          <div v-if="legacyMultiParkMessage">
            <Alert variant="destructive">
              <AlertTitle>历史记录为多园区配置</AlertTitle>
              <AlertDescription>{{ legacyMultiParkMessage }}</AlertDescription>
            </Alert>
          </div>

          <div v-else-if="!groupedBuildingParks.length" class="border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
            当前客户下暂无可选建筑。
          </div>

          <div v-else class="w-full min-w-0">
            <template v-if="relatedOptionsLoading">
              <div class="space-y-3">
                <Skeleton class="h-4 w-40 max-w-full" />
                <div class="grid gap-2.5 sm:grid-cols-2">
                  <Skeleton
                    v-for="slot in 4"
                    :key="`building-pick-skeleton-${slot}`"
                    class="h-[4.75rem] w-full rounded-xl"
                  />
                </div>
              </div>
            </template>

            <Accordion
              v-model="expandedBuildGroupKey"
              type="single"
              collapsible
              class="space-y-3"
            >
              <AccordionItem
                v-for="group in groupedBuildingParks"
                :key="group.key"
                :value="group.key"
                :class="cn(
                  'overflow-hidden rounded-md border border-border/55 bg-muted shadow-xs data-[state=open]:bg-muted dark:bg-card dark:data-[state=open]:bg-card',
                  isParkSelectionLocked && form.parkUuid !== group.parkUuid && 'opacity-55',
                )"
              >
                <AccordionTrigger
                  class="px-3.5 py-3 text-left hover:no-underline"
                  :disabled="isParkSelectionLocked && form.parkUuid !== group.parkUuid"
                >
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
                      :class="cn(
                        'relative flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3 shadow-xs transition-all duration-200',
                        isBuildSelected(build.uuid)
                          ? 'border-[color:var(--theme-primary)]/50 bg-[color:var(--theme-primary)]/10 shadow-sm ring-1 ring-[color:var(--theme-primary)]/15'
                          : 'border-border/55 bg-background hover:border-[color:var(--theme-primary)]/35 hover:bg-background hover:shadow-sm dark:bg-muted dark:hover:bg-muted/75',
                      )"
                    >
                      <Checkbox
                        :model-value="isBuildSelected(build.uuid)"
                        :disabled="Boolean(legacyMultiParkMessage)"
                        class="mt-0.5"
                        @update:model-value="updateBuildChecked(build, $event)"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-sm font-medium text-foreground">
                          {{ build.name }}
                        </div>
                      </div>
                    </label>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </FormFieldSection>

        <FormFieldSection
          id="section-remark"
          quick-nav-label="备注"
          label="备注"
          label-for="inspection-service-remark"
          align="start"
          layout="vertical"
          last
        >
          <Textarea
            id="inspection-service-remark"
            v-model="form.remark"
            placeholder="请输入备注"
            class="min-h-[120px] w-full resize-y"
            :disabled="isInteractionLocked"
          />
        </FormFieldSection>
      </form>

      <Separator orientation="vertical" class="hidden h-auto bg-border/80 lg:block" />

      <div class="min-w-0 lg:max-w-[460px] lg:pl-6">
        <section class="pt-5 pb-5">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-foreground">
              已选 {{ selectedBuildCount }} 栋建筑
            </h3>

            <Button
              size="sm"
              variant="outline"
              type="button"
              class="h-7 px-2 text-xs"
              :disabled="!groupedBuildingParks.length || relatedOptionsLoading || Boolean(legacyMultiParkMessage)"
              :title="selectedBatchTemplateName ? `当前模板：${selectedBatchTemplateName}` : '使用模板'"
              @click="handleUseBuildingTemplate"
            >
              <i class="ri-file-copy-line mr-1.5 text-sm" />
              <span class="max-w-[10rem] truncate">
                {{ selectedBatchTemplateName ? `当前模板：${selectedBatchTemplateName}` : "使用模板" }}
              </span>
            </Button>
          </div>

          <div class="mt-4">
            <div v-if="!sortedBuildingConfigs.length" class="border border-dashed border-border/60 px-4 py-8 text-center">
              <p class="text-sm font-medium text-foreground">还没有选中建筑</p>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                勾选建筑后，这里会列出对应的配置卡片，便于逐栋编辑检测项和分数上限。
              </p>
            </div>

            <div v-else class="grid gap-4">
              <article
                v-for="config in sortedBuildingConfigs"
                :key="config.buildUuid"
                class="rounded-md border border-border/60 bg-background p-3 transition-colors hover:bg-accent/30"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <h4 class="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                      {{ config.buildName }}
                    </h4>
                    <p class="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {{ getBuildingScoreLimitSummary(config) }}
                    </p>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      class="h-7 gap-1 px-2 text-xs"
                      :disabled="Boolean(legacyMultiParkMessage)"
                      @click="openBuildingEditor(config)"
                    >
                      <i class="ri-edit-line text-[13px]" />
                      编辑检测项
                    </Button>

                    <Tooltip>
                      <TooltipTrigger as-child>
                        <span class="inline-flex">
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            class="size-7 px-0"
                            :disabled="Boolean(getCategoryScoreLimitActionDisabledReason(config)) || Boolean(legacyMultiParkMessage)"
                            aria-label="配置分数上限"
                            @click="handleScoreLimitPopoverOpenChange(config.buildUuid, true)"
                          >
                            <i class="ri-settings-3-line text-[13px]" />
                            <span class="sr-only">分数上限</span>
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {{ getCategoryScoreLimitActionDisabledReason(config) || "配置分数上限" }}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div class="mt-3">
                  <span class="text-[11px] text-muted-foreground">检测项</span>
                  <p class="mt-1 text-xs leading-5 text-muted-foreground">
                    {{ getBuildingInspectionSummary(config) }}
                  </p>
                </div>

              </article>
            </div>
          </div>
        </section>

      </div>
    </div>

    <Dialog :open="Boolean(currentScoreLimitConfig)" @update:open="!$event && closeScoreLimitPopover()">
      <DialogContent class="max-w-xl gap-0 p-0">
        <DialogHeader class="border-b border-border/60 p-4">
          <DialogTitle>配置分数上限</DialogTitle>
          <DialogDescription>
            {{ currentScoreLimitConfig?.buildName || "当前建筑" }} 未改动时将使用各分类的预设分数上限。
          </DialogDescription>
        </DialogHeader>

        <div class="max-h-[70vh] overflow-y-auto px-4 py-2">
          <div
            v-if="currentScoreLimitConfig && !getInspectionCategoriesForConfig(currentScoreLimitConfig).length"
            class="py-6 text-sm text-muted-foreground"
          >
            当前建筑暂无已选检测项分类可配置。
          </div>
          <div
            v-for="category in (currentScoreLimitConfig ? getInspectionCategoriesForConfig(currentScoreLimitConfig) : [])"
            :key="`${currentScoreLimitConfig?.buildUuid || 'score-limit'}-${category.uuid}`"
            class="flex items-center justify-between gap-4 border-b border-dashed border-border/60 py-3 last:border-b-0"
          >
            <label
              :for="`score-limit-${currentScoreLimitConfig?.buildUuid || 'score-limit'}-${category.uuid}`"
              class="min-w-0 flex-1 text-sm font-medium text-foreground"
            >
              {{ category.name }}
            </label>
            <Input
              :id="`score-limit-${currentScoreLimitConfig?.buildUuid || 'score-limit'}-${category.uuid}`"
              type="number"
              min="0"
              inputmode="numeric"
              :model-value="scoreLimitDraftForms[category.uuid]?.scoreLimit ?? ''"
              class="h-8 w-28 shrink-0 text-right tabular-nums"
              @update:model-value="updateScoreLimitField(category.uuid, 'scoreLimit', $event)"
            />
          </div>
        </div>

        <DialogFooter class="border-t border-border/60 p-4">
          <Button size="sm" variant="outline" type="button" @click="resetScoreLimitDraft">
            恢复初始
          </Button>
          <Button
            v-if="currentScoreLimitConfig"
            size="sm"
            variant="outline"
            type="button"
            @click="clearScoreLimitOverrides(currentScoreLimitConfig.buildUuid)"
          >
            清空自定义
          </Button>
          <Button
            v-if="currentScoreLimitConfig"
            size="sm"
            type="button"
            @click="saveScoreLimitDraft(currentScoreLimitConfig.buildUuid)"
          >
            保存上限
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="templateLibraryOpen">
      <DialogContent class="max-w-4xl gap-0 p-0">
        <DialogHeader class="p-4">
          <DialogTitle>选择检测模板</DialogTitle>
          <DialogDescription>
            选中后会作为当前模板。当前已选建筑会同步应用，后续新选建筑也会自动带出该模板检测项。
          </DialogDescription>
        </DialogHeader>

        <div class="flex max-h-[70vh] flex-col overflow-hidden">
          <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-1">
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
                  template.uuid === batchTemplateUuid
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
                    :variant="template.uuid === batchTemplateUuid ? 'default' : 'outline'"
                    @click.stop="applyTemplate(template)"
                  >
                    {{ template.uuid === batchTemplateUuid ? "当前已选" : "使用此模板" }}
                  </Button>
                </div>

                <AccordionContent class="px-3.5">
                  <div v-if="template.inspections.length" class="space-y-2 pb-3 pt-1">
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

                  <p v-else class="pb-3 pt-1 text-sm text-muted-foreground">
                    该模板下暂无检测项。
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        <DialogFooter class="p-4">
          <Button type="button" variant="outline" @click="templateLibraryOpen = false">
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ResponsiveRightSheet
      :open="buildingEditorOpen"
      sheet-content-class="overflow-hidden sm:max-w-2xl"
      primary-label="保存"
      @update:open="buildingEditorOpen = $event"
      @footer-primary="saveBuildingEditor"
    >
      <template #actions>
        <div class="flex items-center justify-between gap-3">
          <TooltipWrap content="关闭建筑检测项编辑" side="right">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              @click="closeBuildingEditor"
            >
              <i class="ri-arrow-right-double-line text-[16px]" />
              <span class="sr-only">关闭建筑检测项编辑</span>
            </Button>
          </TooltipWrap>
          <Button size="sm" type="button" @click="saveBuildingEditor">
            保存当前建筑配置
          </Button>
        </div>
      </template>
      <template #title>{{ currentBuildingEditorTitle }}</template>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-0 pb-4 pt-4 sm:px-3">
        <p class="mb-4 text-sm leading-6 text-muted-foreground">
          当前面板只会修改这栋建筑的检测项，不影响其他已选建筑。
        </p>

        <InspectionItemPicker
          :model-value="buildingEditorDraftUuids"
          :options="inspectionItemOptions"
          :loading="inspectionPickerLoading"
          :error-message="inspectionPickerError"
          :open="buildingEditorOpen"
          @update:model-value="buildingEditorDraftUuids = $event"
        />
      </div>
    </ResponsiveRightSheet>
  </section>
</template>
