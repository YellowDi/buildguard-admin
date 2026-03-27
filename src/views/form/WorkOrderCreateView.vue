<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import FormDatePicker from "@/components/form/FormDatePicker.vue"
import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomerDetail } from "@/lib/customers-api"
import { fetchInspectionPlans, type InspectionPlanListItem } from "@/lib/inspection-plans-api"
import { createWorkOrder } from "@/lib/work-orders-api"

type QuickNavItem = {
  id: string
  label: string
}

type WorkOrderFormState = {
  customerUuid: string
  planUuid: string
  packageName: string
  deadline: string
  status: string
  remark: string
}

type PlanOption = {
  uuid: string
  name: string
}

const STATUS_OPTIONS = [
  { value: "1", label: "待指派" },
  { value: "2", label: "待开始" },
  { value: "3", label: "进行中" },
  { value: "4", label: "报告生成中" },
  { value: "5", label: "已结单" },
] as const

function createEmptyForm(): WorkOrderFormState {
  return {
    customerUuid: "",
    planUuid: "",
    packageName: "",
    deadline: "",
    status: "1",
    remark: "",
  }
}

const router = useRouter()
const route = useRoute()
const form = reactive<WorkOrderFormState>(createEmptyForm())
const initialFormState = ref<WorkOrderFormState>(createEmptyForm())
const customerName = ref("")
const loadError = ref("")
const submitting = ref(false)
const planLoading = ref(false)
const planOptions = ref<PlanOption[]>([])
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const formSectionsRef = ref<HTMLElement | null>(null)
const STICKY_HEADER_OFFSET = 112
let observer: IntersectionObserver | null = null
let observerActive = false

const routeCustomerUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const queryCustomerName = computed(() => typeof route.query.customerName === "string" ? route.query.customerName.trim() : "")
const canSubmit = computed(() =>
  Boolean(
    normalizeText(form.customerUuid)
    && normalizeText(form.planUuid)
    && normalizeText(form.packageName)
    && normalizeText(form.deadline)
    && normalizeText(form.status)
    && !submitting.value
    && !planLoading.value,
  ),
)
const submitButtonLabel = computed(() => submitting.value ? "提交中..." : "添加工单")

function handleFocus(sectionId: string) {
  activeNavId.value = sectionId
}

function goBack() {
  router.back()
}

function syncAnchorItems() {
  const sectionElements = formSectionsRef.value?.querySelectorAll<HTMLElement>("[data-quick-nav-label][id]") ?? []
  anchorItems.value = Array.from(sectionElements).map(section => ({
    id: section.id,
    label: section.dataset.quickNavLabel ?? section.id,
  }))

  if (!anchorItems.value.some(item => item.id === activeNavId.value)) {
    activeNavId.value = anchorItems.value[0]?.id ?? ""
  }
}

function scrollToSection(id: string) {
  activeNavId.value = id
  observerActive = false
  const section = document.getElementById(id)

  if (!section) {
    return
  }

  const rect = section.getBoundingClientRect()
  const top = rect.top + window.scrollY - STICKY_HEADER_OFFSET

  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })

  nextTick(() => {
    const focusable = section.querySelector<HTMLElement>(
      'input:not([type=hidden]):not([disabled]), textarea:not([disabled]), button:not([disabled])',
    )
    focusable?.focus({ preventScroll: true })
    setTimeout(() => { observerActive = true }, 350)
  })
}

