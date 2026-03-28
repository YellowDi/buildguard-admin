<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailContactValue, DetailFieldSection } from "@/components/detail/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"
import DetailLayout from "@/layouts/DetailLayout.vue"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail, type CustomerDetailResult } from "@/lib/customers-api"
import { fetchWorkOrderDetail, type WorkOrderDetailResult } from "@/lib/work-orders-api"

const route = useRoute()
const router = useRouter()

const workOrder = ref<WorkOrderDetailResult | null>(null)
const customer = ref<CustomerDetailResult | null>(null)
const loading = ref(false)
const errorMessage = ref("")
let latestRequestId = 0

const workOrderUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const customerUuid = computed(() => {
  const queryValue = typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : ""
  return queryValue || toText(workOrder.value?.CustomerUuid)
})
const queryReturnTo = computed(() => typeof route.query.returnTo === "string" ? route.query.returnTo.trim() : "")

const primarySections = computed<DetailFieldSection[]>(() => {
  const current = workOrder.value

  if (!current) {
    return []
  }

  return [
    {
      key: "work-order-basic",
      title: "基本信息",
      rows: [
        { key: "work-order-id", label: "工单ID", value: toText(current.Uuid, toText(current.Id, "-")) },
        { key: "plan-time", label: "计划时间", value: "-" },
        { key: "deadline", label: "截止时间", value: toText(current.Deadline, "-") },
        { key: "executor", label: "执行人", value: toText(current.Executor, "-") },
        { key: "package-name", label: "关联套餐", value: toText(current.PackageName, "-") },
        { key: "plan-name", label: "关联计划", value: toText(current.PlanName, "-") },
      ],
    },
    {
      key: "work-order-customer",
      title: "客户信息",
      rows: [
        { key: "customer-name", label: "客户名称", value: toText(customer.value?.CorpName, toText(current.CustomerName, "-")) },
        { key: "park-building", label: "园区/建筑", value: "-" },
        {
          key: "address",
          label: "地址",
          value: toText(customer.value?.Address, "-"),
          truncate: false,
          valueClass: "leading-6",
        },
        {
          key: "contact",
          label: "园区/建筑联系人",
          value: buildContactValue(
            resolveCustomerContactName(customer.value),
            resolveCustomerContactPhone(customer.value),
          ),
        },
      ],
    },
  ]
})

const secondarySections = computed<DetailFieldSection[]>(() => {
  const current = workOrder.value

  if (!current) {
    return []
  }

  return [
    {
      key: "work-order-report-suggestion",
      title: "报告建议",
      rows: [
        { key: "remark", label: "建议内容", value: toText(current.Remark, "-"), truncate: false, valueClass: "leading-6" },
      ],
    },
    {
      key: "work-order-result",
      title: "检测结果",
      rows: [
        { key: "status", label: "状态", value: formatStatus(current.Status) },
        { key: "result", label: "检测结果", value: formatResult(current.Result) },
        { key: "score", label: "评分", value: formatScore(current.Score) },
      ],
    },
  ]
})

watch(workOrder, (current) => {
  detailBreadcrumbTitle.value = toOptionalText(current?.PackageName) || toOptionalText(current?.OrderNo)
})

watch(workOrderUuid, (uuid) => {
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

  if (customerUuid.value) {
    void router.push({
      name: "customer-detail",
      params: { id: customerUuid.value },
      query: { tab: "work-orders" },
    })
    return
  }

  void router.push({ name: "inspection-work-orders" })
}

async function loadWorkOrderDetail(uuid: string) {
  const requestId = ++latestRequestId

  if (!uuid) {
    workOrder.value = null
    customer.value = null
    errorMessage.value = "工单 Uuid 缺失，无法加载详情。"
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const result = await fetchWorkOrderDetail({ Uuid: uuid })

    if (requestId !== latestRequestId) {
      return
    }

    workOrder.value = result

    const nextCustomerUuid = toText(result.CustomerUuid)

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

    workOrder.value = null
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

function formatStatus(value: unknown) {
  const status = toNumber(value)

  if (status === null) return "-"
  if (status === 1) return "待指派"
  if (status === 2) return "待开始"
  if (status === 3) return "进行中"
  if (status === 4) return "报告生成中"
  if (status === 5) return "已结单"

  return `状态 ${status}`
}

function formatResult(value: unknown) {
  const result = toNumber(value)

  if (result === null || result === 0) return "未反馈"
  if (result === 1) return "正常"
  if (result === 2) return "异常"
  if (result === 3) return "已驳回"

  return `结果 ${result}`
}

function formatScore(value: unknown) {
  const score = toNumber(value)
  return score === null ? "-" : String(score)
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
  const text = toText(value)
  return text || null
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function buildContactValue(name: string, phone?: string | null): DetailContactValue {
  return {
    kind: "contact",
    name,
    phone,
  }
}

function resolveCustomerContactName(detail: CustomerDetailResult | null) {
  const mainContact = detail?.People?.find(person => toNumber(person?.IsMain) === 1)
  return toText(mainContact?.Name, toText(detail?.People?.[0]?.Name, "-"))
}

function resolveCustomerContactPhone(detail: CustomerDetailResult | null) {
  const mainContact = detail?.People?.find(person => toNumber(person?.IsMain) === 1)
  return toText(mainContact?.Phone, toText(detail?.People?.[0]?.Phone, "-"))
}
</script>

<template>
  <DetailLayout
    :title="toText(workOrder?.PackageName, '关联套餐') || '关联套餐'"
    :subtitle="toText(workOrder?.OrderNo, '工单编号') || '工单编号'"
    :empty="!loading && !workOrder"
    empty-text="未找到该工单信息"
    @back="goBack"
  >
    <template #primary>
      <Alert v-if="errorMessage" variant="destructive" class="mb-5">
        <AlertTitle>工单详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div v-if="loading" class="rounded-lg border border-border/70 px-4 py-5 text-sm text-muted-foreground">
        正在获取工单详情数据。
      </div>

      <DetailFieldSections v-else-if="workOrder" :sections="primarySections" />
    </template>

    <template #secondary>
      <div v-if="!loading && workOrder" class="pb-5">
        <DetailFieldSections :sections="secondarySections" />
      </div>
    </template>
  </DetailLayout>
</template>
