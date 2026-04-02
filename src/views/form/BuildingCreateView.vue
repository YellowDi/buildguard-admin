<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import FormDatePicker from "@/components/form/FormDatePicker.vue"
import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
import MapLocationDialog from "@/components/map/MapLocationDialog.vue"
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
import { hasValidLatLng } from "@/lib/map-coordinates"
import { createBuilding, fetchBuildings, updateBuilding } from "@/lib/buildings-api"
import { fetchCustomers } from "@/lib/customers-api"
import { fetchParks, type ParkListItem } from "@/lib/parks-api"

type QuickNavItem = {
  id: string
  label: string
}

type BuildingFormState = {
  customerUuid: string
  parkUuid: string
  name: string
  builtTime: string
  operationTime: string
  buildArea: string
  contact: string
  contactPhone: string
  latitude: string
  longitude: string
  address: string
}

type ParkOption = {
  uuid: string
  name: string
}

type CustomerOption = {
  uuid: string
  name: string
}

function createEmptyForm(): BuildingFormState {
  return {
    customerUuid: "",
    parkUuid: "",
    name: "",
    builtTime: "",
    operationTime: "",
    buildArea: "",
    contact: "",
    contactPhone: "",
    latitude: "",
    longitude: "",
    address: "",
  }
}

const router = useRouter()
const route = useRoute()
const form = reactive<BuildingFormState>(createEmptyForm())
const initialFormState = ref<BuildingFormState>(createEmptyForm())
const submitting = ref(false)
const loadError = ref("")
const customerName = ref("")
const customerOptions = ref<CustomerOption[]>([])
const customerLoading = ref(false)
const parkOptions = ref<ParkOption[]>([])
const parkLoading = ref(false)
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const formSectionsRef = ref<HTMLElement | null>(null)
const STICKY_HEADER_OFFSET = 112
let observer: IntersectionObserver | null = null
let observerActive = false
const mapPickerOpen = ref(false)

const isEditMode = computed(() => route.name === "building-edit")
const buildingUuid = computed(() => isEditMode.value && typeof route.params.id === "string" ? route.params.id.trim() : "")
const customerUuid = computed(() => (
  isEditMode.value
    ? typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : ""
    : (typeof route.params.id === "string" ? route.params.id.trim() : "") || form.customerUuid
))
const routeCustomerUuid = computed(() => !isEditMode.value && typeof route.params.id === "string" ? route.params.id.trim() : "")
const queryCustomerName = computed(() => typeof route.query.customerName === "string" ? route.query.customerName.trim() : "")
const queryParkUuid = computed(() => typeof route.query.parkUuid === "string" ? route.query.parkUuid.trim() : "")
const pageTitle = computed(() => isEditMode.value ? "编辑建筑" : "添加建筑")
const submitButtonLabel = computed(() => {
  if (submitting.value) {
    return "提交中..."
  }

  return isEditMode.value ? "保存建筑" : "添加建筑"
})
const selectedParkName = computed(() => parkOptions.value.find(item => item.uuid === form.parkUuid)?.name ?? "")
const canSubmit = computed(() =>
  Boolean(
    normalizeText(form.customerUuid)
    && normalizeText(form.parkUuid)
    && normalizeText(form.name)
    && !submitting.value
    && !parkLoading.value,
  ),
)

