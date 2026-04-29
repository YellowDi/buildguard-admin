<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import InspectionCategoryScoreLimitInline from "@/components/inspection/InspectionCategoryScoreLimitInline.vue"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import TitleBlock from "@/components/layout/TitleBlock.vue"
import FormDatePicker from "@/components/form/FormDatePicker.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import DetailRelationSkeleton from "@/components/loading/DetailRelationSkeleton.vue"
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
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { TooltipWrap } from "@/components/ui/tooltip"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { buildApiRequestUrl } from "@/lib/api"
import { handleApiError } from "@/lib/api-errors"
import { fetchInspectionCategories } from "@/lib/inspection-categories-api"
import { toMobileActionLabel } from "@/lib/mobileActionLabel"
import { getInspectionItemDetail, type InspectionItemRecord } from "@/lib/inspection-items-api"
import {
  deleteInspectionService,
  fetchInspectionServiceDetail,
  type InspectionServiceListItem,
  updateInspectionServiceContract,
} from "@/lib/inspection-services-api"

type InspectionServiceInspectionTableRow = {
  id: string
  inspectionUuid: string
  inspectionItemName: string
  forcePhotoState: InspectionFlagDisplayState
  forcePhotoText: string
  measureRecordState: InspectionFlagDisplayState
  measureRecordText: string
  buildName: string
  categoryName: string
}

type InspectionFlagDisplayState = "yes" | "no" | "loading" | "unknown"

type InspectionParkModuleGroup = {
  key: string
  title: string
  parkUuid: string
  buildCount: number
  inspectionCount: number
  modules: DetailRelationModuleSchema<InspectionServiceInspectionTableRow>[]
}

type ActiveInspectionItemDetail = {
  uuid: string
  buildName: string
  categoryName: string
  inspectionItemName: string
}

const route = useRoute()
const router = useRouter()

const detail = ref<InspectionServiceListItem | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const deleteConfirmOpen = ref(false)
const deleteSubmitting = ref(false)
const uploadContractDialogOpen = ref(false)
const uploadingContract = ref(false)
const uploadContractFileInputRef = ref<HTMLInputElement | null>(null)
const linkedDetailSheetOpen = ref(false)
const inspectionItemDetailSheetOpen = ref(false)
const uploadContractForm = ref({
  contractEndTime: "",
  contractFile: "",
  contractFileName: "",
})
const linkedDetailSheetKind = ref<"customer" | "service" | "plan" | "park" | null>(null)
const linkedDetailSheetUuid = ref("")
const activeInspectionItemDetail = ref<ActiveInspectionItemDetail | null>(null)
let latestRequestId = 0
const inspectionItemDetailByUuid = ref<Record<string, InspectionItemRecord>>({})
const inspectionItemDetailLoadingByUuid = ref<Record<string, boolean>>({})
const inspectionItemDetailErrorByUuid = ref<Record<string, string>>({})
const globalCategoryWeightByKey = ref<Record<string, number | null>>({})
const expandedParkGroupKey = ref("")
const expandedBuildingModuleKeys = ref<string[]>([])

const inspectionServiceUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const customerUuid = computed(() => {
  const queryValue = typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : ""
  return queryValue || toText(detail.value?.CustomerUuid, "")
})

const fieldSections = computed<DetailFieldSection[]>(() => {
  const current = detail.value
  if (!current) {
    return []
  }

  return [
    {
      key: "inspection-service-info",
      title: "服务信息",
      rows: [
        { key: "name", label: "服务名称", value: toText(current.Name, "未命名服务") },
        { key: "status", label: "服务状态", value: buildStatusValue(current.Status) },
        { key: "level", label: "套餐等级", value: toText(current.Level, "-") },
        {
          key: "customer-name",
          label: "客户名称",
          value: toText(current.CorpName || current.CustomerName, "未绑定客户"),
          linkAction: customerUuid.value
            ? { onClick: goToCustomerDetail }
            : undefined,
        },
        { key: "template-name", label: "模板名称", value: toText(current.TemplateName, "-") },
        {
          key: "contract-start-time",
          label: "合同开始时间",
          value: toText(current.StartTime, "-"),
        },
        {
          key: "contract-end-time",
          label: "合同到期时间",
          value: toText(current.ContractEndTime, "-"),
          suffixHint: getRemainingDaysHint(current.ContractEndTime),
        },
        {
          key: "contract-file",
          label: "合同文件",
          value: "",
          action: resolveFileUrl(current.ContractFile)
            ? { label: "下载合同", onClick: () => downloadContractFile(current.ContractFile) }
            : { label: "上传合同", onClick: openUploadContractDialog },
        },
        { key: "created-at", label: "创建时间", value: toText(current.CreatedAt, "-") },
        { key: "updated-at", label: "更新时间", value: toText(current.UpdatedAt, "-") },
        { key: "remark", label: "备注", value: toText(current.Remark, "-"), truncate: false, valueClass: "leading-6" },
      ],
    },
    {
      key: "inspection-service-manager",
      title: "负责人信息",
      rows: [
        {
          key: "manager",
          label: "负责人",
          value: buildContactValue(toText(current.ManagerName, "未填写"), toText(current.ManagerPhone, "-")),
        },
      ],
    },
  ]
})

