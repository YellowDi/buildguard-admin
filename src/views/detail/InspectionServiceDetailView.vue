<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import BuildingDetailSheet from "@/components/detail/BuildingDetailSheet.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import FormDatePicker from "@/components/form/FormDatePicker.vue"
import InspectionCategoryScoreLimitInline from "@/components/inspection/InspectionCategoryScoreLimitInline.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import DetailRelationSkeleton from "@/components/loading/DetailRelationSkeleton.vue"
import type { DetailContactValue, DetailFieldSection, DetailStatusValue } from "@/components/detail/types"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
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
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { buildApiRequestUrl } from "@/lib/api"
import { handleApiError } from "@/lib/api-errors"
import {
  deleteInspectionService,
  fetchInspectionServiceDetail,
  type InspectionServiceListItem,
  updateInspectionServiceContract,
} from "@/lib/inspection-services-api"

type InspectionCategoryScoreLimit = number | null

type InspectionServiceBuildingRow = {
  id: string
  buildUuid: string
  parkUuid: string
  name: string
}

type InspectionServiceInspectionRow = {
  id: string
  categoryUuid: string
  categoryName: string
  name: string
  content: string
  standard: string
  forcePhoto: string
  isMeasureRecord: string
}

type InspectionServiceInspectionGroup = {
  key: string
  title: string
  categoryUuid: string
  scoreLimit: InspectionCategoryScoreLimit
  rows: InspectionServiceInspectionRow[]
}

type InspectionServiceBuildingInspectionView = {
  key: string
  buildUuid: string
  buildName: string
  parkName: string
  inspectionGroups: InspectionServiceInspectionGroup[]
}

const route = useRoute()
const router = useRouter()

const detail = ref<InspectionServiceListItem | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const deleteConfirmOpen = ref(false)
const deleteSubmitting = ref(false)
const expandedBuildingKey = ref("")
const expandedInspectionItemKey = ref("")
const uploadContractDialogOpen = ref(false)
const uploadingContract = ref(false)
const uploadContractFileInputRef = ref<HTMLInputElement | null>(null)
const buildingDetailSheetOpen = ref(false)
const activeBuildingUuid = ref("")
const activeParkUuid = ref("")
const uploadContractForm = ref({
  contractEndTime: "",
  contractFile: "",
  contractFileName: "",
})
let latestRequestId = 0

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

const buildingInspectionViews = computed<InspectionServiceBuildingInspectionView[]>(() =>
  buildBuildingInspectionViews(detail.value?.BuildInfos ?? detail.value?.Builds),
)
const buildingGroups = computed(() => buildParkGroups(detail.value?.BuildInfos ?? detail.value?.Builds))
const buildingCount = computed(() => buildingGroups.value.reduce((sum, group) => sum + group.rows.length, 0))

watch(detail, (current) => {
  detailBreadcrumbTitle.value = toOptionalText(current?.Name)
})

watch(buildingInspectionViews, (views) => {
  if (!views.length) {
    expandedBuildingKey.value = ""
    return
  }

  if (!views.some(view => view.key === expandedBuildingKey.value)) {
    expandedBuildingKey.value = views[0]?.key ?? ""
  }
}, { immediate: true })

watch(inspectionServiceUuid, (nextUuid) => {
  void loadInspectionServiceDetail(nextUuid)
}, { immediate: true })

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

  void router.push({
    name: "customer-detail",
    params: { id: customerUuid.value },
  })
}

function goToBuildingDetail(row: InspectionServiceBuildingRow) {
  if (!row.buildUuid || !row.parkUuid) {
    return
  }
  activeBuildingUuid.value = row.buildUuid
  activeParkUuid.value = row.parkUuid
  buildingDetailSheetOpen.value = true
}

