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
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import { createInspectionPlan } from "@/lib/inspection-plans-api"
import { fetchInspectionServices, type InspectionServiceListItem } from "@/lib/inspection-services-api"

type QuickNavItem = {
  id: string
  label: string
}

type InspectionPlanFormState = {
  customerUuid: string
  serviceUuid: string
  name: string
  cycleType: string
  duration: string
  firstTime: string
  endTime: string
}

type CustomerOption = {
  uuid: string
  name: string
}

type ServiceOption = {
  uuid: string
  name: string
}

const CYCLE_TYPE_OPTIONS = [
  { value: "1", label: "天" },
  { value: "2", label: "季" },
  { value: "3", label: "月" },
  { value: "4", label: "半年" },
  { value: "5", label: "年" },
] as const
const STICKY_HEADER_OFFSET = 112

function createEmptyForm(): InspectionPlanFormState {
  return {
    customerUuid: "",
    serviceUuid: "",
    name: "",
    cycleType: "",
    duration: "",
    firstTime: "",
    endTime: "",
  }
}

const router = useRouter()
const route = useRoute()
const form = reactive<InspectionPlanFormState>(createEmptyForm())
const initialFormState = ref<InspectionPlanFormState>(createEmptyForm())
const loadError = ref("")
const submitting = ref(false)
const customerLoading = ref(false)
const serviceLoading = ref(false)
const customerOptions = ref<CustomerOption[]>([])
const serviceOptions = ref<ServiceOption[]>([])
const loadedServicesCustomerUuid = ref("")
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const formSectionsRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let observerActive = false
let suppressCustomerWatch = false

const queryCustomerUuid = computed(() => typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : "")
const queryServiceUuid = computed(() => typeof route.query.serviceUuid === "string" ? route.query.serviceUuid.trim() : "")
const queryName = computed(() => typeof route.query.name === "string" ? route.query.name.trim() : "")
const queryCycleType = computed(() => typeof route.query.cycleType === "string" ? route.query.cycleType.trim() : "")
const queryDuration = computed(() => typeof route.query.duration === "string" ? route.query.duration.trim() : "")
const queryFirstTime = computed(() => typeof route.query.firstTime === "string" ? route.query.firstTime.trim() : "")
const queryEndTime = computed(() => typeof route.query.endTime === "string" ? route.query.endTime.trim() : "")

const selectedCustomerName = computed(() =>
  customerOptions.value.find(item => item.uuid === form.customerUuid)?.name ?? "",
)
const selectedServiceName = computed(() =>
  serviceOptions.value.find(item => item.uuid === form.serviceUuid)?.name ?? "",
)
const canSubmit = computed(() =>
  Boolean(
    normalizeText(form.customerUuid)
    && normalizeText(form.serviceUuid)
    && normalizeText(form.name)
    && normalizeText(form.cycleType)
    && parsePositiveInteger(form.duration) !== null
    && normalizeText(form.firstTime)
    && !submitting.value
    && !customerLoading.value
    && !serviceLoading.value,
  ),
)
const submitButtonLabel = computed(() => submitting.value ? "提交中..." : "添加检测计划")
const cycleTypeLabelByValue = new Map(CYCLE_TYPE_OPTIONS.map(item => [item.value, item.label]))

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
      "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), button:not([disabled])",
    )
    focusable?.focus({ preventScroll: true })
    setTimeout(() => { observerActive = true }, 350)
  })
}

