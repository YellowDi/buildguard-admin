<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailRelationModule from "@/components/detail/DetailRelationModule.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import DetailRelationSkeleton from "@/components/loading/DetailRelationSkeleton.vue"
import type { DetailContactValue, DetailFieldSection, DetailRelationModuleSchema, DetailStatusValue } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { buildApiRequestUrl } from "@/lib/api"
import { handleApiError } from "@/lib/api-errors"
import { fetchInspectionServiceDetail, type InspectionServiceListItem } from "@/lib/inspection-services-api"

type InspectionServiceBuildingRow = {
  id: string
  buildUuid: string
  parkUuid: string
  name: string
}

type InspectionServiceInspectionRow = {
  id: string
  name: string
  content: string
  standard: string
  forcePhoto: string
  measureRecord: string
}

const route = useRoute()
const router = useRouter()

const detail = ref<InspectionServiceListItem | null>(null)
const loading = ref(false)
const errorMessage = ref("")
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
        { key: "contract-end-time", label: "合同到期时间", value: toText(current.ContractEndTime, "-") },
        {
          key: "contract-file",
          label: "合同文件",
          value: getContractFileLabel(current.ContractFile),
          linkAction: resolveFileUrl(current.ContractFile)
            ? { onClick: () => openContractFile(current.ContractFile) }
            : undefined,
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

const inspectionModule = computed<DetailRelationModuleSchema<InspectionServiceInspectionRow>>(() => ({
  key: "inspection-service-inspections",
  title: "检测项",
  count: Array.isArray(detail.value?.Inspections) ? detail.value.Inspections.length : 0,
  rowKey: "id",
  columns: [
    { key: "name", label: "检测项名称", cellClass: "truncate" },
    { key: "content", label: "检测内容", cellClass: "whitespace-pre-wrap break-words leading-6" },
    { key: "standard", label: "检测标准", cellClass: "whitespace-pre-wrap break-words leading-6" },
    { key: "forcePhoto", label: "强制拍照", cellClass: "whitespace-nowrap" },
    { key: "measureRecord", label: "测量记录", cellClass: "whitespace-nowrap" },
  ],
  groups: buildInspectionGroups(detail.value?.Inspections),
  emptyState: {
    title: "暂无检测项",
    description: "当前检测服务还没有配置检测项。",
    icon: "ri-task-line",
  },
  mobileMinWidth: "64rem",
  columnTemplateMobile: "minmax(10rem,1.1fr) minmax(12rem,1.2fr) minmax(12rem,1.2fr) 5.5rem 5.5rem",
  columnTemplateDesktop: "minmax(10rem,1.1fr) minmax(12rem,1.2fr) minmax(12rem,1.2fr) 5.5rem 5.5rem",
}))

const buildingModule = computed<DetailRelationModuleSchema<InspectionServiceBuildingRow>>(() => ({
  key: "inspection-service-buildings",
  title: "关联建筑",
  count: Array.isArray(detail.value?.Builds) ? detail.value.Builds.length : 0,
  rowKey: "id",
  columns: [
    { key: "name", label: "建筑名称", cellClass: "truncate" },
    { key: "actions", label: "", slot: "building-action-cell", cellClass: "flex justify-end" },
  ],
  groups: buildParkGroups(detail.value?.Builds),
  emptyState: {
    title: "暂无关联建筑",
    description: "当前检测服务还没有配置关联建筑。",
    icon: "ri-building-line",
  },
  mobileMinWidth: "28rem",
  columnTemplateMobile: "minmax(12rem,1fr) 5rem",
  columnTemplateDesktop: "minmax(12rem,1fr) 5rem",
}))

watch(detail, (current) => {
  detailBreadcrumbTitle.value = toOptionalText(current?.Name)
})

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

  void router.push({
    name: "building-detail",
    params: { id: row.buildUuid },
    query: {
      parkUuid: row.parkUuid,
      ...(customerUuid.value ? { customerUuid: customerUuid.value } : {}),
    },
  })
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
    const result = await fetchInspectionServiceDetail({
      Uuid: uuid,
    })

    if (requestId !== latestRequestId) {
      return
    }

    detail.value = result
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

function buildInspectionGroups(inspections: InspectionServiceListItem["Inspections"]) {
  if (!Array.isArray(inspections) || !inspections.length) {
    return []
  }

  const categoryMap = new Map<string, InspectionServiceInspectionRow[]>()

  inspections.forEach((inspection, index) => {
    const categoryName = toText(inspection.CategoryName, "未分类")
    const rows = categoryMap.get(categoryName) ?? []

    rows.push({
      id: toText(inspection.InspectionUuid || inspection.Uuid, `${categoryName}-${index + 1}`),
      name: toText(inspection.InspectionName || inspection.Name, `检测项 ${index + 1}`),
      content: toText(inspection.Content, "-"),
      standard: toText(inspection.Standard, "-"),
      forcePhoto: formatInspectionFlag(inspection.IsForcePhoto),
      measureRecord: formatInspectionFlag(inspection.IsMeasureRecord),
    })

    categoryMap.set(categoryName, rows)
  })

  return Array.from(categoryMap.entries()).map(([categoryName, rows]) => ({
    key: categoryName,
    title: categoryName,
    rows,
  }))
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
      <Button variant="outline" size="sm" @click="goToEdit">
        编辑
      </Button>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>检测服务详情加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="loading" :sections="2" :rows-per-section="4" />

      <DetailFieldSections v-else-if="detail" :sections="fieldSections" />
    </template>

    <template #secondary>
      <div v-if="loading" class="pb-5">
        <DetailRelationSkeleton :two-data-columns="false" :rows-per-group="3" />
      </div>

      <div v-else-if="detail" class="space-y-5 pb-5">
        <DetailRelationModule :schema="buildingModule">
          <template #building-action-cell="{ row }">
            <Button
              variant="ghost"
              size="sm"
              class="h-7 px-2 text-xs"
              :disabled="!row.buildUuid || !row.parkUuid"
              @click="goToBuildingDetail(row)"
            >
              详情
            </Button>
          </template>
        </DetailRelationModule>

        <DetailRelationModule :schema="inspectionModule" />
      </div>
    </template>
  </DetailLayout>
</template>
