<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
import MonitoringPlayer from "@/components/monitoring/MonitoringPlayer.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useFormRequiredValidation } from "@/composables/useFormRequiredValidation"
import { handleApiError } from "@/lib/api-errors"
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import { fetchMonitoringAssetDevices } from "@/lib/monitoring-assets-api"
import {
  createMonitoringLocalDeviceId,
  getMonitoringDeviceById,
  MONITORING_FALLBACK_STREAM_URL,
  MONITORING_PRIMARY_STREAM_URL,
  saveMonitoringLocalDevice,
  type MonitoringDeviceRecord,
  type MonitoringDeviceStatus,
} from "@/lib/monitoring-mock"
import { fetchParks, type ParkListItem } from "@/lib/parks-api"

type QuickNavItem = {
  id: string
  label: string
}

type SelectOption = {
  uuid: string
  name: string
}

type ParkOption = SelectOption & {
  customerUuid: string
}

type BuildingOption = SelectOption & {
  customerUuid: string
  parkUuid: string
}

type MonitoringDeviceFormState = {
  deviceName: string
  deviceId: string
  platform: string
  status: MonitoringDeviceStatus | ""
  customerUuid: string
  parkUuid: string
  buildingUuid: string
  streamUrl: string
  fallbackStreamUrl: string
  remark: string
}

const MONITORING_ASSET_PAGE_SIZE = 1000
const STICKY_HEADER_OFFSET = 112

const monitoringStatusFormOptions: Array<{ value: MonitoringDeviceStatus; label: string }> = [
  { value: "online", label: "在线" },
  { value: "unstable", label: "波动" },
  { value: "offline", label: "离线" },
]

const quickNavItems: QuickNavItem[] = [
  { id: "section-device-name", label: "设备名称" },
  { id: "section-device-id", label: "设备编号" },
  { id: "section-platform", label: "接入平台" },
  { id: "section-status", label: "设备状态" },
  { id: "section-customer", label: "客户" },
  { id: "section-park", label: "园区" },
  { id: "section-building", label: "建筑" },
  { id: "section-stream", label: "主流地址" },
  { id: "section-fallback-stream", label: "备用流地址" },
  { id: "section-remark", label: "备注" },
]

const router = useRouter()
const route = useRoute()
const form = reactive<MonitoringDeviceFormState>(createEmptyForm())
const initialFormState = ref<MonitoringDeviceFormState>(createEmptyForm())
const customerOptions = ref<SelectOption[]>([])
const allParkOptions = ref<ParkOption[]>([])
const allBuildingOptions = ref<BuildingOption[]>([])
const loadingContext = ref(false)
const submitting = ref(false)
const contextError = ref("")
const activeNavId = ref(quickNavItems[0]?.id ?? "")
const previewVisible = ref(false)
const previewKey = ref(0)
let latestRequestId = 0
let hydratingForm = false

const isEditMode = computed(() => route.name === "monitoring-edit")
const routeDeviceId = computed(() => {
  const rawId = route.params.id
  return Array.isArray(rawId) ? rawId[0] ?? "" : rawId ?? ""
})
const pageTitle = computed(() => isEditMode.value ? "编辑监控设备" : "添加监控设备")
const submitButtonLabel = computed(() => submitting.value ? "提交中..." : pageTitle.value)
const selectedCustomerName = computed(() => customerOptions.value.find(item => item.uuid === form.customerUuid)?.name ?? "")
const selectedParkName = computed(() => parkOptions.value.find(item => item.uuid === form.parkUuid)?.name ?? "")
const selectedBuildingName = computed(() => buildingOptions.value.find(item => item.uuid === form.buildingUuid)?.name ?? "")
const parkOptions = computed(() => (
  allParkOptions.value.filter(park => !form.customerUuid || park.customerUuid === form.customerUuid)
))
const buildingOptions = computed(() => (
  allBuildingOptions.value.filter(building =>
    (!form.customerUuid || building.customerUuid === form.customerUuid)
    && (!form.parkUuid || building.parkUuid === form.parkUuid),
  )
))
const {
  isRequiredFieldInvalid,
  validateRequiredFields,
} = useFormRequiredValidation(() => [
  { id: "section-device-name", isComplete: () => Boolean(normalizeText(form.deviceName)) },
  { id: "section-device-id", isComplete: () => Boolean(normalizeText(form.deviceId)) },
  { id: "section-platform", isComplete: () => Boolean(normalizeText(form.platform)) },
  { id: "section-status", isComplete: () => Boolean(normalizeText(form.status)) },
  { id: "section-customer", isComplete: () => Boolean(normalizeText(form.customerUuid)) },
  { id: "section-park", isComplete: () => Boolean(normalizeText(form.parkUuid)) },
  { id: "section-building", isComplete: () => Boolean(normalizeText(form.buildingUuid)) },
  { id: "section-stream", isComplete: () => Boolean(normalizeText(form.streamUrl)) },
])
const isSubmitLocked = computed(() => loadingContext.value || submitting.value)

