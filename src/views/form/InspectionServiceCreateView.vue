<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import {
  createInspectionService,
  fetchInspectionServices,
  type InspectionServiceListItem,
} from "@/lib/inspection-services-api"

type QuickNavItem = {
  id: string
  label: string
}

type InspectionServiceFormState = {
  customerUuid: string
  name: string
  level: string
  managerName: string
  managerPhone: string
  templateUuid: string
  buildUuids: string[]
  remark: string
}

type CustomerOption = {
  uuid: string
  name: string
}

type TemplateOption = {
  uuid: string
  name: string
}

type BuildOption = {
  uuid: string
  name: string
  parkName: string
}

const DEFAULT_LEVEL_OPTIONS = ["S级", "A级", "B级", "C级"] as const

function createEmptyForm(): InspectionServiceFormState {
  return {
    customerUuid: "",
    name: "",
    level: "",
    managerName: "",
    managerPhone: "",
    templateUuid: "",
    buildUuids: [],
    remark: "",
  }
}

const router = useRouter()
const route = useRoute()
const form = reactive<InspectionServiceFormState>(createEmptyForm())
const initialFormState = ref<InspectionServiceFormState>(createEmptyForm())
const loadError = ref("")
const submitting = ref(false)
const customerLoading = ref(false)
const templateLoading = ref(false)
const buildingLoading = ref(false)
const customerOptions = ref<CustomerOption[]>([])
const templateOptions = ref<TemplateOption[]>([])
const buildingOptions = ref<BuildOption[]>([])
const loadedBuildingsCustomerUuid = ref("")
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const formSectionsRef = ref<HTMLElement | null>(null)
const STICKY_HEADER_OFFSET = 112
let observer: IntersectionObserver | null = null
let observerActive = false

const queryCustomerUuid = computed(() => typeof route.query.customerUuid === "string" ? route.query.customerUuid.trim() : "")
const queryCustomerName = computed(() => typeof route.query.customerName === "string" ? route.query.customerName.trim() : "")
const pageTitle = "添加检测服务"
const selectedCustomerName = computed(() =>
  customerOptions.value.find(item => item.uuid === form.customerUuid)?.name
  || queryCustomerName.value
  || "",
)
const selectedTemplateName = computed(() =>
  templateOptions.value.find(item => item.uuid === normalizeText(form.templateUuid))?.name || "",
)
const levelOptions = computed(() => {
  const detected = new Set<string>()
  const values: string[] = [...DEFAULT_LEVEL_OPTIONS]

  for (const item of inspectionLevelsCache.value) {
    if (!detected.has(item)) {
      detected.add(item)
      values.push(item)
    }
  }

  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
})
const groupedBuildings = computed(() => {
  const groups = new Map<string, BuildOption[]>()

  for (const item of buildingOptions.value) {
    const parkName = item.parkName || "未命名园区"
    const current = groups.get(parkName) ?? []
    current.push(item)
    groups.set(parkName, current)
  }

  return Array.from(groups.entries()).map(([parkName, builds]) => ({
    parkName,
    builds,
  }))
})
const selectedBuildCount = computed(() => form.buildUuids.length)
const canSubmit = computed(() =>
  Boolean(
    normalizeText(form.customerUuid)
    && normalizeText(form.name)
    && normalizeText(form.level)
    && normalizeText(form.managerName)
    && normalizeText(form.managerPhone)
    && normalizeText(form.templateUuid)
    && form.buildUuids.length > 0
    && !submitting.value
    && !customerLoading.value
    && !templateLoading.value
    && !buildingLoading.value,
  ),
)
const submitButtonLabel = computed(() => submitting.value ? "提交中..." : "添加检测服务")
const inspectionLevelsCache = ref<string[]>([])

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
    toast.error("请选择所属客户")
    return
  }

  if (!normalizeText(form.name)) {
    toast.error("请填写服务名称")
    return
  }

  if (!normalizeText(form.level)) {
    toast.error("请填写服务等级")
    return
  }

  if (!normalizeText(form.managerName) || !normalizeText(form.managerPhone)) {
    toast.error("请完善负责人信息")
    return
  }

  if (!normalizeText(form.templateUuid)) {
    toast.error("请填写检测模板 UUID")
    return
  }

  if (!form.buildUuids.length) {
    toast.error("请至少选择一个建筑")
    return
  }

  submitting.value = true

  try {
    const payload = {
      Name: normalizeText(form.name),
      CustomerUuid: normalizeText(form.customerUuid),
      Level: normalizeText(form.level),
      ManagerName: normalizeText(form.managerName),
      ManagerPhone: normalizeText(form.managerPhone),
      TemplateUuid: normalizeText(form.templateUuid),
      BuildUuids: dedupeText(form.buildUuids),
      Remark: getOptionalText(form.remark),
    }
    const result = await createInspectionService(payload)

    toast.success("检测服务已创建", {
      description: result.Uuid
        ? `服务 UUID：${result.Uuid}`
        : `${selectedCustomerName.value || "当前客户"}的检测服务已提交到接口。`,
    })

    await router.push({ name: "inspection-services" })
  } catch (error) {
    handleApiError(error, {
      title: "检测服务创建失败",
      fallback: "检测服务创建失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  Object.assign(form, {
    ...initialFormState.value,
    buildUuids: [...initialFormState.value.buildUuids],
  })
}

