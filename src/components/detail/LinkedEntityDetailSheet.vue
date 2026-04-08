<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

import type { DetailContactValue, DetailFieldSection, DetailStatusValue } from "@/components/detail/types"
import { customerStatusMap } from "@/components/table-page/statusPresets"
import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import DetailFieldsSkeleton from "@/components/loading/DetailFieldsSkeleton.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { TooltipWrap } from "@/components/ui/tooltip"
import { fetchCustomerDetail, type CustomerDetailResult } from "@/lib/customers-api"
import { handleApiError } from "@/lib/api-errors"
import { fetchInspectionPlanDetail, type InspectionPlanListItem } from "@/lib/inspection-plans-api"
import { fetchParkDetail, type ParkDetailResult } from "@/lib/parks-api"
import { fetchInspectionServiceDetail, type InspectionServiceListItem } from "@/lib/inspection-services-api"

export type LinkedEntityDetailSheetKind = "customer" | "service" | "plan" | "park"

const props = defineProps<{
  open: boolean
  kind: LinkedEntityDetailSheetKind | null
  uuid: string
  customerUuid?: string
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
}>()

const router = useRouter()

const loading = ref(false)
const errorMessage = ref("")
const customerDetail = ref<CustomerDetailResult | null>(null)
const serviceDetail = ref<InspectionServiceListItem | null>(null)
const planDetail = ref<InspectionPlanListItem | null>(null)
const parkDetail = ref<ParkDetailResult | null>(null)
let latestRequestId = 0

const title = computed(() => {
  if (props.kind === "customer") {
    return toText(customerDetail.value?.CorpName, "客户详情")
  }

  if (props.kind === "service") {
    return toText(serviceDetail.value?.Name, "检测服务详情")
  }

  if (props.kind === "plan") {
    return toText(planDetail.value?.Name, "检测计划详情")
  }

  if (props.kind === "park") {
    return toText(parkDetail.value?.Name, "园区详情")
  }

  return "详情"
})