const inspectionItemMetaByUuid = computed<Record<string, InspectionItemRecord>>(() => (
  buildInspectionItemMetaByUuid(detail.value)
))
const parkInspectionModuleGroups = computed<InspectionParkModuleGroup[]>(() => (
  buildParkInspectionModuleGroups(detail.value?.BuildInfos ?? detail.value?.Builds)
))
const buildingInspectionModules = computed<DetailRelationModuleSchema<InspectionServiceInspectionTableRow>[]>(() => (
  parkInspectionModuleGroups.value.flatMap(group => group.modules)
))
const inspectionOverviewCount = computed(() => (
  buildingInspectionModules.value.reduce((sum, module) => (
    sum + (module.count ?? module.groups.reduce((groupSum, group) => groupSum + group.rows.length, 0))
  ), 0)
))
const inspectionItemSheetTitle = computed(() => (
  activeInspectionItemDetail.value?.inspectionItemName || "检测项详情"
))
const inspectionItemSheetDescription = computed(() => {
  const current = activeInspectionItemDetail.value

  if (!current) {
    return ""
  }

  return `${current.buildName} · ${current.categoryName}`
})
const activeInspectionItemUuid = computed(() => activeInspectionItemDetail.value?.uuid || "")
const activeInspectionItemLoading = computed(() => (
  Boolean(activeInspectionItemUuid.value && inspectionItemDetailLoadingByUuid.value[activeInspectionItemUuid.value])
))
const activeInspectionItemError = computed(() => (
  activeInspectionItemUuid.value ? inspectionItemDetailErrorByUuid.value[activeInspectionItemUuid.value] || "" : ""
))
const activeInspectionItemSections = computed<DetailFieldSection[]>(() => {
  const current = activeInspectionItemDetail.value

  if (!current) {
    return []
  }

  return [
    {
      key: "inspection-item-basic",
      title: "基础信息",
      rows: [
        { key: "build-name", label: "建筑", value: current.buildName },
        { key: "category-name", label: "检测分类", value: current.categoryName },
        { key: "inspection-item-name", label: "检测项名称", value: current.inspectionItemName },
        { key: "force-photo", label: "是否强制拍照", value: resolveInspectionItemForcePhoto(current.uuid) },
        { key: "measure-record", label: "是否记录实测值", value: resolveInspectionItemMeasureRecord(current.uuid) },
      ],
    },
    {
      key: "inspection-item-definition",
      title: "检测定义",
      rows: [
        { key: "content", label: "检测内容", value: resolveInspectionItemContent(current.uuid), truncate: false, valueClass: "leading-6 whitespace-pre-wrap break-words" },
        { key: "standard", label: "判定标准", value: resolveInspectionItemStandard(current.uuid), truncate: false, valueClass: "leading-6 whitespace-pre-wrap break-words" },
      ],
    },
  ]
})

watch(detail, (current) => {
  detailBreadcrumbTitle.value = toOptionalText(current?.Name)
})

watch(buildingInspectionModules, (modules) => {
  if (!modules.length) {
    expandedBuildingModuleKeys.value = []
    return
  }

  const validKeys = new Set(modules.map(module => String(module.key)))
  const nextExpandedKeys = expandedBuildingModuleKeys.value.filter(key => validKeys.has(key))

  expandedBuildingModuleKeys.value = nextExpandedKeys.length
    ? nextExpandedKeys
    : [String(modules[0]?.key ?? "")]
}, { immediate: true })

watch(parkInspectionModuleGroups, (groups) => {
  if (!groups.length) {
    expandedParkGroupKey.value = ""
    return
  }

  if (!groups.some(group => group.key === expandedParkGroupKey.value)) {
    expandedParkGroupKey.value = groups[0]?.key ?? ""
  }
}, { immediate: true })

watch(inspectionServiceUuid, (nextUuid) => {
  void loadInspectionServiceDetail(nextUuid)
}, { immediate: true })

void loadInspectionCategoryDefaults()

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

function goBack() {
  void router.push({ name: "inspection-services" })
}

function goToCustomerDetail() {
  if (!customerUuid.value) {
    toast.error("当前检测服务缺少客户 Uuid，无法跳转客户详情")
    return
  }

  linkedDetailSheetKind.value = "customer"
  linkedDetailSheetUuid.value = customerUuid.value
  linkedDetailSheetOpen.value = true
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  linkedDetailSheetOpen.value = open

  if (!open) {
    linkedDetailSheetKind.value = null
    linkedDetailSheetUuid.value = ""
  }
}

function handleInspectionItemDetailSheetOpenChange(open: boolean) {
  inspectionItemDetailSheetOpen.value = open

  if (!open) {
    activeInspectionItemDetail.value = null
  }
}

async function openInspectionItemDetailSheet(args: ActiveInspectionItemDetail) {
  activeInspectionItemDetail.value = args
  inspectionItemDetailSheetOpen.value = true

  if (args.uuid) {
    await ensureInspectionItemDetailLoaded(args.uuid)
  }
}

function goToEdit() {
  if (!inspectionServiceUuid.value) {
    return
  }

  void router.push({
    name: "inspection-service-edit",
    params: { id: inspectionServiceUuid.value },
    query: customerUuid.value ? { customerUuid: customerUuid.value } : undefined,
  })
}

