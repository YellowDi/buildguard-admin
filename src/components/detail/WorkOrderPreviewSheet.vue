<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import { buildRepairWorkOrderPrimarySections, buildRepairWorkOrderSecondarySections, toText as toRepairWorkOrderText } from "@/components/detail/repairWorkOrderDetailFields"
import type { DetailFieldSection } from "@/components/detail/types"
import { buildWorkOrderPrimarySections, buildWorkOrderSecondarySections, toText as toWorkOrderText } from "@/components/detail/workOrderDetailFields"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { TooltipWrap } from "@/components/ui/tooltip"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail, type CustomerDetailResult } from "@/lib/customers-api"
import { fetchRepairWorkOrderDictionaries, type RepairDictionaryOption } from "@/lib/repair-work-order-dictionaries"
import {
  fetchRepairWorkOrderDetail,
  fetchWorkOrderDetail,
  type RepairWorkOrderDetailResult,
  type WorkOrderDetailResult,
} from "@/lib/work-orders-api"

type WorkOrderPreviewKind = "inspection" | "repair"

const props = defineProps<{
  open: boolean
  kind: WorkOrderPreviewKind
  uuid: string
  customerUuid?: string
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
}>()

const router = useRouter()
const loading = ref(false)
const errorMessage = ref("")
const inspectionWorkOrder = ref<WorkOrderDetailResult | null>(null)
const repairWorkOrder = ref<RepairWorkOrderDetailResult | null>(null)
const customer = ref<CustomerDetailResult | null>(null)
const repairImportanceOptions = ref<RepairDictionaryOption[]>([])
const repairTypeOptions = ref<RepairDictionaryOption[]>([])
let latestRequestId = 0

const title = computed(() => (
  props.kind === "repair"
    ? toRepairWorkOrderText(repairWorkOrder.value?.Title, "报修工单详情")
    : toWorkOrderText(inspectionWorkOrder.value?.PackageName, "检测工单详情")
))

const primarySections = computed<DetailFieldSection[]>(() => {
  return props.kind === "repair"
    ? buildRepairWorkOrderPrimarySections(repairWorkOrder.value, customer.value, {
        dictionaries: {
          importanceOptions: repairImportanceOptions.value,
          typeOptions: repairTypeOptions.value,
        },
      })
    : buildWorkOrderPrimarySections(inspectionWorkOrder.value, customer.value)
})

const secondarySections = computed<DetailFieldSection[]>(() => {
  return props.kind === "repair"
    ? buildRepairWorkOrderSecondarySections(repairWorkOrder.value)
    : buildWorkOrderSecondarySections(inspectionWorkOrder.value)
})

const detailSections = computed<DetailFieldSection[]>(() => [
  ...primarySections.value,
  ...secondarySections.value,
])

const hasDetail = computed(() => (
  props.kind === "repair"
    ? Boolean(repairWorkOrder.value?.Uuid)
    : Boolean(inspectionWorkOrder.value?.Uuid)
))

watch(
  () => [props.open, props.kind, props.uuid, props.customerUuid] as const,
  ([open, kind, uuid, customerUuid]) => {
    if (!open) {
      resetState()
      return
    }

    void loadWorkOrderDetail(kind, uuid, customerUuid ?? "")
  },
  { immediate: true },
)

function handleOpenChange(open: boolean) {
  emit("update:open", open)

  if (!open) {
    resetState()
  }
}

function openFullPage() {
  const targetUuid = props.kind === "repair"
    ? toRepairWorkOrderText(repairWorkOrder.value?.Uuid, props.uuid).trim()
    : toWorkOrderText(inspectionWorkOrder.value?.Uuid, props.uuid).trim()
  const targetCustomerUuid = props.kind === "repair"
    ? toRepairWorkOrderText(repairWorkOrder.value?.CustomerUuid, props.customerUuid ?? "").trim()
    : toWorkOrderText(inspectionWorkOrder.value?.CustomerUuid, props.customerUuid ?? "").trim()

  if (!targetUuid) {
    return
  }

  emit("update:open", false)

  void router.push({
    name: props.kind === "repair" ? "repair-work-order-detail" : "inspection-work-order-detail",
    params: { id: targetUuid },
    query: {
      customerUuid: targetCustomerUuid,
      returnTo: props.kind === "repair" ? "repair-work-orders" : "inspection-work-orders",
    },
  })
}

