<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { toast } from "vue-sonner"

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
import { fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import { createPark } from "@/lib/parks-api"

type QuickNavItem = {
  id: string
  label: string
}

type ParkFormState = {
  customerUuid: string
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

type CustomerOption = {
  uuid: string
  name: string
}

function createEmptyForm(): ParkFormState {
  return {
    customerUuid: "",
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
const form = reactive<ParkFormState>(createEmptyForm())
const submitting = ref(false)
const loadingCustomers = ref(false)
const customerLoadError = ref("")
const customerOptions = ref<CustomerOption[]>([])
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const formSectionsRef = ref<HTMLElement | null>(null)
const STICKY_HEADER_OFFSET = 112
let observer: IntersectionObserver | null = null
let observerActive = false

const canSubmit = computed(() =>
  Boolean(normalizeText(form.customerUuid) && normalizeText(form.name) && !submitting.value && !loadingCustomers.value),
)

function handleFocus(sectionId: string) {
  activeNavId.value = sectionId
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
    toast.error("请选择所属客户")
    return
  }

  if (!normalizeText(form.name)) {
    toast.error("请填写园区名称")
    return
  }

  submitting.value = true

  try {
    const result = await createPark({
      CustomerUuid: normalizeText(form.customerUuid),
      Name: normalizeText(form.name),
      BuiltTime: getOptionalText(form.builtTime),
      OperationTime: getOptionalText(form.operationTime),
      BuildArea: getOptionalText(form.buildArea),
      Contact: getOptionalText(form.contact),
      ContactPhone: getOptionalText(form.contactPhone),
      Latitude: getOptionalText(form.latitude),
      Longitude: getOptionalText(form.longitude),
      Address: getOptionalText(form.address),
    })

    toast.success("园区已创建", {
      description: result.Uuid ? `园区 UUID：${result.Uuid}` : "园区信息已提交到接口。",
    })

    if (result.Uuid) {
      await router.push({
        name: "park-detail",
        params: { id: result.Uuid },
      })
      return
    }

    await router.push({ name: "parks" })
  } catch (error) {
    handleApiError(error, {
      title: "园区创建失败",
      fallback: "园区创建失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  Object.assign(form, createEmptyForm())
}

async function loadCustomerOptions() {
  loadingCustomers.value = true
  customerLoadError.value = ""

  try {
    customerOptions.value = await fetchAllCustomers()
  } catch (error) {
    customerOptions.value = []
    customerLoadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户列表加载失败，请稍后重试。",
    })
  } finally {
    loadingCustomers.value = false
  }
}

async function fetchAllCustomers() {
  const allItems: CustomerListItem[] = []
  const pageSize = 200
  let currentPage = 1
  let totalCount = 0

  while (currentPage <= 20) {
    const result = await fetchCustomers({
      PageNum: currentPage,
      PageSize: pageSize,
    })

    if (currentPage === 1) {
      totalCount = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (totalCount > 0 && allItems.length >= totalCount)) {
      break
    }

    currentPage += 1
  }

  return allItems
    .map(item => ({
      uuid: getCustomerUuid(item),
      name: getCustomerName(item),
    }))
    .filter(item => item.uuid && item.name)
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
}

function getCustomerUuid(item: CustomerListItem) {
  return getFirstText(item, ["Uuid", "uuid", "CustomerUuid"], "")
}

function getCustomerName(item: CustomerListItem) {
  return getFirstText(item, ["CorpName"], "")
}

function getFirstText(value: unknown, keys: string[], fallback = "") {
  if (!value || typeof value !== "object") {
    return fallback
  }

  const record = value as Record<string, unknown>

  for (const key of keys) {
    const text = normalizeText(record[key])

    if (text) {
      return text
    }
  }

  return fallback
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

onMounted(() => {
  void loadCustomerOptions()

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
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      title="添加园区"
      :primary-action="{ label: submitting ? '提交中...' : '添加园区', icon: 'ri-add-line', disabled: !canSubmit }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: '当前已填写的园区信息都会被清空，此操作不可撤销。' }"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="customerLoadError" variant="destructive">
      <AlertTitle>客户列表加载失败</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        <span>{{ customerLoadError }}</span>
        <Button size="sm" variant="outline" @click="loadCustomerOptions">
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
            label-for="park-customer"
          >
            <Select v-model="form.customerUuid" :disabled="loadingCustomers">
              <SelectTrigger id="park-customer" class="w-full" @focus="handleFocus('section-customer')">
                <SelectValue :placeholder="loadingCustomers ? '正在加载客户列表' : '请选择所属客户'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="customer in customerOptions" :key="customer.uuid" :value="customer.uuid">
                  {{ customer.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-name"
            quick-nav-label="园区名称"
            label="园区名称"
            label-for="park-name"
          >
            <Input
              id="park-name"
              v-model="form.name"
              required
              placeholder="请输入园区名称"
              class="w-full"
              @focus="handleFocus('section-name')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-time"
            quick-nav-label="时间信息"
            label="时间信息"
            align="start"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <Input
                v-model="form.builtTime"
                type="date"
                class="w-full"
                @focus="handleFocus('section-time')"
              />
              <Input
                v-model="form.operationTime"
                type="date"
                class="w-full"
                @focus="handleFocus('section-time')"
              />
            </div>
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
            label-for="park-build-area"
          >
            <Input
              id="park-build-area"
              v-model="form.buildArea"
              placeholder="请输入建筑面积"
              class="w-full"
              @focus="handleFocus('section-area')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-location"
            quick-nav-label="坐标"
            label="坐标"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <Input
                v-model="form.latitude"
                placeholder="请输入纬度"
                class="w-full"
                @focus="handleFocus('section-location')"
              />
              <Input
                v-model="form.longitude"
                placeholder="请输入经度"
                class="w-full"
                @focus="handleFocus('section-location')"
              />
            </div>
          </FormFieldSection>

          <FormFieldSection
            id="section-address"
            quick-nav-label="地址"
            label="地址"
            label-for="park-address"
            align="start"
            last
          >
            <Textarea
              id="park-address"
              v-model="form.address"
              placeholder="请输入园区地址"
              class="min-h-[120px] w-full resize-y"
              @focus="handleFocus('section-address')"
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