async function confirmDelete() {
  if (!inspectionServiceUuid.value || deleteSubmitting.value) {
    return
  }

  deleteSubmitting.value = true

  try {
    await deleteInspectionService({ Uuid: inspectionServiceUuid.value })
    deleteConfirmOpen.value = false
    toast.success("检测服务已删除")
    await router.push({ name: "inspection-services" })
  } catch (error) {
    handleApiError(error, {
      fallback: "检测服务删除失败，请稍后重试。",
    })
  } finally {
    deleteSubmitting.value = false
  }
}

function openContractFile(file: unknown) {
  const fileUrl = resolveFileUrl(file)

  if (!fileUrl) {
    toast.error("当前检测服务暂无合同文件")
    return
  }

  if (typeof window !== "undefined") {
    window.open(fileUrl, "_blank", "noopener,noreferrer")
  }
}

async function downloadContractFile(file: unknown) {
  const fileUrl = resolveFileUrl(file)

  if (!fileUrl) {
    toast.error("当前检测服务暂无合同文件")
    return
  }

  const fileName = getContractFileLabel(file)

  try {
    const response = await fetch(fileUrl)

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`)
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = objectUrl
    link.download = fileName || "合同文件"
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    // 回退为新标签打开，避免跨域下载限制导致无法获取 blob。
    openContractFile(file)
  }
}

function openUploadContractDialog() {
  if (!inspectionServiceUuid.value) {
    toast.error("当前检测服务缺少 Uuid，无法上传合同")
    return
  }

  uploadContractForm.value = {
    contractEndTime: toText(detail.value?.ContractEndTime, ""),
    contractFile: "",
    contractFileName: "",
  }
  uploadContractDialogOpen.value = true
}

function triggerSelectContractFile() {
  uploadContractFileInputRef.value?.click()
}

async function handleContractFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]

  if (!file) {
    return
  }

  try {
    const fileBase64 = await readFileAsDataUrl(file)
    uploadContractForm.value.contractFile = fileBase64
    uploadContractForm.value.contractFileName = file.name
  } catch {
    toast.error("合同文件读取失败，请重新选择文件")
  } finally {
    if (input) {
      input.value = ""
    }
  }
}

async function submitUploadContract() {
  if (!inspectionServiceUuid.value) {
    toast.error("当前检测服务缺少 Uuid，无法上传合同")
    return
  }

  if (!uploadContractForm.value.contractEndTime) {
    toast.error("请填写合同到期时间")
    return
  }

  uploadingContract.value = true

  try {
    await updateInspectionServiceContract({
      Uuid: inspectionServiceUuid.value,
      ContractEndTime: uploadContractForm.value.contractEndTime,
      ContractFile: uploadContractForm.value.contractFile,
    })

    toast.success("合同信息已更新")
    uploadContractDialogOpen.value = false
    await loadInspectionServiceDetail(inspectionServiceUuid.value)
  } catch (error) {
    handleApiError(error, {
      fallback: "合同上传失败，请稍后重试。",
    })
  } finally {
    uploadingContract.value = false
  }
}

async function loadInspectionServiceDetail(uuid: string) {
  const requestId = ++latestRequestId

  if (!uuid) {
    detail.value = null
    errorMessage.value = "检测服务详情参数缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""
  inspectionItemDetailByUuid.value = {}
  inspectionItemDetailLoadingByUuid.value = {}
  inspectionItemDetailErrorByUuid.value = {}

  try {
    const detailResult = await fetchInspectionServiceDetail({
      Uuid: uuid,
    })

    if (requestId !== latestRequestId) {
      return
    }

    detail.value = detailResult
    void preloadMissingInspectionItemFlags(detailResult, requestId)
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    detail.value = null
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测服务详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function loadInspectionCategoryDefaults() {
  try {
    const result = await fetchInspectionCategories()

    globalCategoryWeightByKey.value = Object.fromEntries(
      result.list.flatMap((item, index) => {
        const categoryName = toText(item.Name, `分类 ${index + 1}`)
        const categoryKey = resolveInspectionCategoryKey(toText(item.Uuid, ""), categoryName)
        const scoreLimit = toValidCategoryWeight(item.Score)

        return categoryKey ? [[categoryKey, scoreLimit] as const] : []
      }),
    )
  } catch {
    globalCategoryWeightByKey.value = {}
  }
}

function buildInspectionItemMetaByUuid(serviceDetail: InspectionServiceListItem | null) {
  const items = Array.isArray(serviceDetail?.Inspections) ? serviceDetail.Inspections : []
  const metaMap: Record<string, InspectionItemRecord> = {}

  items.forEach((item) => {
    const inspectionUuid = toText(item.InspectionUuid ?? item.Uuid, "")

    if (!inspectionUuid) {
      return
    }

    metaMap[inspectionUuid] = item
  })

  return metaMap
}

function buildBuildingInspectionModule(
  build: NonNullable<InspectionServiceListItem["Builds"]>[number],
  buildIndex: number,
) {
  const buildName = toText(build.BuildName, `建筑 ${buildIndex + 1}`)
  const buildKey = toText(build.BuildUuid, `inspection-service-build-${buildIndex + 1}`)
  const groups = buildInspectionTableGroups(build, buildIndex)

  return {
    key: buildKey || `inspection-service-build-${buildIndex + 1}`,
    title: buildName,
    count: groups.reduce((sum, group) => sum + group.rows.length, 0),
    rowKey: "id",
    columns: [
      { key: "inspectionItemName", label: "检测项", slot: "inspection-item-name-cell" },
      { key: "forcePhotoText", label: "是否强制拍照", cellClass: "flex justify-center whitespace-nowrap text-muted-foreground" },
      { key: "measureRecordText", label: "是否记录实测值", cellClass: "flex justify-center whitespace-nowrap text-muted-foreground" },
    ],
    groups,
    emptyState: {
      title: "暂无建筑检测项",
      description: "当前建筑暂无检测项。",
      icon: "ri-file-list-3-line",
    },
    mobileMinWidth: "36rem",
    columnTemplateMobile: "minmax(12rem,1fr) 7rem 7rem",
    columnTemplateDesktop: "minmax(12rem,1fr) 7rem 7rem",
    columnGapMobile: "0.75rem",
    columnGapDesktop: "1rem",
  } satisfies DetailRelationModuleSchema<InspectionServiceInspectionTableRow>
}

function buildParkInspectionModuleGroups(
  builds: InspectionServiceListItem["Builds"],
) {
  if (!Array.isArray(builds) || !builds.length) {
    return []
  }

  const parkMap = new Map<string, InspectionParkModuleGroup>()

  builds.forEach((build, buildIndex) => {
    const parkName = toText(build.ParkName, "未命名园区")
    const parkKey = toText(build.ParkUuid, "") || `inspection-park-${parkName}`
    const group = parkMap.get(parkKey) ?? {
      key: parkKey,
      title: parkName,
      parkUuid: toText(build.ParkUuid, ""),
      buildCount: 0,
      inspectionCount: 0,
      modules: [],
    }

    const module = buildBuildingInspectionModule(build, buildIndex)
    group.modules.push(module)
    group.buildCount += 1
    group.inspectionCount += module.count ?? module.groups.reduce((sum, itemGroup) => sum + itemGroup.rows.length, 0)
    parkMap.set(parkKey, group)
  })

  return Array.from(parkMap.values())
}

function buildInspectionTableGroups(
  build: NonNullable<InspectionServiceListItem["Builds"]>[number],
  buildIndex: number,
) {
  const categories = Array.isArray(build.List) ? build.List : []

  if (!categories.length) {
    return []
  }

  return categories
    .map((category, categoryIndex) => {
      const categoryName = toText(category.Name, "未分类")
      const categoryUuid = toText(category.Uuid, "") || `inspection-category-name:${categoryName}`
      const items = Array.isArray(category.List) ? category.List : []
      const buildName = toText(build.BuildName, `建筑 ${buildIndex + 1}`)

      return {
        key: categoryUuid || `inspection-category-${buildIndex + 1}-${categoryIndex + 1}`,
        title: categoryName,
        scoreLimit: resolveInspectionServiceCategoryWeight(
          category.Weight,
          category.Score,
          categoryUuid,
          categoryName,
        ),
        rows: items.map((item, itemIndex) => {
          const inspectionUuid = toText(item.Uuid, "")
          const inspectionName = toText(item.Name, `检测项 ${itemIndex + 1}`)

          return {
            id: inspectionUuid || `${categoryUuid || categoryName}-${itemIndex + 1}`,
            inspectionUuid,
            inspectionItemName: inspectionName,
            forcePhotoState: resolveInspectionItemForcePhotoState(inspectionUuid),
            forcePhotoText: resolveInspectionItemForcePhotoText(inspectionUuid, true),
            measureRecordState: resolveInspectionItemMeasureRecordState(inspectionUuid),
            measureRecordText: resolveInspectionItemMeasureRecordText(inspectionUuid, true),
            buildName,
            categoryName,
          }
        }),
      }
    })
    .filter(group => group.rows.length > 0)
}

async function preloadMissingInspectionItemFlags(serviceDetail: InspectionServiceListItem, requestId: number) {
  const inspectionUuids = collectInspectionUuidsMissingFlags(serviceDetail)

  if (!inspectionUuids.length) {
    return
  }

  await Promise.allSettled(inspectionUuids.map(uuid => ensureInspectionItemDetailLoaded(uuid, requestId)))
}

function collectInspectionUuidsMissingFlags(serviceDetail: InspectionServiceListItem) {
  const builds = Array.isArray(serviceDetail.BuildInfos) ? serviceDetail.BuildInfos : serviceDetail.Builds
  const directMetaByUuid = buildInspectionItemMetaByUuid(serviceDetail)
  const inspectionUuids = new Set<string>()

  if (!Array.isArray(builds)) {
    return []
  }

  builds.forEach((build) => {
    const categories = Array.isArray(build.List) ? build.List : []

    categories.forEach((category) => {
      const items = Array.isArray(category.List) ? category.List : []

      items.forEach((item) => {
        const inspectionUuid = toText(item.Uuid, "")

        if (!inspectionUuid) {
          return
        }

        const meta = directMetaByUuid[inspectionUuid]
        const hasForcePhoto = meta?.IsForcePhoto !== undefined && meta?.IsForcePhoto !== null
        const hasMeasureRecord = meta?.IsMeasureRecord !== undefined && meta?.IsMeasureRecord !== null

        if (!hasForcePhoto || !hasMeasureRecord) {
          inspectionUuids.add(inspectionUuid)
        }
      })
    })
  })

  return Array.from(inspectionUuids)
}

async function ensureInspectionItemDetailLoaded(inspectionUuid: string, requestId = latestRequestId) {
  const normalizedInspectionUuid = inspectionUuid.trim()

  if (!normalizedInspectionUuid) {
    return
  }

  if (
    inspectionItemDetailByUuid.value[normalizedInspectionUuid]
    || inspectionItemDetailLoadingByUuid.value[normalizedInspectionUuid]
  ) {
    return
  }

  inspectionItemDetailLoadingByUuid.value = {
    ...inspectionItemDetailLoadingByUuid.value,
    [normalizedInspectionUuid]: true,
  }
  inspectionItemDetailErrorByUuid.value = {
    ...inspectionItemDetailErrorByUuid.value,
    [normalizedInspectionUuid]: "",
  }

  try {
    const inspectionItemDetail = await getInspectionItemDetail({
      Uuid: normalizedInspectionUuid,
    })

    if (requestId !== latestRequestId) {
      return
    }

    inspectionItemDetailByUuid.value = {
      ...inspectionItemDetailByUuid.value,
      [normalizedInspectionUuid]: inspectionItemDetail,
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    inspectionItemDetailErrorByUuid.value = {
      ...inspectionItemDetailErrorByUuid.value,
      [normalizedInspectionUuid]: handleApiError(error, {
        mode: "silent",
        fallback: "检测项详情加载失败，请稍后重试。",
      }),
    }
  } finally {
    if (requestId !== latestRequestId) {
      return
    }

    inspectionItemDetailLoadingByUuid.value = {
      ...inspectionItemDetailLoadingByUuid.value,
      [normalizedInspectionUuid]: false,
    }
  }
}

function getInspectionItemDetailValue(inspectionUuid: string) {
  if (!inspectionUuid) {
    return undefined
  }

  const directMeta = inspectionItemMetaByUuid.value[inspectionUuid]
  const loadedMeta = inspectionItemDetailByUuid.value[inspectionUuid]

  if (!directMeta) {
    return loadedMeta
  }

  if (!loadedMeta) {
    return directMeta
  }

  return {
    ...loadedMeta,
    ...Object.fromEntries(
      Object.entries(directMeta).filter(([, value]) => value !== undefined),
    ),
  }
}

function resolveInspectionItemContent(inspectionUuid: string) {
  const detail = getInspectionItemDetailValue(inspectionUuid)
  return toText(detail?.Content, "-")
}

function resolveInspectionItemStandard(inspectionUuid: string) {
  const detail = getInspectionItemDetailValue(inspectionUuid)
  return toText(detail?.Standard, "-")
}

function resolveInspectionItemForcePhoto(inspectionUuid: string) {
  return resolveInspectionItemForcePhotoText(inspectionUuid)
}

function resolveInspectionItemMeasureRecord(inspectionUuid: string) {
  return resolveInspectionItemMeasureRecordText(inspectionUuid)
}

function resolveInspectionItemForcePhotoState(inspectionUuid: string): InspectionFlagDisplayState {
  return resolveInspectionItemFlagState(getInspectionItemDetailValue(inspectionUuid)?.IsForcePhoto, inspectionUuid)
}

function resolveInspectionItemMeasureRecordState(inspectionUuid: string): InspectionFlagDisplayState {
  return resolveInspectionItemFlagState(getInspectionItemDetailValue(inspectionUuid)?.IsMeasureRecord, inspectionUuid)
}

function resolveInspectionItemForcePhotoText(inspectionUuid: string, allowLoading = false) {
  const detail = getInspectionItemDetailValue(inspectionUuid)
  if (detail?.IsForcePhoto !== undefined && detail?.IsForcePhoto !== null) {
    return formatInspectionFlag(detail.IsForcePhoto)
  }

  if (allowLoading && inspectionUuid && inspectionItemDetailLoadingByUuid.value[inspectionUuid]) {
    return "加载中..."
  }

  return "-"
}

function resolveInspectionItemFlagState(value: unknown, inspectionUuid: string): InspectionFlagDisplayState {
  if (value === 1 || value === "1" || value === true) {
    return "yes"
  }

  if (value === 2 || value === "2" || value === false) {
    return "no"
  }

  if (inspectionUuid && inspectionItemDetailLoadingByUuid.value[inspectionUuid]) {
    return "loading"
  }

  return "unknown"
}

function getFlagIconClass(state: InspectionFlagDisplayState) {
  if (state === "yes") {
    return "ri-check-line"
  }

  if (state === "no") {
    return "ri-close-line"
  }

  if (state === "loading") {
    return "ri-loader-4-line animate-spin"
  }

  return "ri-subtract-line"
}

function getRelationModuleStyle(schema: DetailRelationModuleSchema<InspectionServiceInspectionTableRow>) {
  return {
    "--detail-relation-columns-mobile": schema.columnTemplateMobile,
    "--detail-relation-columns-desktop": schema.columnTemplateDesktop ?? schema.columnTemplateMobile,
    "--detail-relation-grid-gap-mobile": schema.columnGapMobile ?? "0.75rem",
    "--detail-relation-grid-gap-desktop": schema.columnGapDesktop ?? schema.columnGapMobile ?? "1rem",
  }
}

function isBuildingModuleExpanded(moduleKey: string | number) {
  return expandedBuildingModuleKeys.value.includes(String(moduleKey))
}

function setBuildingModuleExpanded(moduleKey: string | number, open: boolean) {
  const normalizedKey = String(moduleKey)

  if (open) {
    if (!expandedBuildingModuleKeys.value.includes(normalizedKey)) {
      expandedBuildingModuleKeys.value = [...expandedBuildingModuleKeys.value, normalizedKey]
    }
    return
  }

  expandedBuildingModuleKeys.value = expandedBuildingModuleKeys.value.filter(key => key !== normalizedKey)
}

function resolveInspectionItemMeasureRecordText(inspectionUuid: string, allowLoading = false) {
  const detail = getInspectionItemDetailValue(inspectionUuid)
  if (detail?.IsMeasureRecord !== undefined && detail?.IsMeasureRecord !== null) {
    return formatInspectionFlag(detail.IsMeasureRecord)
  }

  if (allowLoading && inspectionUuid && inspectionItemDetailLoadingByUuid.value[inspectionUuid]) {
    return "加载中..."
  }

  return "-"
}

function buildStatusValue(status: unknown): DetailStatusValue {
  const normalizedStatus = typeof status === "number" && Number.isFinite(status) ? String(status) : "-1"

  return {
    kind: "status",
    value: normalizedStatus,
    renderer: {
      kind: "status",
      map: {
        "1": { label: "待签署", tone: "yellow", icon: "clock" },
        "2": { label: "进行中", tone: "blue", icon: "clock" },
        "3": { label: "已逾期", tone: "orange", icon: "alert" },
        "4": { label: "已结单", tone: "gray", icon: "minus" },
      },
      fallback: {
        label: "未知状态",
        tone: "gray",
        icon: "minus",
      },
    },
  }
}

function buildContactValue(name: string, phone?: string): DetailContactValue {
  return {
    kind: "contact",
    name,
    phone,
  }
}

function formatInspectionFlag(value: unknown) {
  if (value === 1 || value === "1" || value === true) {
    return "是"
  }

  if (value === 2 || value === "2" || value === false) {
    return "否"
  }

  return "-"
}

function resolveFileUrl(value: unknown) {
  const normalized = toText(value, "")

  if (!normalized) {
    return ""
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(normalized)) {
    return normalized
  }

  try {
    return new URL(normalized, buildApiRequestUrl("/").toString()).toString()
  } catch {
    return normalized
  }
}

function getContractFileLabel(value: unknown) {
  const fileUrl = resolveFileUrl(value)

  if (!fileUrl) {
    return "无合同文件"
  }

  try {
    const pathname = new URL(fileUrl).pathname
    const fileName = decodeURIComponent(pathname.split("/").pop() ?? "").trim()

    return fileName || "查看合同文件"
  } catch {
    return "查看合同文件"
  }
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function toOptionalText(value: unknown) {
  const nextValue = toText(value, "")
  return nextValue || null
}

function toOptionalRoundedNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value)
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return Math.round(parsed)
    }
  }

  return null
}

function resolveInspectionServiceCategoryWeight(
  weight: unknown,
  score: unknown,
  categoryUuid = "",
  categoryName = "",
) {
  return toValidCategoryWeight(weight)
    ?? toValidCategoryWeight(score)
    ?? getDefaultInspectionCategoryWeight(categoryUuid, categoryName)
}

function toValidCategoryWeight(value: unknown) {
  const parsedValue = toOptionalRoundedNumber(value)

  if (parsedValue === null || parsedValue < 1 || parsedValue > 10) {
    return null
  }

  return parsedValue
}

function getDefaultInspectionCategoryWeight(categoryUuid: string, categoryName: string) {
  const categoryKey = resolveInspectionCategoryKey(categoryUuid, categoryName)

  return categoryKey in globalCategoryWeightByKey.value
    ? globalCategoryWeightByKey.value[categoryKey]
    : null
}

function resolveInspectionCategoryKey(categoryUuid: string, categoryName: string) {
  const normalizedUuid = toText(categoryUuid, "")

  if (normalizedUuid) {
    return normalizedUuid
  }

  const normalizedName = toText(categoryName, "")
  return normalizedName ? `inspection-category-name:${normalizedName}` : ""
}

function getRemainingDaysHint(value: unknown) {
  const dateText = toText(value, "")
  if (!dateText) {
    return ""
  }

  const normalized = dateText.includes("T") ? dateText : dateText.replace(" ", "T")
  const expireDate = new Date(normalized)
  if (Number.isNaN(expireDate.getTime())) {
    return ""
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfExpireDay = new Date(expireDate.getFullYear(), expireDate.getMonth(), expireDate.getDate()).getTime()
  const diffDays = Math.floor((startOfExpireDay - startOfToday) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `逾期 ${Math.abs(diffDays)} 天`
  }

  return `剩余 ${diffDays} 天`
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }

      reject(new Error("文件内容解析失败"))
    }
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"))
    reader.readAsDataURL(file)
  })
}
</script>

<template>
  <DetailLayout
    :title="toText(detail?.Name, '检测服务详情') || '检测服务详情'"
    :subtitle="toText(detail?.CorpName || detail?.CustomerName, '') || ''"
    :empty="!loading && !detail"
    empty-text="未找到该检测服务信息"
    @back="goBack"
  >
    <template #headerActions>
      <div class="flex items-center gap-1">
        <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1 px-3 text-[14px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
            @click="deleteConfirmOpen = true"
          >
            <i class="ri-delete-bin-line text-base" />
            <span class="sm:hidden">{{ toMobileActionLabel("删除检测服务") }}</span>
            <span class="hidden sm:inline">删除检测服务</span>
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除当前检测服务？</AlertDialogTitle>
              <AlertDialogDescription>
                删除后将无法恢复，该操作会移除当前检测服务及其关联配置。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel :disabled="deleteSubmitting" class="">
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                :disabled="deleteSubmitting"
                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                @click="confirmDelete"
              >
                {{ deleteSubmitting ? "删除中..." : "确认删除" }}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1 px-3 text-[14px] font-medium"
          @click="goToEdit"
        >
          <i class="ri-edit-line text-base" />
          <span class="sm:hidden">{{ toMobileActionLabel("修改检测服务信息") }}</span>
          <span class="hidden sm:inline">修改检测服务信息</span>
        </Button>
      </div>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>检测服务详情加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <template v-if="loading">
        <DetailFieldsSkeleton :sections="2" :rows-per-section="4" />
        <div class="mt-5">
          <DetailRelationSkeleton :two-data-columns="false" :rows-per-group="3" />
        </div>
      </template>

      <div v-else-if="detail" class="pb-5">
        <DetailFieldSections :sections="fieldSections" use-title-block />
      </div>
    </template>

    <template #secondary>
      <div v-if="loading" class="pb-5">
        <DetailRelationSkeleton :two-data-columns="false" :rows-per-group="3" />
      </div>

      <div v-else-if="detail" class="space-y-2 pb-5">
        <TitleBlock
          variant="section"
          title="检测项概览"
          class="detail-section-inset pt-2 pb-0"
        >
          <template #append>
            <Badge
              variant="secondary"
              class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
            >
              {{ inspectionOverviewCount }}
            </Badge>
          </template>
        </TitleBlock>

        <Accordion
          v-if="parkInspectionModuleGroups.length"
          v-model="expandedParkGroupKey"
          type="single"
          collapsible
          class="w-full"
        >
          <AccordionItem
            v-for="(parkGroup, parkIndex) in parkInspectionModuleGroups"
            :key="parkGroup.key"
            :value="parkGroup.key"
            class="border-b-0"
          >
            <div class="detail-section-inset flex items-center gap-3">
              <AccordionTrigger class="min-w-0 flex-1 justify-start py-3 text-left hover:no-underline [&>svg]:order-first [&>svg]:mr-2 [&>svg]:ml-0">
                <div class="min-w-0 pr-3">
                  <div class="flex min-w-0 items-center gap-2">
                    <div class="detail-field-section__heading truncate">{{ parkGroup.title }}</div>
                    <span class="shrink-0 text-[12px] text-muted-foreground">
                      {{ parkGroup.buildCount }} 栋建筑 · {{ parkGroup.inspectionCount }} 个检测项
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
            </div>

            <AccordionContent>
              <div class="pb-4">
                <div>
                  <div
                    v-for="module in parkGroup.modules"
                    :key="module.key"
                    class="overflow-x-clip border-t border-border/80 first:border-t-0"
                  >
                    <Collapsible
                      :open="isBuildingModuleExpanded(module.key)"
                      @update:open="setBuildingModuleExpanded(module.key, $event)"
                    >
                      <template #default="{ open }">
                        <CollapsibleTrigger as-child>
                          <button
                            type="button"
                            class="block w-full bg-transparent text-left transition-colors hover:bg-surface-hover-strong"
                            :style="getRelationModuleStyle(module)"
                          >
                            <div class="detail-section-inset">
                              <div class="detail-table-heading-row detail-table-grid detail-relation-grid items-center">
                                <div :class="['flex min-w-0 items-center gap-2', !open && 'col-span-3']">
                                  <i
                                    :class="open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"
                                    class="shrink-0 text-[16px] text-muted-foreground"
                                  />
                                  <h2 class="min-w-0 truncate text-[14px] font-medium text-foreground">{{ module.title }}</h2>
                                  <Badge
                                    variant="secondary"
                                    class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
                                  >
                                    {{ module.count ?? module.groups.reduce((sum, group) => sum + group.rows.length, 0) }}
                                  </Badge>
                                </div>
                                <div
                                  v-if="open"
                                  class="flex min-w-0 justify-center whitespace-nowrap text-[12px] text-muted-foreground"
                                >
                                  强制拍照
                                </div>
                                <div
                                  v-if="open"
                                  class="flex min-w-0 justify-center whitespace-nowrap text-[12px] text-muted-foreground"
                                >
                                  记录实测值
                                </div>
                              </div>
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent class="bg-transparent pb-3 [&>div]:pb-0 [&>div]:pt-0">
                          <DetailRelationModule
                            :schema="module"
                            hide-title-block
                          >
                            <template #group-actions="{ group }">
                              <InspectionCategoryScoreLimitInline
                                v-if="group.scoreLimit !== undefined && group.scoreLimit !== null"
                                :limit="group.scoreLimit"
                              />
                            </template>

                            <template #inspection-item-name-cell="{ row }">
                              <button
                                type="button"
                                class="block w-full min-w-0 truncate text-left text-foreground transition-colors hover:text-link disabled:cursor-default disabled:text-foreground"
                                :disabled="!row.inspectionUuid"
                                @click="void openInspectionItemDetailSheet({
                                  uuid: row.inspectionUuid,
                                  buildName: row.buildName,
                                  categoryName: row.categoryName,
                                  inspectionItemName: row.inspectionItemName,
                                })"
                              >
                                {{ row.inspectionItemName }}
                              </button>
                            </template>

                            <template #forcePhotoText="{ row }">
                              <span
                                class="inline-flex items-center justify-center"
                                :aria-label="row.forcePhotoText"
                              >
                                <i
                                  :class="getFlagIconClass(row.forcePhotoState)"
                                  class="text-[17px] leading-none text-muted-foreground"
                                />
                              </span>
                            </template>

                            <template #measureRecordText="{ row }">
                              <span
                                class="inline-flex items-center justify-center"
                                :aria-label="row.measureRecordText"
                              >
                                <i
                                  :class="getFlagIconClass(row.measureRecordState)"
                                  class="text-[17px] leading-none text-muted-foreground"
                                />
                              </span>
                            </template>
                          </DetailRelationModule>
                        </CollapsibleContent>
                      </template>
                    </Collapsible>
                  </div>
                </div>
              </div>
            </AccordionContent>

            <div
              v-if="parkIndex < parkInspectionModuleGroups.length - 1"
              class="detail-section-inset"
            >
              <div class="w-full border-b border-dashed border-border/80" />
            </div>
          </AccordionItem>
        </Accordion>
      </div>
    </template>
  </DetailLayout>

  <Dialog v-model:open="uploadContractDialogOpen">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>上传合同</DialogTitle>
        <DialogDescription>
          可仅填写合同到期时间；如需补充或替换合同文件，可选择上传。
        </DialogDescription>
      </DialogHeader>

      <div class="min-w-0 space-y-4">
        <div class="space-y-2">
          <p class="text-sm text-foreground">合同到期时间</p>
            <FormDatePicker
              id="inspection-service-contract-end-time"
              v-model="uploadContractForm.contractEndTime"
              :disabled="uploadingContract"
              placeholder="请选择合同到期时间"
            />
        </div>

        <div class="space-y-2">
          <p class="text-sm text-foreground">合同文件（选填）</p>
          <input
            ref="uploadContractFileInputRef"
            type="file"
            class="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            @change="handleContractFileChange"
          >
          <div class="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <Button
              type="button"
              variant="outline"
              class="shrink-0 gap-2"
              :disabled="uploadingContract"
              @click="triggerSelectContractFile"
            >
              <i class="ri-file-upload-line text-base" />
              选择文件
            </Button>
            <span
              class="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-muted-foreground"
              :title="uploadContractForm.contractFileName || '未选择文件'"
            >
              {{ uploadContractForm.contractFileName || "未选择文件" }}
            </span>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          class=""
          :disabled="uploadingContract"
          @click="uploadContractDialogOpen = false"
        >
          取消
        </Button>
        <Button
          type="button"
          class=""
          :disabled="uploadingContract"
          @click="submitUploadContract"
        >
          {{ uploadingContract ? "提交中..." : "确认上传" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <LinkedEntityDetailSheet
    :open="linkedDetailSheetOpen"
    :kind="linkedDetailSheetKind"
    :uuid="linkedDetailSheetUuid"
    :customer-uuid="customerUuid"
    @update:open="handleLinkedDetailSheetOpenChange"
  />

  <ResponsiveRightSheet
    :open="inspectionItemDetailSheetOpen"
    :show-primary="false"
    sheet-content-class="flex min-h-0 flex-col overflow-hidden sm:max-w-xl"
    @update:open="handleInspectionItemDetailSheetOpenChange"
  >
    <template #actions>
      <div class="right-sheet-actions">
        <div class="right-sheet-actions__primary">
          <TooltipWrap content="关闭检测项详情" side="right">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="right-sheet-icon-button"
              @click="handleInspectionItemDetailSheetOpenChange(false)"
            >
              <i class="ri-close-line text-base" />
              <span class="sr-only">关闭检测项详情</span>
            </Button>
          </TooltipWrap>
        </div>
        <div class="right-sheet-actions__secondary" />
      </div>
    </template>
    <template #title>{{ inspectionItemSheetTitle }}</template>
    <template v-if="inspectionItemSheetDescription" #description>
      {{ inspectionItemSheetDescription }}
    </template>

    <div class="min-h-0 flex-1 overflow-y-auto pb-6">
      <Alert v-if="activeInspectionItemError" variant="destructive" class="mb-4">
        <AlertTitle>检测项详情加载失败</AlertTitle>
        <AlertDescription>{{ activeInspectionItemError }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="activeInspectionItemLoading" :sections="2" :rows-per-section="3" />

      <DetailFieldSections
        v-else-if="activeInspectionItemDetail"
        :sections="activeInspectionItemSections"
        use-title-block
      />
    </div>
  </ResponsiveRightSheet>
</template>