const sections = computed<DetailFieldSection[]>(() => {
  if (props.kind === "customer" && customerDetail.value) {
    return [
      {
        key: "customer-base",
        title: "基础信息",
        rows: [
          { key: "corp-name", label: "企业名称", value: toText(customerDetail.value.CorpName, "-") },
          { key: "business", label: "所属行业", value: toText(customerDetail.value.Business, "-") },
          { key: "customer-status", label: "客户状态", value: buildCustomerStatusValue(customerDetail.value.Status) },
          { key: "usci", label: "信用代码", value: toText(customerDetail.value.Usci, "-") },
          { key: "address", label: "详细地址", value: toText(customerDetail.value.Address, "-"), truncate: false, valueClass: "leading-6" },
          { key: "invoice", label: "开票资料", value: toText(customerDetail.value.Invoice, "-"), truncate: false, valueClass: "leading-6" },
        ],
      },
      {
        key: "customer-contacts",
        title: "客户联系人",
        rows: buildCustomerContactFieldRows(customerDetail.value.People),
      },
    ]
  }

  if (props.kind === "service" && serviceDetail.value) {
    return [
      {
        key: "service-info",
        title: "服务信息",
        rows: [
          { key: "name", label: "服务名称", value: toText(serviceDetail.value.Name, "未命名服务") },
          { key: "status", label: "服务状态", value: buildServiceStatusValue(serviceDetail.value.Status) },
          { key: "level", label: "套餐等级", value: toText(serviceDetail.value.Level, "-") },
          { key: "customer-name", label: "客户名称", value: toText(serviceDetail.value.CorpName || serviceDetail.value.CustomerName, "未绑定客户") },
          { key: "template-name", label: "模板名称", value: toText(serviceDetail.value.TemplateName, "-") },
          {
            key: "contract-end-time",
            label: "合同到期时间",
            value: toText(serviceDetail.value.ContractEndTime, "-"),
            suffixHint: getServiceRemainingDaysHint(serviceDetail.value.ContractEndTime),
          },
          { key: "created-at", label: "创建时间", value: toText(serviceDetail.value.CreatedAt, "-") },
          { key: "updated-at", label: "更新时间", value: toText(serviceDetail.value.UpdatedAt, "-") },
          { key: "remark", label: "备注", value: toText(serviceDetail.value.Remark, "-"), truncate: false, valueClass: "leading-6" },
        ],
      },
      {
        key: "service-manager",
        title: "负责人信息",
        rows: [
          { key: "manager", label: "负责人", value: buildContactValue(toText(serviceDetail.value.ManagerName, "未填写"), toText(serviceDetail.value.ManagerPhone, "-")) },
        ],
      },
    ]
  }

  if (props.kind === "plan" && planDetail.value) {
    return [
      {
        key: "plan-basic",
        title: "计划信息",
        rows: [
          { key: "name", label: "计划名称", value: toText(planDetail.value.Name, "未命名计划") },
          { key: "code", label: "计划编号", value: toText(planDetail.value.Code, "-"), valueClass: "text-muted-foreground" },
          { key: "customer-name", label: "所属客户", value: toText(planDetail.value.CorpName, "-") },
          { key: "service-name", label: "关联服务", value: toText(planDetail.value.ServiceName, "-") },
          { key: "duration", label: "执行频率", value: formatDayValue(planDetail.value.Duration) },
          { key: "work-order-duration", label: "工单时长", value: formatDayValue(planDetail.value.WorkOrderDuration) },
          {
            key: "first-time",
            label: "首次执行时间",
            value: formatDateOnly(toText(planDetail.value.FirstTime, "-")),
            suffixHint: getElapsedDaysHint(planDetail.value.FirstTime),
          },
          {
            key: "next-time",
            label: "下次执行时间",
            value: formatNextExecutionValue(planDetail.value.NextTime),
            valueClass: getNextExecutionValueClass(planDetail.value.NextTime),
            suffixHint: getRemainingDaysHint(planDetail.value.NextTime),
          },
          {
            key: "end-time",
            label: "计划结束时间",
            value: formatDateOnly(toText(planDetail.value.EndTime, "-")),
            suffixHint: getRemainingDaysHint(planDetail.value.EndTime),
          },
          {
            key: "lastest-time",
            label: "最近执行时间",
            value: formatDateOnly(toText(planDetail.value.LastestTime, "-")),
            suffixHint: getElapsedDaysHint(planDetail.value.LastestTime),
          },
          { key: "lastest-order-no", label: "最近执行订单号", value: toText(planDetail.value.LastestOrderNo, "-"), valueClass: "text-muted-foreground" },
          { key: "creator", label: "创建人", value: toText(planDetail.value.Creator, "-") },
          { key: "created-at", label: "创建时间", value: toText(planDetail.value.CreatedAt, "-") },
        ],
      },
    ]
  }

  if (props.kind === "park" && parkDetail.value) {
    return [
      {
        key: "park-info",
        title: "园区基础信息",
        rows: [
          { key: "name", label: "园区名称", value: toText(parkDetail.value.Name, "未命名园区") },
          { key: "built-time", label: "建成时间", value: toText(parkDetail.value.BuiltTime, "-") },
          { key: "operation-time", label: "投运时间", value: toText(parkDetail.value.OperationTime, "-") },
          { key: "building-area", label: "建筑面积", value: toText(parkDetail.value.BuildArea, "-") },
          { key: "contact", label: "联系人", value: buildContactValue(toText(parkDetail.value.Contact, "未填写"), toText(parkDetail.value.ContactPhone, "-")) },
          { key: "latitude", label: "纬度", value: toText(parkDetail.value.Latitude, "-") },
          { key: "longitude", label: "经度", value: toText(parkDetail.value.Longitude, "-") },
          { key: "address", label: "地址", value: toText(parkDetail.value.Address, "-"), truncate: false, valueClass: "leading-6" },
        ],
      },
    ]
  }

  return []
})

watch(
  () => [props.open, props.kind, props.uuid] as const,
  ([open, kind, uuid]) => {
    if (!open || !kind || !uuid) {
      resetState()
      return
    }

    void loadDetail(kind, uuid)
  },
  { immediate: true },
)

function handleOpenChange(open: boolean) {
  emit("update:open", open)

  if (!open) {
    resetState()
  }
}

