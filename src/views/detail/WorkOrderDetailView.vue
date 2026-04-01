<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import { buildRepairWorkOrderPrimarySections, buildRepairWorkOrderSecondarySections, toText as toRepairWorkOrderText } from "@/components/detail/repairWorkOrderDetailFields"
import { buildWorkOrderPrimarySections, buildWorkOrderSecondarySections, toText } from "@/components/detail/workOrderDetailFields"
import type { DetailFieldSection } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail, type CustomerDetailResult } from "@/lib/customers-api"
import { fetchMembers } from "@/lib/members-api"
import {
  dispatchWorkOrder,
  fetchRepairWorkOrderDetail,
  fetchWorkOrderDetail,
  type RepairWorkOrderDetailResult,
  type WorkOrderDetailResult,
} from "@/lib/work-orders-api"

type WorkOrderDetailKind = "inspection" | "repair"

const props = withDefaults(defineProps<{
  kind?: WorkOrderDetailKind
}>(), {
  kind: "inspection",
})

const route = useRoute()
const router = useRouter()

const inspectionWorkOrder = ref<WorkOrderDetailResult | null>(null)
const repairWorkOrder = ref<RepairWorkOrderDetailResult | null>(null)
const customer = ref<CustomerDetailResult | null>(null)
const loading = ref(false)
const errorMessage = ref("")
let latestRequestId = 0

type AssignableUserOption = {
  uuid: string
  name: string
}

const assignDialogOpen = ref(false)
const assignUserUuid = ref("")
const assignableUsers = ref<AssignableUserOption[]>([])
const assignableUsersLoading = ref(false)
const assignableUsersLoaded = ref(false)
const assignSubmitting = ref(false)

const workOrderUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const customerUuid = computed(() => {
  const queryValue = typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : ""
  return queryValue || (
    props.kind === "repair"
      ? toRepairWorkOrderText(repairWorkOrder.value?.CustomerUuid)
      : toText(inspectionWorkOrder.value?.CustomerUuid)
  )
})
const queryReturnTo = computed(() => typeof route.query.returnTo === "string" ? route.query.returnTo.trim() : "")

const primarySections = computed<DetailFieldSection[]>(() => {
  if (props.kind === "repair") {
    return buildRepairWorkOrderPrimarySections(repairWorkOrder.value, customer.value, {
      onOpenCustomer: openRepairCustomerDetail,
      onOpenPark: openRepairParkDetail,
    })
  }

  return buildWorkOrderPrimarySections(inspectionWorkOrder.value, customer.value)
})

const secondarySections = computed<DetailFieldSection[]>(() => {
  if (props.kind === "repair") {
    return buildRepairWorkOrderSecondarySections(repairWorkOrder.value)
  }

  return buildWorkOrderSecondarySections(inspectionWorkOrder.value)
})

const secondarySkeletonSectionCount = computed(() => props.kind === "repair" ? 1 : 2)

function openRepairCustomerDetail() {
  const targetCustomerUuid = toRepairWorkOrderText(repairWorkOrder.value?.CustomerUuid) || customerUuid.value

  if (!targetCustomerUuid) {
    return
  }

  void router.push({
    name: "customer-detail",
    params: { id: targetCustomerUuid },
  })
}

function openRepairParkDetail() {
  const targetParkUuid = toRepairWorkOrderText(repairWorkOrder.value?.ParkUuid)

  if (!targetParkUuid) {
    return
  }

  const targetCustomerUuid = toRepairWorkOrderText(repairWorkOrder.value?.CustomerUuid) || customerUuid.value

  void router.push({
    name: "park-detail",
    params: { id: targetParkUuid },
    query: targetCustomerUuid ? { customerUuid: targetCustomerUuid } : undefined,
  })
}

const pageTitle = computed(() => {
  if (props.kind === "repair") {
    return toRepairWorkOrderText(repairWorkOrder.value?.Title, "报修工单详情")
  }

  return toText(inspectionWorkOrder.value?.PackageName, "关联检测服务") || "关联检测服务"
})

const pageSubtitle = computed(() => {
  if (props.kind === "repair") {
    return toRepairWorkOrderText(
      repairWorkOrder.value?.CustomerName
      ?? repairWorkOrder.value?.CorpName
      ?? customer.value?.CorpName,
      "CustomerName",
    ) || "CustomerName"
  }

  return toText(
    inspectionWorkOrder.value?.CustomerName
    ?? inspectionWorkOrder.value?.CorpName
    ?? customer.value?.CorpName,
    "CustomerName",
  ) || "CustomerName"
})

const hasWorkOrder = computed(() => (
  props.kind === "repair" ? Boolean(repairWorkOrder.value) : Boolean(inspectionWorkOrder.value)
))

const showAssignAction = computed(() => !loading.value && hasWorkOrder.value && Boolean(workOrderUuid.value))

watch([inspectionWorkOrder, repairWorkOrder], () => {
  if (props.kind === "repair") {
    const current = repairWorkOrder.value
    detailBreadcrumbTitle.value = toOptionalText(current?.Title) || toOptionalText(current?.OrderNo)
    return
  }

  const current = inspectionWorkOrder.value
  detailBreadcrumbTitle.value = toOptionalText(current?.PackageName) || toOptionalText(current?.OrderNo)
})

watch(workOrderUuid, (uuid) => {
  assignableUsersLoaded.value = false
  assignableUsers.value = []
  void loadWorkOrderDetail(uuid)
}, { immediate: true })

onUnmounted(() => {
  detailBreadcrumbTitle.value = null
})