onMounted(() => {
  void loadFormContext()
})

watch(
  () => route.fullPath,
  () => {
    void loadFormContext()
  },
)

watch(
  () => form.customerUuid,
  () => {
    if (hydratingForm) return
    form.parkUuid = ""
    form.buildingUuid = ""
    previewVisible.value = false
  },
)

watch(
  () => form.parkUuid,
  () => {
    if (hydratingForm) return
    form.buildingUuid = ""
    previewVisible.value = false
  },
)

watch(
  () => [form.streamUrl, form.fallbackStreamUrl],
  () => {
    if (!hydratingForm) {
      previewVisible.value = false
    }
  },
)

async function loadFormContext() {
  const requestId = ++latestRequestId
  loadingContext.value = true
  contextError.value = ""
  previewVisible.value = false
  hydrateForm(createEmptyForm())

  try {
    await loadAssetOptions()

    if (requestId !== latestRequestId) {
      return
    }

    if (isEditMode.value) {
      const devices = await fetchMonitoringAssetDevices()
      const currentDevice = devices.find(device => device.id === routeDeviceId.value)
        ?? getMonitoringDeviceById(routeDeviceId.value)

      if (!currentDevice) {
        contextError.value = "未找到当前监控设备，无法编辑。"
        return
      }

      ensureDeviceLocationOptions(currentDevice)
      hydrateForm(createFormFromDevice(currentDevice))
    } else {
      hydrateForm(createFormFromRouteQuery())
    }

    initialFormState.value = cloneFormState(form)
  } catch (error) {
    if (requestId !== latestRequestId) {
      return
    }

    contextError.value = handleApiError(error, {
      title: "监控表单初始化失败",
      fallback: "监控表单初始化失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestRequestId) {
      loadingContext.value = false
    }
  }
}

async function loadAssetOptions() {
  const [customersResult, parksResult, buildingsResult] = await Promise.all([
    fetchCustomers({ PageNum: 1, PageSize: MONITORING_ASSET_PAGE_SIZE }),
    fetchParks({ PageNum: 1, PageSize: MONITORING_ASSET_PAGE_SIZE }),
    fetchBuildings({ PageNum: 1, PageSize: MONITORING_ASSET_PAGE_SIZE }),
  ])

  customerOptions.value = customersResult.list
    .map(mapCustomerOption)
    .filter(isSelectOption)

  allParkOptions.value = parksResult.list
    .map(mapParkOption)
    .filter(isParkOption)

  allBuildingOptions.value = buildingsResult.list
    .map(item => mapBuildingOption(item, allParkOptions.value))
    .filter(isBuildingOption)
}

function createEmptyForm(): MonitoringDeviceFormState {
  return {
    deviceName: "",
    deviceId: "",
    platform: "",
    status: "online",
    customerUuid: "",
    parkUuid: "",
    buildingUuid: "",
    streamUrl: MONITORING_PRIMARY_STREAM_URL,
    fallbackStreamUrl: MONITORING_FALLBACK_STREAM_URL,
    remark: "",
  }
}

function createFormFromDevice(device: MonitoringDeviceRecord): MonitoringDeviceFormState {
  return {
    deviceName: device.deviceName,
    deviceId: device.deviceId,
    platform: device.platform,
    status: device.status,
    customerUuid: device.customerUuid,
    parkUuid: device.parkUuid,
    buildingUuid: device.buildingUuid,
    streamUrl: device.streamUrl,
    fallbackStreamUrl: device.fallbackStreamUrl,
    remark: device.remark ?? "",
  }
}

function createFormFromRouteQuery(): MonitoringDeviceFormState {
  const nextForm = createEmptyForm()
  const queryCustomerUuid = getQueryText("customerUuid")
  const queryCustomerName = getQueryText("customerName")
  const queryParkUuid = getQueryText("parkUuid")
  const queryParkName = getQueryText("parkName")
  const queryBuildingUuid = getQueryText("buildingUuid")
  const queryBuildingName = getQueryText("buildingName")

  if (queryCustomerUuid && queryCustomerName && !customerOptions.value.some(item => item.uuid === queryCustomerUuid)) {
    customerOptions.value.push({ uuid: queryCustomerUuid, name: queryCustomerName })
  }

  if (queryParkUuid && queryParkName && !allParkOptions.value.some(item => item.uuid === queryParkUuid)) {
    allParkOptions.value.push({ uuid: queryParkUuid, name: queryParkName, customerUuid: queryCustomerUuid })
  }

  if (queryBuildingUuid && queryBuildingName && !allBuildingOptions.value.some(item => item.uuid === queryBuildingUuid)) {
    allBuildingOptions.value.push({
      uuid: queryBuildingUuid,
      name: queryBuildingName,
      customerUuid: queryCustomerUuid,
      parkUuid: queryParkUuid,
    })
  }

  if (queryBuildingUuid) {
    const building = allBuildingOptions.value.find(item => item.uuid === queryBuildingUuid)
    nextForm.buildingUuid = building?.uuid ?? queryBuildingUuid
    nextForm.parkUuid = building?.parkUuid ?? queryParkUuid
    nextForm.customerUuid = building?.customerUuid ?? queryCustomerUuid
  } else {
    nextForm.customerUuid = queryCustomerUuid
    nextForm.parkUuid = queryParkUuid
  }

  return nextForm
}

function hydrateForm(nextForm: MonitoringDeviceFormState) {
  hydratingForm = true
  Object.assign(form, nextForm)
  void nextTick(() => {
    hydratingForm = false
  })
}

function handleFocus(sectionId: string) {
  activeNavId.value = sectionId
}

function scrollToSection(id: string) {
  activeNavId.value = id
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
  })
}