async function loadDetail(kind: LinkedEntityDetailSheetKind, uuid: string) {
  const requestId = ++latestRequestId

  loading.value = true
  errorMessage.value = ""
  customerDetail.value = null
  serviceDetail.value = null
  planDetail.value = null
  parkDetail.value = null

  try {
    if (kind === "customer") {
      customerDetail.value = await fetchCustomerDetail({ Uuid: uuid })
    } else if (kind === "service") {
      serviceDetail.value = await fetchInspectionServiceDetail({ Uuid: uuid })
    } else if (kind === "plan") {
      planDetail.value = await fetchInspectionPlanDetail({ Uuid: uuid })
    } else {
      parkDetail.value = await fetchParkDetail({ Uuid: uuid })
    }
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "关联详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function openFullPage() {
  if (props.kind === "customer" && customerDetail.value?.Uuid) {
    void router.push({
      name: "customer-detail",
      params: { id: customerDetail.value.Uuid },
    })
    return
  }

  if (props.kind === "service" && serviceDetail.value?.Uuid) {
    void router.push({
      name: "inspection-service-detail",
      params: { id: serviceDetail.value.Uuid },
      query: props.customerUuid ? { customerUuid: props.customerUuid } : undefined,
    })
    return
  }

  if (props.kind === "plan" && planDetail.value?.Uuid) {
    void router.push({
      name: "inspection-plan-detail",
      params: { id: planDetail.value.Uuid },
    })
    return
  }

  if (props.kind === "park" && parkDetail.value?.Uuid) {
    void router.push({
      name: "park-detail",
      params: { id: parkDetail.value.Uuid },
      query: props.customerUuid ? { customerUuid: props.customerUuid } : undefined,
    })
  }
}

function resetState() {
  loading.value = false
  errorMessage.value = ""
  customerDetail.value = null
  serviceDetail.value = null
  planDetail.value = null
  parkDetail.value = null
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

function buildContactValue(name: string, phone?: string | null): DetailContactValue {
  return {
    kind: "contact",
    name,
    phone,
  }
}

function buildCustomerStatusValue(value: unknown): DetailStatusValue {
  return {
    kind: "status",
    value: formatCustomerStatus(value),
    renderer: {
      kind: "status",
      map: customerStatusMap,
      fallback: { tone: "gray", icon: "dot" },
    },
  }
}

function buildServiceStatusValue(status: unknown): DetailStatusValue {
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

function formatCustomerStatus(value: unknown) {
  const status = typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.trim())
      : null

  switch (status) {
    case 1:
      return "正常"
    case 2:
      return "封禁"
    case 3:
      return "未完善"
    default:
      return "未填写"
  }
}

function buildCustomerContactFieldRows(people: CustomerDetailResult["People"]) {
  const filled = Array.isArray(people)
    ? people.filter(person => Boolean(toText(person?.Name, "") || toText(person?.Phone, "")))
    : []

  if (!filled.length) {
    return [
      { key: "contact-empty", label: "联系人", value: "未填写" },
    ]
  }

  return filled.map((person, index) => ({
    key: `contact-${index + 1}`,
    label: resolveContactRole(person?.IsMain, index),
    value: buildContactValue(toText(person?.Name, "-"), toText(person?.Phone, "-")),
  }))
}

function resolveContactRole(isMain: unknown, index: number) {
  if (toNumber(isMain) === 1) {
    return "主要联系人"
  }

  return index === 0 ? "联系人" : `联系人 ${index + 1}`
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function formatDateOnly(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
}

function formatNextExecutionValue(value: unknown) {
  const normalized = toText(value, "")

  if (!normalized || normalized === "-" || normalized === "—") {
    return "计划结束前无后续执行"
  }

  return formatDateOnly(normalized)
}

function getNextExecutionValueClass(value: unknown) {
  const normalized = toText(value, "")

  if (!normalized || normalized === "-" || normalized === "—") {
    return "text-muted-foreground"
  }

  return undefined
}

function formatDayValue(value: unknown) {
  const normalized = toFiniteNumber(value)
  return normalized === null ? "-" : `${normalized}天`
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

function getServiceRemainingDaysHint(value: unknown) {
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
</script>

<template>
  <ResponsiveRightSheet
    :open="props.open"
    sheet-content-class="overflow-hidden sm:max-w-xl"
    :show-primary="!loading"
    @update:open="handleOpenChange"
    @footer-primary="openFullPage"
  >
    <template #actions>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-1">
          <TooltipWrap content="关闭关联详情" side="right">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              @click="handleOpenChange(false)"
            >
              <i class="ri-arrow-right-double-line text-[16px]" />
              <span class="sr-only">关闭关联详情</span>
            </Button>
          </TooltipWrap>
          <TooltipWrap v-if="!loading" content="打开完整详情页">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              @click="openFullPage"
            >
              <i class="ri-fullscreen-line text-[16px]" />
              <span class="sr-only">打开完整详情页</span>
            </Button>
          </TooltipWrap>
        </div>
      </div>
    </template>
    <template #title>{{ title }}</template>

    <div class="space-y-5 overflow-y-auto">
      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertTitle>关联详情接口加载失败</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DetailFieldsSkeleton v-if="loading" :sections="1" :rows-per-section="5" />
      <DetailFieldSections v-else-if="sections.length" :sections="sections" />
    </div>
  </ResponsiveRightSheet>
</template>