const buildingFormCoordinateLine = computed(() => {
  if (!hasValidLatLng(form.latitude, form.longitude)) {
    return "暂无经纬度，地图选点后显示"
  }
  return `经度 ${normalizeText(form.longitude)}　纬度 ${normalizeText(form.latitude)}`
})

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

  if (!normalizeText(form.parkUuid)) {
    toast.error("请选择所属园区")
    return
  }

  if (!normalizeText(form.name)) {
    toast.error("请填写建筑名称")
    return
  }

  submitting.value = true

  try {
    const payload = {
      ParkUuid: normalizeText(form.parkUuid),
      Name: normalizeText(form.name),
      BuiltTime: getOptionalText(form.builtTime),
      OperationTime: getOptionalText(form.operationTime),
      BuildArea: getOptionalText(form.buildArea),
      Contact: getOptionalText(form.contact),
      ContactPhone: getOptionalText(form.contactPhone),
      Latitude: getOptionalText(form.latitude),
      Longitude: getOptionalText(form.longitude),
      Address: getOptionalText(form.address),
    }
    const result = isEditMode.value
      ? await updateBuilding({
          Uuid: normalizeText(buildingUuid.value),
          ...payload,
        })
      : await createBuilding(payload)

    toast.success(isEditMode.value ? "建筑信息已更新" : "建筑已创建", {
      description: isEditMode.value
        ? "建筑信息已保存。"
        : result.Uuid
          ? `建筑 UUID：${result.Uuid}`
          : `已提交到接口，所属园区：${selectedParkName.value || "当前园区"}`,
    })

    await router.push({
      name: "customer-detail",
      params: { id: normalizeText(form.customerUuid) },
      query: { tab: "building-assets" },
    })
  } catch (error) {
    handleApiError(error, {
      title: "建筑创建失败",
      fallback: "建筑创建失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  Object.assign(form, initialFormState.value)
}

async function loadFormOptions() {
  loadError.value = ""
  parkOptions.value = []
  const isStandaloneCreate = !isEditMode.value && !routeCustomerUuid.value

  if (isStandaloneCreate && !customerOptions.value.length) {
    customerLoading.value = true

    try {
      const result = await fetchCustomers({ PageNum: 1, PageSize: 1000 })
      const options = result.list
        .map(item => ({
          uuid: normalizeText(item.Uuid),
          name: normalizeText(item.CorpName) || "未命名客户",
        }))
        .filter(item => item.uuid)

      customerOptions.value = options

      if (!options.length) {
        loadError.value = "暂无客户数据，无法创建建筑。"
        initialFormState.value = createEmptyForm()
        return
      }

      if (!options.some(item => item.uuid === form.customerUuid)) {
        form.customerUuid = options[0]?.uuid ?? ""
      }
    } catch (error) {
      loadError.value = handleApiError(error, {
        mode: "silent",
        fallback: "客户列表加载失败，请稍后重试。",
      })
      return
    } finally {
      customerLoading.value = false
    }
  }

  if (!customerUuid.value) {
    loadError.value = isEditMode.value ? "所属客户信息缺失，无法编辑建筑。" : "所属客户信息缺失，无法创建建筑。"
    return
  }

  if (isEditMode.value && !buildingUuid.value) {
    loadError.value = "建筑 Uuid 缺失，无法加载编辑表单。"
    return
  }

  form.customerUuid = customerUuid.value
  customerName.value = isStandaloneCreate
    ? customerOptions.value.find(item => item.uuid === customerUuid.value)?.name ?? ""
    : queryCustomerName.value || "当前客户"
  parkLoading.value = true

  try {
    const parks = await fetchAllParks(customerUuid.value)
    const options = parks
      .map(item => mapParkOption(item))
      .filter(item => item.uuid)

    parkOptions.value = options

    if (!options.length) {
      loadError.value = isEditMode.value ? "当前客户下暂无园区，无法编辑建筑。" : "当前客户下暂无园区，无法创建建筑。请先添加园区。"
      initialFormState.value = {
        ...createEmptyForm(),
        customerUuid: customerUuid.value,
      }
      return
    }

    let preferredParkUuid = options.some(item => item.uuid === queryParkUuid.value)
      ? queryParkUuid.value
      : options[0]?.uuid ?? ""

    if (isEditMode.value) {
      const detail = await fetchBuildingDetail(buildingUuid.value, preferredParkUuid)
      const buildingParkUuid = normalizeText(detail.ParkUuid)

      if (buildingParkUuid && options.some(item => item.uuid === buildingParkUuid)) {
        preferredParkUuid = buildingParkUuid
      }

      const nextState = {
        customerUuid: customerUuid.value,
        parkUuid: preferredParkUuid,
        name: normalizeText(detail.Name),
        builtTime: normalizeText(detail.BuiltTime),
        operationTime: normalizeText(detail.OperationTime),
        buildArea: normalizeText(detail.BuildingArea ?? detail.BuildArea),
        contact: normalizeText(detail.ContactPerson ?? detail.Contact),
        contactPhone: normalizeText(detail.ContactPhone),
        latitude: normalizeText(detail.Latitude),
        longitude: normalizeText(detail.Longitude),
        address: normalizeText(detail.Address),
      }

      Object.assign(form, nextState)
      initialFormState.value = { ...nextState }
      customerName.value = queryCustomerName.value || "当前客户"
      return
    }

    form.parkUuid = preferredParkUuid
    initialFormState.value = {
      ...createEmptyForm(),
      customerUuid: customerUuid.value,
      parkUuid: preferredParkUuid,
    }
  } catch (error) {
    Object.assign(form, createEmptyForm())
    initialFormState.value = createEmptyForm()
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "园区列表加载失败，请稍后重试。",
    })
  } finally {
    parkLoading.value = false
  }
}