function goBack() {
  router.back()
}

function handleReset() {
  hydrateForm(initialFormState.value)
  previewVisible.value = false
}

function handleHeaderAction(key: string) {
  if (key === "test-play") {
    handleTestPlay()
  }
}

function handleTestPlay() {
  if (!normalizeText(form.streamUrl)) {
    toast.error("请先填写主流地址")
    return
  }

  previewKey.value += 1
  previewVisible.value = true
}

async function handleSubmit() {
  if (!validateRequiredFields()) {
    toast.error("请补全必填信息")
    return
  }

  if (isSubmitLocked.value) {
    return
  }

  submitting.value = true

  try {
    const record = buildDeviceRecordFromForm()
    saveMonitoringLocalDevice(record)

    toast.success(isEditMode.value ? "监控设备已更新" : "监控设备已添加", {
      description: "当前为前端本地数据，后续可替换为真实接口提交。",
    })

    await router.push({
      name: "monitoring-detail",
      params: { id: record.id },
    })
  } finally {
    submitting.value = false
  }
}

function buildDeviceRecordFromForm(): MonitoringDeviceRecord {
  const status = form.status || "online"

  return {
    id: isEditMode.value ? routeDeviceId.value : createMonitoringLocalDeviceId(),
    deviceName: normalizeText(form.deviceName),
    platform: normalizeText(form.platform),
    deviceId: normalizeText(form.deviceId),
    customerUuid: normalizeText(form.customerUuid),
    customerName: selectedCustomerName.value || "未关联客户",
    parkUuid: normalizeText(form.parkUuid),
    parkName: selectedParkName.value || "未关联园区",
    buildingUuid: normalizeText(form.buildingUuid),
    buildingName: selectedBuildingName.value || "未关联建筑",
    status,
    statusLabel: getStatusLabel(status),
    streamUrl: normalizeText(form.streamUrl),
    fallbackStreamUrl: normalizeText(form.fallbackStreamUrl),
    lastOnlineAt: getCurrentTimestamp(),
    remark: normalizeText(form.remark),
  }
}

function ensureDeviceLocationOptions(device: MonitoringDeviceRecord) {
  if (device.customerUuid && !customerOptions.value.some(item => item.uuid === device.customerUuid)) {
    customerOptions.value.push({ uuid: device.customerUuid, name: device.customerName })
  }

  if (device.parkUuid && !allParkOptions.value.some(item => item.uuid === device.parkUuid)) {
    allParkOptions.value.push({
      uuid: device.parkUuid,
      name: device.parkName,
      customerUuid: device.customerUuid,
    })
  }

  if (device.buildingUuid && !allBuildingOptions.value.some(item => item.uuid === device.buildingUuid)) {
    allBuildingOptions.value.push({
      uuid: device.buildingUuid,
      name: device.buildingName,
      customerUuid: device.customerUuid,
      parkUuid: device.parkUuid,
    })
  }
}

function mapCustomerOption(item: CustomerListItem): SelectOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.CorpName, "未命名客户"),
  }
}