async function handleSubmit() {
  if (!normalizeText(form.customerUuid)) {
    toast.error("所属客户信息缺失")
    return
  }

  if (!normalizeText(form.planUuid)) {
    toast.error("请选择检测计划")
    return
  }

  if (!normalizeText(form.packageName)) {
    toast.error("请填写套餐名称")
    return
  }

  if (!normalizeText(form.deadline)) {
    toast.error("请选择截止时间")
    return
  }

  submitting.value = true

  try {
    const payload = {
      PlanUuid: normalizeText(form.planUuid),
      PackageName: normalizeText(form.packageName),
      CustomerUuid: normalizeText(form.customerUuid),
      Deadline: normalizeText(form.deadline),
      Status: Number(form.status),
      Remark: getOptionalText(form.remark),
    }
    const result = await createWorkOrder(payload)

    toast.success("工单已创建", {
      description: result.Uuid
        ? `工单 UUID：${result.Uuid}`
        : "工单信息已提交到接口。",
    })

    await router.push({
      name: "customer-detail",
      params: { id: payload.CustomerUuid },
      query: { tab: "work-orders" },
    })
  } catch (error) {
    handleApiError(error, {
      title: "工单创建失败",
      fallback: "工单创建失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  Object.assign(form, initialFormState.value)
}

async function loadFormContext() {
  loadError.value = ""
  planOptions.value = []

  if (!routeCustomerUuid.value) {
    loadError.value = "所属客户信息缺失，无法创建工单。"
    return
  }

  planLoading.value = true

  try {
    const [customerDetail, plans] = await Promise.all([
      fetchCustomerDetail({ Uuid: routeCustomerUuid.value }),
      fetchAllInspectionPlans(routeCustomerUuid.value),
    ])

    customerName.value = normalizeText(customerDetail.CorpName) || queryCustomerName.value || "当前客户"
    form.customerUuid = routeCustomerUuid.value
    planOptions.value = plans.map(mapPlanOption)

    if (!normalizeText(form.planUuid) && planOptions.value.length) {
      form.planUuid = planOptions.value[0]?.uuid ?? ""
    }

    initialFormState.value = {
      ...createEmptyForm(),
      customerUuid: routeCustomerUuid.value,
      planUuid: form.planUuid,
    }
  } catch (error) {
    customerName.value = queryCustomerName.value || "当前客户"
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "工单表单初始化失败，请稍后重试。",
    })
  } finally {
    planLoading.value = false
  }
}

async function fetchAllInspectionPlans(customerUuid: string) {
  const pageSize = 200
  const allItems: InspectionPlanListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchInspectionPlans({
      CustomerUuid: customerUuid,
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    const matchedItems = result.list.filter(item => normalizeText(item.CustomerUuid) === customerUuid)
    allItems.push(...matchedItems)

    if (!result.list.length || (total > 0 && pageNum * pageSize >= total)) {
      break
    }

    pageNum += 1
  }

  return dedupePlans(allItems)
}

function dedupePlans(items: InspectionPlanListItem[]) {
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

function mapPlanOption(item: InspectionPlanListItem): PlanOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.ServiceName) || `检测计划 ${normalizeText(item.Id) || "-"}`,
  }
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

function resetLocalStateForRoute() {
  loadError.value = ""
  customerName.value = ""
  planOptions.value = []
  Object.assign(form, createEmptyForm())

  if (routeCustomerUuid.value) {
    form.customerUuid = routeCustomerUuid.value
    customerName.value = queryCustomerName.value || "当前客户"
    initialFormState.value = {
      ...createEmptyForm(),
      customerUuid: routeCustomerUuid.value,
    }
    return
  }

  initialFormState.value = createEmptyForm()
}

onMounted(() => {
  resetLocalStateForRoute()
  void loadFormContext()

  nextTick(() => {
    syncAnchorItems()
    observer = new IntersectionObserver(
      (entries) => {
        if (!observerActive) {
          return
        }

        const intersecting = entries.filter(entry =>
          entry.isIntersecting && anchorItems.value.some(item => item.id === entry.target.id),
        )

        if (!intersecting.length) {
          return
        }

        const topmost = anchorItems.value.find(item =>
          intersecting.some(entry => entry.target.id === item.id),
        )

        if (topmost) {
          activeNavId.value = topmost.id
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    )

    anchorItems.value.forEach((item) => {
      const element = document.getElementById(item.id)

      if (element) {
        observer?.observe(element)
      }
    })

    setTimeout(() => { observerActive = true }, 150)
  })
})

onUnmounted(() => {
  observer?.disconnect()
})

watch(
  () => [route.params.id, route.query.customerName] as const,
  () => {
    resetLocalStateForRoute()
    void loadFormContext()
  },
)
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      title="添加工单"
      :primary-action="{ label: submitButtonLabel, icon: 'ri-file-add-line', disabled: !canSubmit }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: '当前已填写的工单信息都会被清空，此操作不可撤销。' }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="loadError" variant="destructive">
      <AlertTitle>工单表单初始化失败</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        <span>{{ loadError }}</span>
        <Button size="sm" variant="outline" @click="loadFormContext">
          重试
        </Button>
      </AlertDescription>
    </Alert>

    <div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]">
      <form class="min-w-0 space-y-0" @submit.prevent="handleSubmit">
        <div ref="formSectionsRef" class="min-w-0 space-y-0">
          <FormFieldSection
            id="section-customer"
            quick-nav-label="所属客户"
            label="所属客户"
            label-for="work-order-customer"
          >
            <Input
              id="work-order-customer"
              :model-value="customerName || '当前客户'"
              disabled
              class="w-full"
              @focus="handleFocus('section-customer')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-plan"
            quick-nav-label="检测计划"
            label="检测计划"
          >
            <Select v-if="planOptions.length" v-model="form.planUuid" :disabled="planLoading">
              <SelectTrigger id="work-order-plan" class="w-full" @focus="handleFocus('section-plan')">
                <SelectValue :placeholder="planLoading ? '正在加载检测计划...' : '请选择检测计划'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="plan in planOptions" :key="plan.uuid" :value="plan.uuid">
                  {{ plan.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              v-else
              id="work-order-plan"
              v-model="form.planUuid"
              required
              :placeholder="planLoading ? '正在加载检测计划...' : '请输入检测计划 UUID'"
              class="w-full"
              @focus="handleFocus('section-plan')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-package"
            quick-nav-label="套餐名称"
            label="套餐名称"
            label-for="work-order-package"
          >
            <Input
              id="work-order-package"
              v-model="form.packageName"
              required
              placeholder="请输入套餐名称"
              class="w-full"
              @focus="handleFocus('section-package')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-deadline"
            quick-nav-label="截止时间"
            label="截止时间"
            label-for="work-order-deadline"
          >
            <FormDatePicker
              id="work-order-deadline"
              v-model="form.deadline"
              placeholder="请选择截止时间"
              @focus="handleFocus('section-deadline')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-status"
            quick-nav-label="状态"
            label="状态"
          >
            <Select v-model="form.status">
              <SelectTrigger id="work-order-status" class="w-full" @focus="handleFocus('section-status')">
                <SelectValue placeholder="请选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="status in STATUS_OPTIONS" :key="status.value" :value="status.value">
                  {{ status.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-remark"
            quick-nav-label="备注"
            label="备注"
            label-for="work-order-remark"
            align="start"
            last
          >
            <Textarea
              id="work-order-remark"
              v-model="form.remark"
              placeholder="请输入备注"
              class="min-h-[120px] w-full resize-y"
              @focus="handleFocus('section-remark')"
            />
          </FormFieldSection>
        </div>
      </form>

      <FormQuickNav
        v-if="anchorItems.length"
        class="hidden lg:sticky lg:top-24 lg:block lg:self-start"
        :active-id="activeNavId"
        :items="anchorItems"
        @select="scrollToSection"
      />
    </div>
  </section>
</template>
