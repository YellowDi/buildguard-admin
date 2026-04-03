<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import LinkedEntityDetailSheet from "@/components/detail/LinkedEntityDetailSheet.vue"
import type { DetailFieldSection } from "@/components/detail/types"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { deleteInspectionPlan, fetchInspectionPlanDetail, type InspectionPlanListItem } from "@/lib/inspection-plans-api"

const route = useRoute()
const router = useRouter()

const detail = ref<InspectionPlanListItem | null>(null)
const loading = ref(false)
const errorMessage = ref("")
const deleteConfirmOpen = ref(false)
const deleteSubmitting = ref(false)
const linkedDetailSheetOpen = ref(false)
const linkedDetailSheetKind = ref<"customer" | "service" | "plan" | "park" | null>(null)
const linkedDetailSheetUuid = ref("")
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
        { key: "code", label: "计划编号", value: toText(current.Code, "-"), valueClass: "text-muted-foreground" },
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
        {
          key: "first-time",
          label: "首次执行时间",
          value: formatDateOnly(toText(current.FirstTime, "-")),
          suffixHint: getElapsedDaysHint(current.FirstTime),
        },
        {
          key: "next-time",
          label: "下次执行时间",
          value: formatDateOnly(toText(current.NextTime, "-")),
          suffixHint: getRemainingDaysHint(current.NextTime),
        },
        {
          key: "end-time",
          label: "计划结束时间",
          value: formatDateOnly(toText(current.EndTime, "-")),
          suffixHint: getRemainingDaysHint(current.EndTime),
        },
        {
          key: "lastest-time",
          label: "最近执行时间",
          value: formatDateOnly(toText(current.LastestTime, "-")),
          suffixHint: getElapsedDaysHint(current.LastestTime),
        },
        { key: "lastest-order-no", label: "最近执行订单号", value: toText(current.LastestOrderNo, "-"), valueClass: "text-muted-foreground" },
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

function goToEdit() {
  if (!inspectionPlanUuid.value) {
    return
  }

  void router.push({
    name: "inspection-plan-edit",
    params: { id: inspectionPlanUuid.value },
  })
}

async function confirmDelete() {
  if (!inspectionPlanUuid.value || deleteSubmitting.value) {
    return
  }

  deleteSubmitting.value = true

  try {
    await deleteInspectionPlan({ Uuid: inspectionPlanUuid.value })
    toast.success("检测计划已删除")
    deleteConfirmOpen.value = false
    await router.push({ name: "inspection-plans" })
  } catch (error) {
    handleApiError(error, {
      title: "检测计划删除失败",
      fallback: "检测计划删除失败，请稍后重试。",
    })
  } finally {
    deleteSubmitting.value = false
  }
}

function goToCustomerDetail() {
  if (!customerUuid.value) {
    toast.error("当前检测计划缺少客户 Uuid，无法跳转客户详情")
    return
  }

  linkedDetailSheetKind.value = "customer"
  linkedDetailSheetUuid.value = customerUuid.value
  linkedDetailSheetOpen.value = true
}

function goToServiceDetail() {
  if (!serviceUuid.value) {
    toast.error("当前检测计划缺少服务 Uuid，无法跳转检测服务详情")
    return
  }

  linkedDetailSheetKind.value = "service"
  linkedDetailSheetUuid.value = serviceUuid.value
  linkedDetailSheetOpen.value = true
}

function handleLinkedDetailSheetOpenChange(open: boolean) {
  linkedDetailSheetOpen.value = open

  if (!open) {
    linkedDetailSheetKind.value = null
    linkedDetailSheetUuid.value = ""
  }
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

function formatDateOnly(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
}

function parseDateText(value: unknown) {
  const text = toText(value, "")

  if (!text) {
    return null
  }

  const normalized = text.includes("T") ? text : text.replace(" ", "T")
  const parsed = new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function calculateDateDiffDays(target: Date) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()

  return Math.floor((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24))
}

function getElapsedDaysHint(value: unknown) {
  const parsed = parseDateText(value)

  if (!parsed) {
    return ""
  }

  const diffDays = calculateDateDiffDays(parsed)

  if (diffDays <= 0) {
    return `已过去 ${Math.abs(diffDays)} 天`
  }

  return `还有 ${diffDays} 天`
}

function getRemainingDaysHint(value: unknown) {
  const parsed = parseDateText(value)

  if (!parsed) {
    return ""
  }

  const diffDays = calculateDateDiffDays(parsed)

  if (diffDays < 0) {
    return `已过去 ${Math.abs(diffDays)} 天`
  }

  return `还有 ${diffDays} 天`
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
            删除检测计划
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除当前检测计划？</AlertDialogTitle>
              <AlertDialogDescription>
                删除后将无法恢复，该操作会移除当前检测计划及关联调度信息。
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
          编辑检测计划
        </Button>
      </div>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>检测计划详情加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="loading" :sections="2" :rows-per-section="5" />

      <DetailFieldSections v-else-if="detail" :sections="fieldSections" />
    </template>
  </DetailLayout>

  <LinkedEntityDetailSheet
    :open="linkedDetailSheetOpen"
    :kind="linkedDetailSheetKind"
    :uuid="linkedDetailSheetUuid"
    :customer-uuid="customerUuid"
    @update:open="handleLinkedDetailSheetOpenChange"
  />
</template>