function goBack() {
  if (queryReturnTo.value === "inspection-work-orders") {
    void router.push({ name: "inspection-work-orders" })
    return
  }

  if (queryReturnTo.value === "repair-work-orders") {
    void router.push({ name: "repair-work-orders" })
    return
  }

  if (customerUuid.value) {
    void router.push({
      name: "customer-detail",
      params: { id: customerUuid.value },
      query: { tab: "work-orders" },
    })
    return
  }

  void router.push({ name: props.kind === "repair" ? "repair-work-orders" : "inspection-work-orders" })
}

async function loadWorkOrderDetail(uuid: string) {
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

  try {
    const result = props.kind === "repair"
      ? await fetchRepairWorkOrderDetail({ Uuid: uuid })
      : await fetchWorkOrderDetail({ Uuid: uuid })

    if (requestId !== latestRequestId) {
      return
    }

    if (props.kind === "repair") {
      repairWorkOrder.value = result as RepairWorkOrderDetailResult
      inspectionWorkOrder.value = null
    } else {
      inspectionWorkOrder.value = result as WorkOrderDetailResult
      repairWorkOrder.value = null
    }

    const nextCustomerUuid = props.kind === "repair"
      ? toRepairWorkOrderText((result as RepairWorkOrderDetailResult).CustomerUuid)
      : toText((result as WorkOrderDetailResult).CustomerUuid)

    if (nextCustomerUuid) {
      try {
        const customerResult = await fetchCustomerDetail({ Uuid: nextCustomerUuid })

        if (requestId !== latestRequestId) {
          return
        }

        customer.value = customerResult
      } catch {
        if (requestId !== latestRequestId) {
          return
        }

        customer.value = null
      }
    } else {
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

function toOptionalText(value: unknown) {
  const text = props.kind === "repair" ? toRepairWorkOrderText(value) : toText(value)
  return text || null
}

function toMemberText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function openAssignDialog() {
  assignUserUuid.value = ""
  assignDialogOpen.value = true
  void loadAssignableUsers()
}

function closeAssignDialog() {
  if (assignSubmitting.value) {
    return
  }

  assignDialogOpen.value = false
}

async function loadAssignableUsers() {
  if (assignableUsersLoading.value || assignableUsersLoaded.value) {
    return
  }

  assignableUsersLoading.value = true

  try {
    const result = await fetchMembers({
      PageNum: 1,
      PageSize: 200,
      Status: 1,
    })

    const normalizedOptions = result.list
      .map((item) => {
        const record = item as Record<string, unknown>
        const uuid = toMemberText(record.Uuid ?? record.uuid)
        const name = toMemberText(record.Name ?? record.name, uuid)

        if (!uuid) {
          return null
        }

        return { uuid, name }
      })
      .filter((item): item is AssignableUserOption => item !== null)

    assignableUsers.value = normalizedOptions
    assignableUsersLoaded.value = true
  } catch (error) {
    assignableUsers.value = []
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "指派人员列表加载失败，请稍后重试。",
    }))
  } finally {
    assignableUsersLoading.value = false
  }
}

async function submitAssign() {
  const uuid = workOrderUuid.value

  if (!uuid) {
    toast.error("当前工单缺少 Uuid，无法指派")
    return
  }

  if (!assignUserUuid.value) {
    toast.error("请先选择指派用户")
    return
  }

  assignSubmitting.value = true

  try {
    await dispatchWorkOrder({
      Uuid: uuid,
      UserUuid: assignUserUuid.value,
    })

    toast.success("指派成功")
    assignDialogOpen.value = false
    await loadWorkOrderDetail(uuid)
  } catch (error) {
    toast.error(handleApiError(error, {
      mode: "silent",
      fallback: "指派失败，请稍后重试。",
    }))
  } finally {
    assignSubmitting.value = false
  }
}
</script>

<template>
  <DetailLayout
    :title="pageTitle"
    :subtitle="pageSubtitle"
    :empty="!loading && !hasWorkOrder"
    empty-text="未找到该工单信息"
    @back="goBack"
  >
    <template #actions>
      <Button
        v-if="showAssignAction"
        type="button"
        variant="outline"
        size="sm"
        class="gap-2"
        @click="openAssignDialog"
      >
        <i class="ri-user-shared-line text-base" />
        指派
      </Button>
    </template>

    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>工单详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="loading" :sections="2" :rows-per-section="4" />

      <DetailFieldSections v-else-if="hasWorkOrder" :sections="primarySections" />
    </template>

    <template #secondary>
      <div v-if="loading" class="pb-5">
        <DetailFieldsSkeleton :sections="secondarySkeletonSectionCount" :rows-per-section="3" />
      </div>

      <div v-else-if="!loading && hasWorkOrder" class="pb-5">
        <DetailFieldSections :sections="secondarySections" />
      </div>
    </template>
  </DetailLayout>

  <Dialog v-model:open="assignDialogOpen">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>指派工单</DialogTitle>
        <DialogDescription>
          请选择要指派的用户并确认提交。
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <p class="text-sm text-foreground">指派用户</p>
        <Select v-model="assignUserUuid" :disabled="assignableUsersLoading || assignSubmitting">
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="assignableUsersLoading ? '正在加载用户...' : '请选择用户'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="user in assignableUsers" :key="user.uuid" :value="user.uuid">
              {{ user.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" class="gap-2" :disabled="assignSubmitting" @click="closeAssignDialog">
          <i class="ri-close-line text-sm" />
          取消
        </Button>
        <Button type="button" class="gap-2" :disabled="assignSubmitting || !assignUserUuid" @click="submitAssign">
          <i
            :class="assignSubmitting ? 'ri-loader-4-line animate-spin text-sm' : 'ri-send-plane-line text-sm'"
          />
          {{ assignSubmitting ? "提交中..." : "确认指派" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
