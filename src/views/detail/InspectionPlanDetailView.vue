<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import type { DetailFieldSection } from "@/components/detail/types"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchInspectionPlanDetail, type InspectionPlanListItem } from "@/lib/inspection-plans-api"

const route = useRoute()
const router = useRouter()

const detail = ref<InspectionPlanListItem | null>(null)
const loading = ref(false)
const errorMessage = ref("")
let latestRequestId = 0

const inspectionPlanUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const customerUuid = computed(() => toText(detail.value?.CustomerUuid, ""))
const serviceUuid = computed(() => toText(detail.value?.ServiceUuid, ""))

const fieldSections = computed<DetailFieldSection[]>(() => {
  const current = detail.value
  if (!current) {
    return []
  }

  return [
    {
      key: "inspection-plan-basic",
      title: "计划信息",
      rows: [
        { key: "name", label: "计划名称", value: toText(current.Name, "未命名计划") },
        { key: "code", label: "计划编号", value: toText(current.Code, "-") },
        { key: "contract-code", label: "合同编号", value: toText(current.ContractCode, "-") },
        {
          key: "customer-name",
          label: "所属客户",
          value: toText(current.CorpName, "-"),
          linkAction: customerUuid.value ? { onClick: goToCustomerDetail } : undefined,
        },
        {
          key: "service-name",
          label: "关联服务",
          value: toText(current.ServiceName, "-"),
          linkAction: serviceUuid.value ? { onClick: goToServiceDetail } : undefined,
        },
        { key: "duration", label: "执行频率", value: formatDayValue(current.Duration) },
        { key: "work-order-duration", label: "工单时长", value: formatDayValue(current.WorkOrderDuration) },
        { key: "first-time", label: "首次执行时间", value: toText(current.FirstTime, "-") },
        { key: "next-time", label: "下次执行时间", value: toText(current.NextTime, "-") },
        { key: "lastest-time", label: "最近执行时间", value: toText(current.LastestTime, "-") },
        { key: "lastest-order-no", label: "最近执行订单号", value: toText(current.LastestOrderNo, "-") },
        { key: "creator", label: "创建人", value: toText(current.Creator, "-") },
        { key: "created-at", label: "创建时间", value: toText(current.CreatedAt, "-") },
      ],
    },
  ]
})

watch(detail, (current) => {
  detailBreadcrumbTitle.value = toOptionalText(current?.Name)
})

watch(inspectionPlanUuid, (nextUuid) => {
  void loadInspectionPlanDetail(nextUuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

function goBack() {
  void router.push({ name: "inspection-plans" })
}

function goToCustomerDetail() {
  if (!customerUuid.value) {
    toast.error("当前检测计划缺少客户 Uuid，无法跳转客户详情")
    return
  }

  void router.push({
    name: "customer-detail",
    params: { id: customerUuid.value },
  })
}

function goToServiceDetail() {
  if (!serviceUuid.value) {
    toast.error("当前检测计划缺少服务 Uuid，无法跳转检测服务详情")
    return
  }

  void router.push({
    name: "inspection-service-detail",
    params: { id: serviceUuid.value },
    query: customerUuid.value ? { customerUuid: customerUuid.value } : undefined,
  })
}

async function loadInspectionPlanDetail(uuid: string) {
  const requestId = ++latestRequestId

  if (!uuid) {
    detail.value = null
    errorMessage.value = "检测计划详情参数缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchInspectionPlanDetail({ Uuid: uuid })

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
      fallback: "检测计划详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
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

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function formatDayValue(value: unknown) {
  const normalized = toFiniteNumber(value)
  return normalized === null ? "-" : `${normalized}天`
}

</script>

<template>
  <DetailLayout
    :title="toText(detail?.Name, '检测计划详情') || '检测计划详情'"
    :subtitle="toText(detail?.CorpName, '') || ''"
    :empty="!loading && !detail"
    empty-text="未找到该检测计划信息"
    :secondary-visible="false"
    @back="goBack"
  >
    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>检测计划详情加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="loading" :sections="2" :rows-per-section="5" />

      <DetailFieldSections v-else-if="detail" :sections="fieldSections" />
    </template>
  </DetailLayout>
</template>