async function loadInitialOptions() {
  loadError.value = ""
  customerLoading.value = true
  templateLoading.value = true

  try {
    const [customers, templates] = await Promise.all([
      fetchAllCustomers(),
      fetchAllInspectionServiceTemplates(),
    ])

    customerOptions.value = customers
      .map(mapCustomerOption)
      .filter(item => item.uuid)
    templateOptions.value = templates.options
    inspectionLevelsCache.value = templates.levels

    if (!form.customerUuid) {
      const preferredCustomerUuid = customerOptions.value.some(item => item.uuid === queryCustomerUuid.value)
        ? queryCustomerUuid.value
        : customerOptions.value[0]?.uuid ?? ""

      form.customerUuid = preferredCustomerUuid
    }

    initialFormState.value = {
      ...createEmptyForm(),
      customerUuid: form.customerUuid,
    }

    if (form.customerUuid) {
      await loadBuildingsForCustomer(form.customerUuid)
    }
  } catch (error) {
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "检测服务表单初始化失败，请稍后重试。",
    })
  } finally {
    customerLoading.value = false
    templateLoading.value = false
  }
}

async function loadBuildingsForCustomer(customerUuid: string) {
  if (customerUuid && loadedBuildingsCustomerUuid.value === customerUuid && buildingOptions.value.length) {
    return
  }

  loadError.value = ""
  loadedBuildingsCustomerUuid.value = ""
  buildingOptions.value = []
  form.buildUuids = []

  if (!customerUuid) {
    return
  }

  buildingLoading.value = true

  try {
    const buildings = await fetchAllBuildings(customerUuid)
    buildingOptions.value = buildings
      .map(mapBuildOption)
      .filter(item => item.uuid)
    loadedBuildingsCustomerUuid.value = customerUuid
    initialFormState.value = {
      ...initialFormState.value,
      customerUuid,
      buildUuids: [],
    }
  } catch (error) {
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "所属建筑加载失败，请稍后重试。",
    })
  } finally {
    buildingLoading.value = false
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

async function fetchAllInspectionServiceTemplates() {
  const pageSize = 200
  const allItems: InspectionServiceListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchInspectionServices({
      PageNum: pageNum,
      PageSize: pageSize,
    })

    if (pageNum === 1) {
      total = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (total > 0 && pageNum * pageSize >= total)) {
      break
    }

    pageNum += 1
  }

  const options: TemplateOption[] = []
  const seenTemplateUuids = new Set<string>()
  const levels: string[] = []

  for (const item of allItems) {
    const templateUuid = normalizeText(item.TemplateUuid)
    const templateName = normalizeText(item.TemplateName) || `模板 ${normalizeText(item.TemplateId) || templateUuid || "-"}`
    const level = normalizeText(item.Level)

    if (level) {
      levels.push(level)
    }

    if (!templateUuid || seenTemplateUuids.has(templateUuid)) {
      continue
    }

    seenTemplateUuids.add(templateUuid)
    options.push({
      uuid: templateUuid,
      name: templateName,
    })
  }

  return {
    options,
    levels: dedupeText(levels),
  }
}