function mapParkOption(item: ParkListItem): ParkOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.Name, "未命名园区"),
    customerUuid: normalizeText(item.CustomerUuid),
  }
}

function mapBuildingOption(item: BuildingListItem, parks: ParkOption[]): BuildingOption {
  const parkUuid = normalizeText(item.ParkUuid)
  const park = parks.find(option => option.uuid === parkUuid)

  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.Name, "未命名建筑"),
    customerUuid: normalizeText(item.CustomerUuid) || park?.customerUuid || "",
    parkUuid,
  }
}

function isSelectOption(option: SelectOption) {
  return Boolean(option.uuid && option.name)
}

function isParkOption(option: ParkOption) {
  return Boolean(option.uuid && option.name)
}

function isBuildingOption(option: BuildingOption) {
  return Boolean(option.uuid && option.name)
}

function cloneFormState(value: MonitoringDeviceFormState): MonitoringDeviceFormState {
  return { ...value }
}

function getStatusLabel(status: MonitoringDeviceStatus) {
  return monitoringStatusFormOptions.find(option => option.value === status)?.label ?? "在线"
}

function getQueryText(key: string) {
  const value = route.query[key]
  return Array.isArray(value) ? normalizeText(value[0]) : normalizeText(value)
}

function getCurrentTimestamp() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function normalizeText(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value.trim() || fallback
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      :title="pageTitle"
      :primary-action="{ label: submitButtonLabel, icon: isEditMode ? 'ri-save-3-line' : 'ri-radar-line', disabled: isSubmitLocked }"
      :secondary-actions="[
        { key: 'test-play', label: '测试播放', icon: 'ri-play-circle-line' },
        { key: 'reset', label: '重置表单' },
      ]"
      :reset-dialog="{ description: '当前已填写的监控设备信息都会恢复到初始状态，此操作不可撤销。' }"
      @back="goBack"
      @action="handleHeaderAction"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="contextError" variant="destructive">
      <AlertTitle>监控表单加载失败</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        <span>{{ contextError }}</span>
        <Button size="sm" variant="outline" class="gap-2" @click="loadFormContext">
          <i class="ri-refresh-line text-sm" />
          重试
        </Button>
      </AlertDescription>
    </Alert>

    <Alert v-else>
      <AlertTitle>前端流程准备</AlertTitle>
      <AlertDescription>
        当前表单先使用前端本地数据保存，字段保持通用命名；后续平台字段明确后替换提交接口即可。
      </AlertDescription>
    </Alert>

    <div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]">
      <div class="min-w-0 space-y-5">
        <form class="min-w-0 space-y-0" @submit.prevent="handleSubmit">
          <FormFieldSection
            id="section-device-name"
            quick-nav-label="设备名称"
            label="设备名称"
            label-for="monitoring-device-name"
            description="用于列表和详情页展示，建议包含位置和摄像机类型。"
            required
            :invalid="isRequiredFieldInvalid('section-device-name')"
          >
            <Input
              id="monitoring-device-name"
              v-model="form.deviceName"
              required
              :disabled="loadingContext"
              placeholder="例如：南门出入口枪机"
              class="w-full"
              @focus="handleFocus('section-device-name')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-device-id"
            quick-nav-label="设备编号"
            label="设备编号"
            label-for="monitoring-device-id"
            description="前端先使用通用设备编号，不绑定具体厂商字段。"
            required
            :invalid="isRequiredFieldInvalid('section-device-id')"
          >
            <Input
              id="monitoring-device-id"
              v-model="form.deviceId"
              required
              :disabled="loadingContext"
              placeholder="例如：MON-HIK-ENTRY-001"
              class="w-full"
              @focus="handleFocus('section-device-id')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-platform"
            quick-nav-label="接入平台"
            label="接入平台"
            label-for="monitoring-platform"
            description="先允许自由输入，后续可替换为客户平台字典。"
            required
            :invalid="isRequiredFieldInvalid('section-platform')"
          >
            <Input
              id="monitoring-platform"
              v-model="form.platform"
              required
              :disabled="loadingContext"
              placeholder="例如：海康互联 / 萤石云 / 自定义平台"
              class="w-full"
              @focus="handleFocus('section-platform')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-status"
            quick-nav-label="设备状态"
            label="设备状态"
            label-for="monitoring-status"
            required
            :invalid="isRequiredFieldInvalid('section-status')"
          >
            <Select v-model="form.status" :disabled="loadingContext">
              <SelectTrigger id="monitoring-status" class="w-full" @focus="handleFocus('section-status')">
                <SelectValue placeholder="请选择设备状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in monitoringStatusFormOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-customer"
            quick-nav-label="客户"
            label="客户"
            label-for="monitoring-customer"
            description="使用现有真实客户数据，保存时记录客户 UUID 和名称。"
            required
            :invalid="isRequiredFieldInvalid('section-customer')"
          >
            <Select v-model="form.customerUuid" :disabled="loadingContext || !customerOptions.length">
              <SelectTrigger id="monitoring-customer" class="w-full" @focus="handleFocus('section-customer')">
                <SelectValue :placeholder="loadingContext ? '正在加载客户...' : customerOptions.length ? '请选择客户' : '暂无客户数据'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="customer in customerOptions" :key="customer.uuid" :value="customer.uuid">
                  {{ customer.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-park"
            quick-nav-label="园区"
            label="园区"
            label-for="monitoring-park"
            description="选择客户后只展示该客户下的园区。"
            required
            :invalid="isRequiredFieldInvalid('section-park')"
          >
            <Select v-model="form.parkUuid" :disabled="loadingContext || !form.customerUuid || !parkOptions.length">
              <SelectTrigger id="monitoring-park" class="w-full" @focus="handleFocus('section-park')">
                <SelectValue :placeholder="!form.customerUuid ? '请先选择客户' : loadingContext ? '正在加载园区...' : parkOptions.length ? '请选择园区' : '当前客户暂无园区'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="park in parkOptions" :key="park.uuid" :value="park.uuid">
                  {{ park.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-building"
            quick-nav-label="建筑"
            label="建筑"
            label-for="monitoring-building"
            description="选择园区后只展示该园区下的建筑。"
            required
            :invalid="isRequiredFieldInvalid('section-building')"
          >
            <Select v-model="form.buildingUuid" :disabled="loadingContext || !form.parkUuid || !buildingOptions.length">
              <SelectTrigger id="monitoring-building" class="w-full" @focus="handleFocus('section-building')">
                <SelectValue :placeholder="!form.parkUuid ? '请先选择园区' : loadingContext ? '正在加载建筑...' : buildingOptions.length ? '请选择建筑' : '当前园区暂无建筑'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="building in buildingOptions" :key="building.uuid" :value="building.uuid">
                  {{ building.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-stream"
            quick-nav-label="主流地址"
            label="主流地址"
            label-for="monitoring-stream"
            description="支持 HLS .m3u8 地址，用于详情页播放器。"
            align="start"
            required
            :invalid="isRequiredFieldInvalid('section-stream')"
          >
            <Input
              id="monitoring-stream"
              v-model="form.streamUrl"
              required
              :disabled="loadingContext"
              placeholder="请输入 HLS 主流地址"
              class="w-full"
              @focus="handleFocus('section-stream')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-fallback-stream"
            quick-nav-label="备用流地址"
            label="备用流地址"
            label-for="monitoring-fallback-stream"
            description="主流不可用时播放器会自动尝试备用流。"
            align="start"
          >
            <Input
              id="monitoring-fallback-stream"
              v-model="form.fallbackStreamUrl"
              :disabled="loadingContext"
              placeholder="请输入 HLS 备用流地址"
              class="w-full"
              @focus="handleFocus('section-fallback-stream')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-remark"
            quick-nav-label="备注"
            label="备注"
            label-for="monitoring-remark"
            align="start"
            last
          >
            <Textarea
              id="monitoring-remark"
              v-model="form.remark"
              :disabled="loadingContext"
              rows="4"
              placeholder="填写安装位置、接入说明或后续接口备注"
              class="min-h-24 resize-y"
              @focus="handleFocus('section-remark')"
            />
          </FormFieldSection>
        </form>

        <section v-if="previewVisible" class="space-y-3 border-t border-border pt-5">
          <div class="flex min-w-0 items-center justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate text-sm font-semibold text-foreground">测试播放</h2>
              <p class="mt-1 truncate text-xs text-muted-foreground">
                当前使用表单里的主流地址和备用流地址进行前端验证。
              </p>
            </div>
            <Button size="sm" variant="outline" class="h-8 gap-1 px-3 text-[14px]" @click="handleTestPlay">
              <i class="ri-refresh-line text-base" />
              重试
            </Button>
          </div>

          <MonitoringPlayer
            :key="previewKey"
            :src="form.streamUrl"
            :fallback-src="form.fallbackStreamUrl"
            :title="form.deviceName || '监控测试画面'"
          />
        </section>
      </div>

      <FormQuickNav
        class="hidden lg:sticky lg:top-24 lg:block lg:self-start"
        :active-id="activeNavId"
        :items="quickNavItems"
        @select="scrollToSection"
      />
    </div>
  </section>
</template>