async function loadWorkOrderDetail(kind: WorkOrderPreviewKind, uuid: string, fallbackCustomerUuid: string) {
  const requestId = ++latestRequestId

  if (!uuid) {
    inspectionWorkOrder.value = null
    repairWorkOrder.value = null
    customer.value = null
    errorMessage.value = "工单 Uuid 缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""
  inspectionWorkOrder.value = null
  repairWorkOrder.value = null
  customer.value = null

  try {
    if (kind === "repair") {
      await ensureRepairDictionaries()
    }

    const detail = kind === "repair"
      ? await fetchRepairWorkOrderDetail({ Uuid: uuid })
      : await fetchWorkOrderDetail({ Uuid: uuid })

    if (requestId !== latestRequestId) {
      return
    }

    if (kind === "repair") {
      repairWorkOrder.value = detail as RepairWorkOrderDetailResult
    } else {
      inspectionWorkOrder.value = detail as WorkOrderDetailResult
    }

    const nextCustomerUuid = kind === "repair"
      ? toRepairWorkOrderText((detail as RepairWorkOrderDetailResult).CustomerUuid, fallbackCustomerUuid).trim()
      : toWorkOrderText((detail as WorkOrderDetailResult).CustomerUuid, fallbackCustomerUuid).trim()

    if (!nextCustomerUuid) {
      return
    }

    try {
      const detailCustomer = await fetchCustomerDetail({ Uuid: nextCustomerUuid })

      if (requestId !== latestRequestId) {
        return
      }

      customer.value = detailCustomer
    } catch {
      if (requestId !== latestRequestId) {
        return
      }

      customer.value = null
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    inspectionWorkOrder.value = null
    repairWorkOrder.value = null
    customer.value = null
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "工单详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function resetState() {
  latestRequestId += 1
  loading.value = false
  errorMessage.value = ""
  inspectionWorkOrder.value = null
  repairWorkOrder.value = null
  customer.value = null
}

async function ensureRepairDictionaries() {
  if (repairImportanceOptions.value.length || repairTypeOptions.value.length) {
    return
  }

  try {
    const dictionaries = await fetchRepairWorkOrderDictionaries()
    repairImportanceOptions.value = dictionaries.importanceOptions
    repairTypeOptions.value = dictionaries.typeOptions
  } catch {
    repairImportanceOptions.value = []
    repairTypeOptions.value = []
  }
}
</script>

<template>
  <ResponsiveRightSheet
    :open="open"
    sheet-content-class="flex min-h-0 flex-col overflow-hidden sm:max-w-xl"
    :show-primary="hasDetail"
    @update:open="handleOpenChange"
    @footer-primary="openFullPage"
  >
    <template #actions>
      <div class="right-sheet-actions">
        <div class="right-sheet-actions__primary">
          <TooltipWrap content="关闭工单详情" side="right">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="right-sheet-icon-button"
              @click="handleOpenChange(false)"
            >
              <i class="ri-close-line text-base" />
              <span class="sr-only">关闭工单详情</span>
            </Button>
          </TooltipWrap>
          <TooltipWrap v-if="hasDetail" content="打开完整工单详情页">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="right-sheet-icon-button"
              @click="openFullPage"
            >
              <i class="ri-fullscreen-line text-base" />
              <span class="sr-only">打开完整工单详情页</span>
            </Button>
          </TooltipWrap>
        </div>
        <div class="right-sheet-actions__secondary" />
      </div>
    </template>
    <template #title>{{ title }}</template>

    <div class="min-h-0 flex-1 overflow-y-auto pb-6">
      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertTitle>工单详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div v-if="loading" class="space-y-5">
        <DetailFieldsSkeleton :sections="2" :rows-per-section="4" />
        <DetailFieldsSkeleton :sections="1" :rows-per-section="3" />
      </div>

      <template v-else-if="hasDetail">
        <DetailFieldSections :sections="detailSections" use-title-block />
      </template>
    </div>
  </ResponsiveRightSheet>
</template>