async function fetchAllBuildings(customerUuid: string) {
  const pageSize = 200
  const allItems: BuildingListItem[] = []
  let pageNum = 1
  let total = 0

  while (pageNum <= 20) {
    const result = await fetchBuildings({
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

function mapBuildOption(item: BuildingListItem): BuildOption {
  return {
    uuid: normalizeText(item.Uuid),
    name: normalizeText(item.Name) || "未命名建筑",
    parkName: normalizeText(item.ParkName) || "未命名园区",
  }
}

function isBuildChecked(buildUuid: string) {
  return form.buildUuids.includes(buildUuid)
}

function updateBuildChecked(buildUuid: string, checked: boolean | "indeterminate") {
  if (checked === "indeterminate") {
    return
  }

  if (checked) {
    form.buildUuids = dedupeText([...form.buildUuids, buildUuid])
    return
  }

  form.buildUuids = form.buildUuids.filter(item => item !== buildUuid)
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

function dedupeText(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
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
  customerOptions.value = []
  templateOptions.value = []
  buildingOptions.value = []
  loadedBuildingsCustomerUuid.value = ""
  inspectionLevelsCache.value = []
  Object.assign(form, createEmptyForm())

  if (queryCustomerUuid.value) {
    form.customerUuid = queryCustomerUuid.value
  }

  initialFormState.value = {
    ...createEmptyForm(),
    customerUuid: form.customerUuid,
  }
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
    if (customerUuid === previousCustomerUuid) {
      return
    }

    void loadBuildingsForCustomer(customerUuid)
  },
)

watch(
  () => [route.query.customerUuid, route.query.customerName] as const,
  () => {
    resetLocalStateForRoute()
    void loadInitialOptions()
  },
)
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      :title="pageTitle"
      :primary-action="{ label: submitButtonLabel, icon: 'ri-add-line', disabled: !canSubmit }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: '当前已填写的检测服务信息都会被清空，此操作不可撤销。' }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="loadError" variant="destructive">
      <AlertTitle>检测服务表单初始化失败</AlertTitle>
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
              <SelectTrigger id="inspection-service-customer" class="w-full" @focus="handleFocus('section-customer')">
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
            id="section-name"
            quick-nav-label="服务名称"
            label="服务名称"
            label-for="inspection-service-name"
          >
            <Input
              id="inspection-service-name"
              v-model="form.name"
              required
              placeholder="请输入服务名称"
              class="w-full"
              @focus="handleFocus('section-name')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-level"
            quick-nav-label="服务等级"
            label="服务等级"
            description="支持直接输入，也可参考已有等级。"
            label-for="inspection-service-level"
          >
            <div class="space-y-3">
              <Input
                id="inspection-service-level"
                v-model="form.level"
                list="inspection-service-level-options"
                required
                placeholder="请输入服务等级，例如 A级、S级"
                class="w-full"
                @focus="handleFocus('section-level')"
              />
              <datalist id="inspection-service-level-options">
                <option v-for="level in levelOptions" :key="level" :value="level" />
              </datalist>
            </div>
          </FormFieldSection>

          <FormFieldSection
            id="section-template"
            quick-nav-label="检测模板"
            label="检测模板 UUID"
            :description="templateOptions.length ? '可直接输入模板 UUID，输入时会匹配下方已有模板候选。' : '当前未加载到模板候选，请直接输入模板 UUID。'"
            label-for="inspection-service-template"
          >
            <div class="space-y-3">
              <Input
                id="inspection-service-template"
                v-model="form.templateUuid"
                list="inspection-service-template-options"
                required
                :placeholder="templateLoading ? '正在加载模板候选...' : '请输入检测模板 UUID'"
                class="w-full"
                @focus="handleFocus('section-template')"
              />
              <datalist id="inspection-service-template-options">
                <option v-for="template in templateOptions" :key="template.uuid" :value="template.uuid">
                  {{ template.name }}
                </option>
              </datalist>
              <p v-if="selectedTemplateName" class="text-sm text-muted-foreground">
                当前匹配模板：{{ selectedTemplateName }}
              </p>
            </div>
          </FormFieldSection>

          <FormFieldSection
            id="section-manager"
            quick-nav-label="负责人"
            label="负责人"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <Input
                v-model="form.managerName"
                required
                placeholder="请输入负责人姓名"
                class="w-full"
                @focus="handleFocus('section-manager')"
              />
              <Input
                v-model="form.managerPhone"
                required
                type="tel"
                inputmode="tel"
                placeholder="请输入负责人电话"
                class="w-full"
                @focus="handleFocus('section-manager')"
              />
            </div>
          </FormFieldSection>

          <FormFieldSection
            id="section-builds"
            quick-nav-label="服务建筑"
            label="服务建筑"
            :description="selectedCustomerName ? `当前客户：${selectedCustomerName}，已选择 ${selectedBuildCount} 个建筑。` : '请先选择所属客户。'"
            align="start"
          >
            <div class="rounded-xl border border-border bg-card">
              <div class="border-b border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                <template v-if="buildingLoading">
                  正在加载该客户下的建筑...
                </template>
                <template v-else-if="!form.customerUuid">
                  请先选择所属客户。
                </template>
                <template v-else-if="!groupedBuildings.length">
                  当前客户下暂无可选建筑。
                </template>
                <template v-else>
                  勾选要纳入当前检测服务的建筑。
                </template>
              </div>

              <div v-if="groupedBuildings.length" class="divide-y divide-dashed divide-border">
                <section v-for="group in groupedBuildings" :key="group.parkName" class="px-4 py-4">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <div class="text-sm font-medium text-foreground">
                      {{ group.parkName }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ group.builds.length }} 个建筑
                    </div>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <label
                      v-for="build in group.builds"
                      :key="build.uuid"
                      class="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-3 transition-colors hover:border-[#2B67F6]/40 hover:bg-accent/40"
                      @click="handleFocus('section-builds')"
                    >
                      <Checkbox
                        :model-value="isBuildChecked(build.uuid)"
                        class="mt-0.5"
                        @update:model-value="updateBuildChecked(build.uuid, $event)"
                      />
                      <div class="min-w-0">
                        <div class="truncate text-sm font-medium text-foreground">
                          {{ build.name }}
                        </div>
                        <div class="mt-1 text-xs text-muted-foreground">
                          建筑 UUID：{{ build.uuid }}
                        </div>
                      </div>
                    </label>
                  </div>
                </section>
              </div>
            </div>
          </FormFieldSection>

          <FormFieldSection
            id="section-remark"
            quick-nav-label="备注"
            label="备注"
            label-for="inspection-service-remark"
            align="start"
            last
          >
            <Textarea
              id="inspection-service-remark"
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