async function handleSubmit() {
  if (!normalizeText(form.customerUuid)) {
    toast.error("请选择客户")
    return
  }

  if (!normalizeText(form.serviceUuid)) {
    toast.error("请选择服务")
    return
  }

  if (!normalizeText(form.name)) {
    toast.error("请填写计划名称")
    return
  }

  if (!normalizeText(form.cycleType)) {
    toast.error("请选择周期类型")
    return
  }

  const cycleType = parseCycleType(form.cycleType)

  if (cycleType === null) {
    toast.error("周期类型不合法")
    return
  }

  const duration = parsePositiveInteger(form.duration)

  if (duration === null) {
    toast.error("请填写有效的执行频率")
    return
  }

  const firstTime = toApiDateTime(form.firstTime)

  if (!firstTime) {
    toast.error("请选择首次执行时间")
    return
  }

  const endTime = toApiDateTime(form.endTime)

  submitting.value = true

  try {
    const result = await createInspectionPlan({
      CustomerUuid: normalizeText(form.customerUuid),
      ServiceUuid: normalizeText(form.serviceUuid),
      Name: normalizeText(form.name),
      CycleType: cycleType,
      Duration: duration,
      FirstTime: firstTime,
      EndTime: endTime,
    })

    toast.success("检测计划已创建", {
      description: result.Uuid
        ? `计划 UUID：${result.Uuid}`
        : `${selectedCustomerName.value || "当前客户"}的${selectedServiceName.value || "检测"}计划已提交到接口。`,
    })

    await router.push({ name: "inspection-plans" })
  } catch (error) {
    handleApiError(error, {
      title: "检测计划创建失败",
      fallback: "检测计划创建失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  Object.assign(form, initialFormState.value)
}

async function loadInitialOptions() {
  loadError.value = ""
  customerLoading.value = true

  try {
    suppressCustomerWatch = true
    const customers = await fetchAllCustomers()
    customerOptions.value = customers.map(mapCustomerOption).filter(item => item.uuid)

    const preferredCustomerUuid = customerOptions.value.some(item => item.uuid === queryCustomerUuid.value)
      ? queryCustomerUuid.value
      : customerOptions.value[0]?.uuid ?? ""

    form.customerUuid = preferredCustomerUuid

    if (form.customerUuid) {
      await loadServicesForCustomer(form.customerUuid)
    } else {
      serviceOptions.value = []
    }

    if (queryServiceUuid.value && serviceOptions.value.some(item => item.uuid === queryServiceUuid.value)) {
      form.serviceUuid = queryServiceUuid.value
    }

    initialFormState.value = {
      ...form,
    }
  } catch (error) {
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测计划表单初始化失败，请稍后重试。",
    })
  } finally {
    suppressCustomerWatch = false
    customerLoading.value = false
  }
}

async function loadServicesForCustomer(customerUuid: string) {
  loadedServicesCustomerUuid.value = ""
  serviceOptions.value = []

  if (!customerUuid) {
    form.serviceUuid = ""
    return
  }

  serviceLoading.value = true

  try {
    const services = await fetchAllInspectionServices(customerUuid)
    serviceOptions.value = services.map(mapServiceOption).filter(item => item.uuid)
    loadedServicesCustomerUuid.value = customerUuid

    if (!serviceOptions.value.some(item => item.uuid === form.serviceUuid)) {
      form.serviceUuid = queryServiceUuid.value && serviceOptions.value.some(item => item.uuid === queryServiceUuid.value)
        ? queryServiceUuid.value
        : serviceOptions.value[0]?.uuid ?? ""
    }
  } catch (error) {
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测服务加载失败，请稍后重试。",
    })
  } finally {
    serviceLoading.value = false
  }
}

async function fetchAllCustomers() {
  const pageSize = 200
  const allItems: CustomerListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchCustomers({
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && allItems.length >= total)) {
      break
    }

    pageNum += 1
  }

  return dedupeByUuid(allItems)
}

async function fetchAllInspectionServices(customerUuid: string) {
  const pageSize = 200
  const allItems: InspectionServiceListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchInspectionServices({
      CustomerUuid: customerUuid,
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && allItems.length >= total)) {
      break
    }

    pageNum += 1
  }

  return dedupeByUuid(allItems)
}

function mapCustomerOption(item: CustomerListItem): CustomerOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.CorpName) || `客户 ${normalizeText(item.Id) || "-"}`,
  }
}

function mapServiceOption(item: InspectionServiceListItem): ServiceOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.Name) || `服务 ${normalizeText(item.Id) || "-"}`,
  }
}

function dedupeByUuid<T extends { Uuid?: unknown }>(items: T[]) {
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

function normalizeText(value: unknown) {
  if (typeof value === "string") {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return ""
}

function parsePositiveInteger(value: unknown) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

function parseCycleType(value: unknown) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return null
  }

  return parsed
}

function toApiDateTime(value: string) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return undefined
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized.replace("T", " ")}:00`
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized.replace("T", " ")
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized} 00:00:00`
  }

  return normalized
}

function toDatePickerInput(value: string) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return ""
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized.slice(0, 16).replace(" ", "T")
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return normalized.slice(0, 10)
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }

  return ""
}

function resetLocalStateForRoute() {
  loadError.value = ""
  customerOptions.value = []
  serviceOptions.value = []
  loadedServicesCustomerUuid.value = ""
  Object.assign(form, {
    ...createEmptyForm(),
    customerUuid: queryCustomerUuid.value,
    serviceUuid: queryServiceUuid.value,
    name: queryName.value,
    cycleType: normalizeCycleTypeInput(queryCycleType.value),
    duration: queryDuration.value,
    firstTime: toDatePickerInput(queryFirstTime.value),
    endTime: toDatePickerInput(queryEndTime.value),
  })
  initialFormState.value = { ...form }
}