async function fetchAllParks(nextCustomerUuid: string) {
  const pageSize = 200
  const allItems: ParkListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchParks({
      CustomerUuid: nextCustomerUuid,
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

  return allItems
}

async function fetchBuildingDetail(nextBuildingUuid: string, nextParkUuid: string) {
  const result = await fetchBuildings({ ParkUuid: nextParkUuid })
  const currentBuilding = result.list.find(item => normalizeText(item.Uuid) === nextBuildingUuid)

  if (!currentBuilding) {
    throw new Error("未找到该建筑信息。")
  }

  return currentBuilding
}

function mapParkOption(item: ParkListItem): ParkOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.Name) || "未命名园区",
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
  customerName.value = ""
  loadError.value = ""
  customerOptions.value = []
  parkOptions.value = []
  Object.assign(form, createEmptyForm())

  if (customerUuid.value) {
    form.customerUuid = customerUuid.value
    customerName.value = queryCustomerName.value || "当前客户"
    initialFormState.value = {
      ...createEmptyForm(),
      customerUuid: customerUuid.value,
    }
    return
  }

  initialFormState.value = createEmptyForm()
}

onMounted(() => {
  resetLocalStateForRoute()
  void loadFormOptions()

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
  () => [route.name, route.params.id, route.query.customerName, route.query.parkUuid, route.query.customerUuid] as const,
  () => {
    resetLocalStateForRoute()
    void loadFormOptions()
  },
)

watch(
  () => form.customerUuid,
  (nextCustomerUuid, previousCustomerUuid) => {
    if (isEditMode.value || routeCustomerUuid.value || !nextCustomerUuid || nextCustomerUuid === previousCustomerUuid) {
      return
    }

    customerName.value = customerOptions.value.find(item => item.uuid === nextCustomerUuid)?.name ?? ""
    void loadFormOptions()
  },
)
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      :title="pageTitle"
      :primary-action="{ label: submitButtonLabel, icon: isEditMode ? 'ri-save-line' : 'ri-add-line', disabled: !canSubmit }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: isEditMode ? '当前已修改的建筑信息将恢复为最近一次加载的内容，此操作不可撤销。' : '当前已填写的建筑信息都会被清空，此操作不可撤销。' }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="loadError" variant="destructive">
      <AlertTitle>建筑表单初始化失败</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        <span>{{ loadError }}</span>
        <Button size="sm" variant="outline" class="gap-2" @click="loadFormOptions">
          <i class="ri-refresh-line text-sm" />
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
            label-for="building-customer"
          >
            <Input
              v-if="routeCustomerUuid || isEditMode"
              id="building-customer"
              :model-value="customerName || '当前客户'"
              disabled
              class="w-full"
              @focus="handleFocus('section-customer')"
            />
            <Select v-else v-model="form.customerUuid" :disabled="customerLoading || !customerOptions.length">
              <SelectTrigger id="building-customer" class="w-full" @focus="handleFocus('section-customer')">
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
            id="section-park"
            quick-nav-label="所属园区"
            label="所属园区"
          >
            <Select v-model="form.parkUuid" :disabled="parkLoading || !parkOptions.length">
              <SelectTrigger id="building-park" class="w-full" @focus="handleFocus('section-park')">
                <SelectValue :placeholder="parkLoading ? '正在加载园区...' : '请选择所属园区'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="park in parkOptions" :key="park.uuid" :value="park.uuid">
                  {{ park.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-name"
            quick-nav-label="建筑名称"
            label="建筑名称"
            label-for="building-name"
          >
            <Input
              id="building-name"
              v-model="form.name"
              required
              placeholder="请输入建筑名称"
              class="w-full"
              @focus="handleFocus('section-name')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-built-time"
            quick-nav-label="建成时间"
            label="建成时间"
            label-for="building-built-time"
          >
            <FormDatePicker
              id="building-built-time"
              v-model="form.builtTime"
              placeholder="请选择建成时间"
              @focus="handleFocus('section-built-time')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-operation-time"
            quick-nav-label="投入运营时间"
            label="投入运营时间"
            label-for="building-operation-time"
          >
            <FormDatePicker
              id="building-operation-time"
              v-model="form.operationTime"
              placeholder="请选择投入运营时间"
              @focus="handleFocus('section-operation-time')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-contact"
            quick-nav-label="联系人"
            label="联系人"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <Input
                v-model="form.contact"
                placeholder="请输入联系人"
                class="w-full"
                @focus="handleFocus('section-contact')"
              />
              <Input
                v-model="form.contactPhone"
                type="tel"
                inputmode="tel"
                placeholder="请输入联系电话"
                class="w-full"
                @focus="handleFocus('section-contact')"
              />
            </div>
          </FormFieldSection>

          <FormFieldSection
            id="section-area"
            quick-nav-label="建筑面积"
            label="建筑面积"
            label-for="building-build-area"
          >
            <Input
              id="building-build-area"
              v-model="form.buildArea"
              placeholder="请输入建筑面积"
              class="w-full"
              @focus="handleFocus('section-area')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-address"
            quick-nav-label="地址"
            label="地址"
            label-for="building-address"
            align="start"
            last
          >
            <div class="relative overflow-hidden rounded-lg border border-border/80 bg-background shadow-xs">
              <Textarea
                id="building-address"
                v-model="form.address"
                placeholder="请输入建筑地址，可点击右下角在地图选点自动填写"
                class="min-h-[120px] w-full resize-y border-0 bg-transparent px-3 pb-12 pt-2.5 text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
                @focus="handleFocus('section-address')"
              />
              <div
                class="pointer-events-none absolute bottom-2 left-2 right-2 z-10 flex min-h-8 items-center justify-between gap-2 sm:left-3 sm:right-3"
              >
                <p class="pointer-events-none min-w-0 flex-1 truncate text-left text-[11px] leading-tight text-muted-foreground tabular-nums sm:text-xs">
                  {{ buildingFormCoordinateLine }}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="pointer-events-auto h-8 shrink-0 gap-1 rounded-md px-2.5 text-xs shadow-sm"
                  @click.stop="mapPickerOpen = true"
                >
                  <i class="ri-map-pin-line text-[15px]" />
                  地图选点
                </Button>
              </div>
            </div>
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

  <MapLocationDialog
    v-model:open="mapPickerOpen"
    title="地图选点"
    pickable
    fill-address-on-pick
    :latitude="form.latitude"
    :longitude="form.longitude"
    @update:latitude="form.latitude = $event"
    @update:longitude="form.longitude = $event"
    @update:address="form.address = $event"
  />
</template>