function handleBuildingDetailSheetOpenChange(open: boolean) {
  buildingDetailSheetOpen.value = open
  if (!open) {
    activeBuildingUuid.value = ""
    activeParkUuid.value = ""
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

  if (!uploadContractForm.value.contractFile) {
    toast.error("请先上传合同文件")
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

  try {
    const detailResult = await fetchInspectionServiceDetail({
      Uuid: uuid,
    })

    if (requestId !== latestRequestId) {
      return
    }

    detail.value = detailResult
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

function buildParkGroups(builds: InspectionServiceListItem["Builds"]) {
  if (!Array.isArray(builds) || !builds.length) {
    return []
  }

  const parkMap = new Map<string, InspectionServiceBuildingRow[]>()

  builds.forEach((build, index) => {
    const parkName = toText(build.ParkName, "未命名园区")
    const rows = parkMap.get(parkName) ?? []

    rows.push({
      id: toText(build.BuildUuid, `${parkName}-${index + 1}`),
      buildUuid: toText(build.BuildUuid, ""),
      parkUuid: toText(build.ParkUuid, ""),
      name: toText(build.BuildName, "未命名建筑"),
    })

    parkMap.set(parkName, rows)
  })

  return Array.from(parkMap.entries()).map(([parkName, rows]) => ({
    key: parkName,
    title: parkName,
    rows,
  }))
}

function buildInspectionGroups(
  build: NonNullable<InspectionServiceListItem["Builds"]>[number],
  buildIndex: number,
) {
  const categories = Array.isArray(build.List) ? build.List : []

  if (!categories.length) {
    return []
  }

  return categories.map((category, categoryIndex) => {
    const categoryName = toText(category.Name, "未分类")
    const categoryUuid = toText(category.Uuid, "") || `inspection-category-name:${categoryName}`
    const items = Array.isArray(category.List) ? category.List : []

    return {
      key: categoryUuid || `inspection-category-${buildIndex + 1}-${categoryIndex + 1}`,
      title: categoryName,
      categoryUuid,
      scoreLimit: normalizeInspectionCategoryScore(category.Score),
      rows: items.map((item, itemIndex) => ({
        id: toText(item.Uuid, `${categoryUuid || categoryName}-${itemIndex + 1}`),
        categoryUuid,
        categoryName,
        name: toText(item.Name, `检测项 ${itemIndex + 1}`),
        content: "-",
        standard: "-",
        forcePhoto: "-",
        isMeasureRecord: "-",
      })),
    }
  })
}

function buildBuildingInspectionViews(
  builds: InspectionServiceListItem["Builds"],
) {
  if (!Array.isArray(builds) || !builds.length) {
    return []
  }

  return builds.map((build, index) => {
    const buildUuid = toText(build.BuildUuid, `inspection-service-build-${index + 1}`)
    const buildName = toText(build.BuildName, `建筑 ${index + 1}`)
    const parkName = toText(build.ParkName, "未命名园区")
    const inspectionGroups = buildInspectionGroups(build, index)

    return {
      key: buildUuid || `inspection-service-build-${index + 1}`,
      buildUuid,
      buildName,
      parkName,
      inspectionGroups,
    }
  })
}

function normalizeInspectionCategoryScore(value: unknown) {

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

function getBuildingInspectionCount(building: InspectionServiceBuildingInspectionView) {
  return building.inspectionGroups.reduce((sum, group) => sum + group.rows.length, 0)
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
      <div class="flex items-center gap-2">
        <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1 border-destructive/50 bg-background px-3 text-[14px] font-medium text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive"
            @click="deleteConfirmOpen = true"
          >
            <i class="ri-delete-bin-line text-base" />
            删除检测服务
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除当前检测服务？</AlertDialogTitle>
              <AlertDialogDescription>
                删除后将无法恢复，该操作会移除当前检测服务及其关联配置。
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
                @click="confirmDelete"
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
          variant="outline"
          size="sm"
          class="h-8 gap-1 border-border/80 bg-background px-3 text-[14px] font-medium shadow-none"
          @click="goToEdit"
        >
          <i class="ri-edit-line text-base" />
          修改检测服务信息
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

      <div v-else-if="detail" class="space-y-5 pb-5">
        <DetailFieldSections :sections="fieldSections" />

        <div class="h-px bg-border/80" />

        <section class="detail-field-section detail-field-section--after-separator">
          <div class="detail-section-heading-row detail-section-inset flex items-center gap-2">
            <h2 class="detail-field-section__heading">服务建筑</h2>
            <Badge
              variant="secondary"
              class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
            >
              {{ buildingCount }}
            </Badge>
          </div>

          <div v-if="buildingGroups.length === 0" class="detail-section-inset py-6 text-sm text-muted-foreground">
            当前检测服务还没有配置关联建筑。
          </div>

          <div v-else class="detail-group-stack">
            <div v-for="group in buildingGroups" :key="group.key">
              <div class="detail-group-divider-row detail-section-inset flex min-w-0 items-center gap-3">
                <div class="min-w-0 truncate text-[14px] font-medium text-muted-foreground">{{ group.title }}</div>
                <div class="h-px flex-1 bg-border/80" />
              </div>

              <div
                v-for="row in group.rows"
                :key="`${group.key}-${row.id}`"
                class="detail-section-inset flex min-w-0 items-center justify-between gap-3 py-2 text-[14px] transition-colors hover:bg-surface-hover-strong"
              >
                <div class="min-w-0 truncate text-foreground">
                  {{ row.name }}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                  :disabled="!row.buildUuid || !row.parkUuid"
                  @click="goToBuildingDetail(row)"
                >
                  <i class="ri-more-2-line text-[18px]" />
                  <span class="sr-only">建筑详情</span>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #secondary>
      <div v-if="loading" class="pb-5">
        <DetailRelationSkeleton :two-data-columns="false" :rows-per-group="3" />
      </div>

      <div v-else-if="detail" class="space-y-5 pb-5">
        <section class="detail-relation-module w-full min-w-0 max-w-full">
          <div class="detail-table-scroll">
            <div class="detail-table-frame detail-relation-frame">
              <div class="detail-table-heading-row detail-table-grid detail-relation-grid detail-section-inset items-center">
                <div class="flex min-w-0 items-center gap-2">
                  <h2 class="detail-field-section__heading shrink-0 whitespace-nowrap">建筑与检测项</h2>
                  <Badge
                    variant="secondary"
                    class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
                  >
                    {{ buildingInspectionViews.length }}
                  </Badge>
                </div>
              </div>

              <div
                v-if="buildingInspectionViews.length === 0"
                class="flex min-h-[min(160px,30vh)] w-full min-w-0 flex-col items-center justify-center px-4 py-12"
              >
                <Empty class="w-full max-w-md flex-none border-0 bg-transparent shadow-none !p-6 md:!p-8">
                  <EmptyHeader class="max-w-md">
                    <EmptyMedia variant="icon">
                      <i class="ri-building-line text-[18px]" />
                    </EmptyMedia>
                    <EmptyTitle>暂无服务建筑</EmptyTitle>
                    <EmptyDescription>当前检测服务还没有配置建筑。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>

              <div v-else class="detail-group-stack">
                <Accordion
                  v-model="expandedBuildingKey"
                  type="single"
                  collapsible
                  class="pb-2"
                >
                  <AccordionItem
                    v-for="building in buildingInspectionViews"
                    :key="building.key"
                    :value="building.key"
                    class="mb-3 min-w-0 overflow-x-clip rounded-md border border-border/55 bg-muted shadow-xs last:mb-0 dark:shadow-[var(--shadow-card)]"
                  >
                    <AccordionTrigger class="bg-transparent px-3.5 py-3 text-left hover:no-underline">
                      <div class="flex min-w-0 flex-1 items-center gap-3 pr-3">
                        <div class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                          {{ building.buildName }}
                        </div>
                        <div class="shrink-0 truncate text-xs text-muted-foreground">
                          {{ building.inspectionGroups.length }} 个检测分类 · {{ getBuildingInspectionCount(building) }} 个检测项
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent
                      class="bg-transparent data-[state=closed]:p-0 data-[state=open]:!overflow-visible data-[state=open]:px-2 data-[state=open]:pb-2 data-[state=open]:pt-0 [&>div]:pb-0 [&>div]:pt-0"
                    >
                      <div v-if="building.inspectionGroups.length === 0" class="py-2 text-sm text-muted-foreground">
                        当前建筑暂无绑定检测项。
                      </div>

                      <div v-else class="overflow-hidden rounded-md bg-background shadow-[var(--shadow-card)]">
                        <div
                          v-for="(group, groupIndex) in building.inspectionGroups"
                          :key="`${building.key}-${group.key}`"
                          :class="[
                            'space-y-3 px-2',
                            groupIndex === 0 ? 'pt-3' : 'pt-2',
                            groupIndex === building.inspectionGroups.length - 1 ? 'pb-3' : 'pb-2',
                          ]"
                        >
                          <div class="flex min-w-0 items-center gap-3">
                            <div class="flex min-w-0 items-center gap-2">
                              <div class="truncate text-sm font-semibold text-muted-foreground">{{ group.title }}</div>
                              <Badge
                                variant="secondary"
                                class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
                              >
                                {{ group.rows.length }}
                              </Badge>
                            </div>

                            <div class="h-px flex-1 bg-border/80" />

                            <div class="flex shrink-0 items-center">
                              <InspectionCategoryScoreLimitInline :limit="group.scoreLimit" />
                            </div>
                          </div>

                          <Accordion
                            v-model="expandedInspectionItemKey"
                            type="single"
                            collapsible
                            class="min-w-0 overflow-visible"
                          >
                            <AccordionItem
                              v-for="item in group.rows"
                              :key="`${building.key}-${group.key}-${item.id}`"
                              :value="`${building.key}-${group.key}-${item.id}`"
                              class="min-w-0 overflow-x-clip border-0 bg-transparent"
                            >
                              <AccordionTrigger
                                class="rounded-none border-0 bg-transparent px-0 py-3 text-left transition-colors hover:bg-muted/50 hover:no-underline"
                              >
                                <div class="min-w-0">
                                  <div class="truncate text-sm font-semibold text-foreground">
                                    {{ item.name }}
                                  </div>
                                </div>
                              </AccordionTrigger>

                              <AccordionContent
                                class="rounded-none px-0 data-[state=closed]:pb-0 data-[state=closed]:pt-0 data-[state=open]:!overflow-visible data-[state=open]:bg-background data-[state=open]:pb-3 data-[state=open]:pt-3 [&>div]:pb-0 [&>div]:pt-0"
                              >
                                <div class="grid gap-3 text-sm">
                                  <div class="grid gap-1">
                                    <p class="text-xs text-muted-foreground">检测内容</p>
                                    <p class="whitespace-pre-wrap break-words leading-6 text-foreground">{{ item.content }}</p>
                                  </div>
                                  <div class="grid gap-1">
                                    <p class="text-xs text-muted-foreground">检测标准</p>
                                    <p class="whitespace-pre-wrap break-words leading-6 text-foreground">{{ item.standard }}</p>
                                  </div>
                                  <div class="grid grid-cols-2 gap-3 border-t border-border/50 pt-2">
                                    <div>
                                      <p class="text-xs text-muted-foreground">强制拍照</p>
                                      <p class="mt-1 text-foreground">{{ item.forcePhoto }}</p>
                                    </div>
                                    <div>
                                      <p class="text-xs text-muted-foreground">是否测量数据记录</p>
                                      <p class="mt-1 text-foreground">{{ item.isMeasureRecord }}</p>
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </DetailLayout>

  <Dialog v-model:open="uploadContractDialogOpen">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>上传合同</DialogTitle>
        <DialogDescription>
          请填写合同到期时间并上传合同文件。
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
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
          <p class="text-sm text-foreground">合同文件</p>
          <input
            ref="uploadContractFileInputRef"
            type="file"
            class="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            @change="handleContractFileChange"
          >
          <div class="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              class="gap-2"
              :disabled="uploadingContract"
              @click="triggerSelectContractFile"
            >
              <i class="ri-file-upload-line text-base" />
              选择文件
            </Button>
            <span class="min-w-0 truncate text-sm text-muted-foreground">
              {{ uploadContractForm.contractFileName || "未选择文件" }}
            </span>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          class="gap-2"
          :disabled="uploadingContract"
          @click="uploadContractDialogOpen = false"
        >
          <i class="ri-close-line text-sm" />
          取消
        </Button>
        <Button
          type="button"
          class="gap-2"
          :disabled="uploadingContract"
          @click="submitUploadContract"
        >
          <i
            :class="uploadingContract ? 'ri-loader-4-line animate-spin text-sm' : 'ri-upload-2-line text-sm'"
          />
          {{ uploadingContract ? "提交中..." : "确认上传" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <BuildingDetailSheet
    :open="buildingDetailSheetOpen"
    :building-uuid="activeBuildingUuid"
    :park-uuid="activeParkUuid"
    :customer-uuid="customerUuid"
    @update:open="handleBuildingDetailSheetOpenChange"
  />
</template>