function normalizeCycleTypeInput(value: string) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return ""
  }

  if (cycleTypeLabelByValue.has(normalized)) {
    return normalized
  }

  const legacyValueByLabel: Record<string, string> = {
    天: "1",
    季: "2",
    季度: "2",
    月: "3",
    半年: "4",
    年: "5",
  }

  return legacyValueByLabel[normalized] ?? ""
}

onMounted(() => {
  resetLocalStateForRoute()
  void loadInitialOptions()

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
  () => form.customerUuid,
  (customerUuid, previousCustomerUuid) => {
    if (suppressCustomerWatch || customerUuid === previousCustomerUuid) {
      return
    }

    form.serviceUuid = ""
    void loadServicesForCustomer(customerUuid)
  },
)

watch(
  () => form.serviceUuid,
  (serviceUuid) => {
    if (!serviceUuid || normalizeText(form.name)) {
      return
    }

    const service = serviceOptions.value.find(item => item.uuid === serviceUuid)

    if (service?.name) {
      form.name = `${service.name}计划`
    }
  },
)

watch(
  () => [route.query.customerUuid, route.query.serviceUuid, route.query.name, route.query.cycleType, route.query.duration, route.query.firstTime, route.query.endTime] as const,
  () => {
    suppressCustomerWatch = true
    resetLocalStateForRoute()
    void loadInitialOptions().finally(() => {
      suppressCustomerWatch = false
    })
  },
)
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      title="添加检测计划"
      :primary-action="{ label: submitButtonLabel, icon: 'ri-add-line', disabled: !canSubmit }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: '当前已填写的检测计划信息都会被清空，此操作不可撤销。' }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="loadError" variant="destructive">
      <AlertTitle>检测计划表单初始化失败</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        <span>{{ loadError }}</span>
        <Button size="sm" variant="outline" @click="loadInitialOptions">
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
          >
            <Select v-model="form.customerUuid" :disabled="customerLoading || !customerOptions.length">
              <SelectTrigger id="inspection-plan-customer" class="w-full" @focus="handleFocus('section-customer')">
                <SelectValue :placeholder="customerLoading ? '正在加载客户...' : '请选择所属客户'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="customer in customerOptions" :key="customer.uuid" :value="customer.uuid">
                  {{ customer.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-service"
            quick-nav-label="关联服务"
            label="关联服务"
          >
            <Select v-model="form.serviceUuid" :disabled="serviceLoading || !serviceOptions.length">
              <SelectTrigger id="inspection-plan-service" class="w-full" @focus="handleFocus('section-service')">
                <SelectValue :placeholder="serviceLoading ? '正在加载服务...' : '请选择关联服务'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="service in serviceOptions" :key="service.uuid" :value="service.uuid">
                  {{ service.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-name"
            quick-nav-label="计划名称"
            label="计划名称"
            label-for="inspection-plan-name"
          >
            <Input
              id="inspection-plan-name"
              v-model="form.name"
              required
              placeholder="请输入计划名称"
              class="w-full"
              @focus="handleFocus('section-name')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-cycle-type"
            quick-nav-label="周期类型"
            label="周期类型"
          >
            <Select v-model="form.cycleType">
              <SelectTrigger id="inspection-plan-cycle-type" class="w-full" @focus="handleFocus('section-cycle-type')">
                <SelectValue placeholder="请选择周期类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="cycleType in CYCLE_TYPE_OPTIONS" :key="cycleType.value" :value="cycleType.value">
                  {{ cycleType.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-duration"
            quick-nav-label="执行频率"
            label="执行频率"
            description="请输入正整数，和周期类型一起组成执行规则。"
            label-for="inspection-plan-duration"
          >
            <Input
              id="inspection-plan-duration"
              v-model="form.duration"
              required
              type="number"
              min="1"
              step="1"
              placeholder="请输入执行频率"
              class="w-full"
              @focus="handleFocus('section-duration')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-first-time"
            quick-nav-label="首次执行时间"
            label="首次执行时间"
            label-for="inspection-plan-first-time"
          >
            <FormDatePicker
              id="inspection-plan-first-time"
              v-model="form.firstTime"
              placeholder="请选择首次执行时间"
              @focus="handleFocus('section-first-time')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-end-time"
            quick-nav-label="计划结束时间"
            label="计划结束时间"
            description="选填，不填则按后端默认规则处理。"
            label-for="inspection-plan-end-time"
            last
          >
            <FormDatePicker
              id="inspection-plan-end-time"
              v-model="form.endTime"
              placeholder="请选择计划结束时间"
              @focus="handleFocus('section-end-time')"
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
