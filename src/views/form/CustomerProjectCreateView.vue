<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
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
import { useFormRequiredValidation } from "@/composables/useFormRequiredValidation"
import { handleApiError } from "@/lib/api-errors"
import { fetchCustomers } from "@/lib/customers-api"
import {
  createInspectionProject,
  fetchInspectionProjectDetail,
  updateInspectionProject,
  type InspectionProjectRecord,
} from "@/lib/inspection-projects-api"

type CustomerOption = {
  uuid: string
  name: string
}

type CustomerProjectFormState = {
  name: string
  customerUuid: string
  customerName: string
  address: string
  projectTime: string
  duration: string
  introduction: string
}

type QuickNavItem = {
  id: string
  label: string
}

const CUSTOMER_NONE_VALUE = "__none__"
const CUSTOMER_OPTIONS_PAGE_SIZE = 500

const router = useRouter()
const route = useRoute()
const form = reactive<CustomerProjectFormState>(createEmptyForm())
const initialFormState = ref<CustomerProjectFormState>(createEmptyForm())
const customerOptions = ref<CustomerOption[]>([])
const customerLoading = ref(false)
const loadError = ref("")
const submitting = ref(false)
const editDetail = ref<InspectionProjectRecord | null>(null)
const activeNavId = ref("section-name")

const editingProjectUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const isEditMode = computed(() => Boolean(editingProjectUuid.value))
const formHeaderTitle = computed(() => isEditMode.value ? "编辑客户项目" : "添加客户项目")
const submitButtonLabel = computed(() => {
  if (submitting.value) {
    return isEditMode.value ? "保存中..." : "提交中..."
  }

  return isEditMode.value ? "保存客户项目" : "添加客户项目"
})
const isSubmitLocked = computed(() => submitting.value || customerLoading.value)
const customerSelectValue = computed(() => form.customerUuid || CUSTOMER_NONE_VALUE)
const anchorItems = computed<QuickNavItem[]>(() => {
  const items: QuickNavItem[] = [
    { id: "section-name", label: "项目名称" },
    { id: "section-customer", label: "关联客户" },
  ]

  if (!isEditMode.value) {
    items.push(
      { id: "section-address", label: "项目地址" },
      { id: "section-project-time", label: "项目时间" },
      { id: "section-duration", label: "项目工期" },
      { id: "section-introduction", label: "项目介绍" },
    )
  } else {
    items.push({ id: "section-readonly", label: "只读信息" })
  }

  return items
})

const {
  isRequiredFieldInvalid,
  validateRequiredFields,
} = useFormRequiredValidation(() => [
  { id: "section-name", isComplete: () => Boolean(normalizeText(form.name)) },
])

watch(
  () => [route.name, route.params.id] as const,
  () => {
    void loadInitialData()
  },
  { immediate: true },
)

function createEmptyForm(): CustomerProjectFormState {
  return {
    name: "",
    customerUuid: "",
    customerName: "",
    address: "",
    projectTime: "",
    duration: "",
    introduction: "",
  }
}

async function loadInitialData() {
  Object.assign(form, createEmptyForm())
  initialFormState.value = createEmptyForm()
  editDetail.value = null
  loadError.value = ""
  customerLoading.value = true

  try {
    const customers = await fetchCustomers({
      PageNum: 1,
      PageSize: CUSTOMER_OPTIONS_PAGE_SIZE,
    })
    customerOptions.value = customers.list
      .map(item => ({
        uuid: normalizeText(item.Uuid),
        name: normalizeText(item.CorpName) || "未命名客户",
      }))
      .filter(item => item.uuid)

    if (isEditMode.value) {
      const detail = await fetchInspectionProjectDetail({ Uuid: editingProjectUuid.value })
      editDetail.value = detail
      applyDetailToForm(detail)
      ensureCustomerOption(detail)
    }

    initialFormState.value = { ...form }
  } catch (error) {
    loadError.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户项目表单初始化失败，请稍后重试。",
    })
  } finally {
    customerLoading.value = false
  }
}

function applyDetailToForm(detail: InspectionProjectRecord) {
  form.name = normalizeText(detail.Name)
  form.customerUuid = normalizeText(detail.CustomerUuid)
  form.customerName = normalizeText(detail.CustomerName)
  form.address = normalizeText(detail.Address)
  form.projectTime = toDatePickerInput(normalizeText(detail.ProjectTime))
  form.duration = normalizeText(detail.Duration)
  form.introduction = normalizeText(detail.Introduction)
}

function ensureCustomerOption(detail: InspectionProjectRecord) {
  const uuid = normalizeText(detail.CustomerUuid)

  if (!uuid || customerOptions.value.some(item => item.uuid === uuid)) {
    return
  }

  customerOptions.value = [
    ...customerOptions.value,
    {
      uuid,
      name: normalizeText(detail.CustomerName, normalizeText(detail.CorpName, "未命名客户")),
    },
  ]
}

async function handleSubmit() {
  if (!validateRequiredFields()) {
    toast.error("请补全必填信息")
    return
  }

  if (isSubmitLocked.value) {
    return
  }

  const name = normalizeText(form.name)
  const duration = parseOptionalPositiveInteger(form.duration)

  if (duration === false) {
    toast.error("项目工期必须是正整数")
    return
  }

  submitting.value = true

  try {
    const customerName = getCustomerName(form.customerUuid, form.customerName)

    if (isEditMode.value) {
      await updateInspectionProject({
        Uuid: editingProjectUuid.value,
        Name: name,
        CustomerUuid: form.customerUuid,
        CustomerName: customerName,
      })
    } else {
      await createInspectionProject({
        Name: name,
        CustomerUuid: form.customerUuid,
        CustomerName: customerName,
        Address: normalizeText(form.address),
        ProjectTime: normalizeText(form.projectTime),
        Duration: duration,
        Introduction: normalizeText(form.introduction),
      })
    }

    toast.success(isEditMode.value ? "客户项目已保存" : "客户项目已添加")
    await router.push({ name: "customer-projects" })
  } catch (error) {
    handleApiError(error, {
      title: isEditMode.value ? "客户项目保存失败" : "客户项目添加失败",
      fallback: isEditMode.value ? "客户项目保存失败，请稍后重试。" : "客户项目添加失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  Object.assign(form, initialFormState.value)
}

function handleCustomerChange(value: unknown) {
  const nextValue = normalizeText(value)

  if (!nextValue || nextValue === CUSTOMER_NONE_VALUE) {
    form.customerUuid = ""
    form.customerName = ""
    return
  }

  form.customerUuid = nextValue
  form.customerName = getCustomerName(nextValue)
}

function goBack() {
  router.back()
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

  const top = section.getBoundingClientRect().top + window.scrollY - 112
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
}

function getCustomerName(customerUuid: string, fallback = "") {
  return customerOptions.value.find(item => item.uuid === customerUuid)?.name ?? fallback
}

function formatStatus(value: unknown) {
  const status = toNumber(value)

  if (status === 1) return "进行中"
  if (status === 2) return "已完结"
  return "-"
}

function formatPublicStatus(value: unknown) {
  const status = toNumber(value)

  if (status === 1) return "公开"
  if (status === 2) return "不公开"
  return "-"
}

function parseOptionalPositiveInteger(value: unknown) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : false
}

function normalizeText(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return fallback
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toDatePickerInput(value: string) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return ""
  }

  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[ T].*)?$/)
  return match?.[1] ?? ""
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      :title="formHeaderTitle"
      :primary-action="{ label: submitButtonLabel, icon: isEditMode ? 'ri-save-line' : 'ri-add-line', disabled: isSubmitLocked }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: '当前已填写的客户项目信息都会恢复为初始值，此操作不可撤销。' }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="loadError" variant="destructive">
      <AlertTitle>客户项目表单初始化失败</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        <span>{{ loadError }}</span>
        <Button size="sm" variant="outline" class="gap-2" @click="loadInitialData">
          <i class="ri-refresh-line text-sm" />
          重试
        </Button>
      </AlertDescription>
    </Alert>

    <div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]">
      <form class="min-w-0 space-y-0" @submit.prevent="handleSubmit">
        <FormFieldSection
          id="section-name"
          quick-nav-label="项目名称"
          label="项目名称"
          label-for="customer-project-name"
          required
          :invalid="isRequiredFieldInvalid('section-name')"
        >
          <Input
            id="customer-project-name"
            v-model="form.name"
            required
            placeholder="请输入项目名称"
            class="w-full"
            @focus="handleFocus('section-name')"
          />
        </FormFieldSection>

        <FormFieldSection
          id="section-customer"
          quick-nav-label="关联客户"
          label="关联客户"
          description="可选。选择后会同步提交客户 UUID 和客户名称。"
        >
          <Select
            :model-value="customerSelectValue"
            :disabled="customerLoading"
            @update:model-value="handleCustomerChange"
          >
            <SelectTrigger id="customer-project-customer" class="w-full" @focus="handleFocus('section-customer')">
              <SelectValue :placeholder="customerLoading ? '正在加载客户...' : '请选择关联客户'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="CUSTOMER_NONE_VALUE">不关联客户</SelectItem>
              <SelectItem v-for="customer in customerOptions" :key="customer.uuid" :value="customer.uuid">
                {{ customer.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FormFieldSection>

        <template v-if="!isEditMode">
          <FormFieldSection
            id="section-address"
            quick-nav-label="项目地址"
            label="项目地址"
            label-for="customer-project-address"
          >
            <Input
              id="customer-project-address"
              v-model="form.address"
              placeholder="请输入项目地址"
              class="w-full"
              @focus="handleFocus('section-address')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-project-time"
            quick-nav-label="项目时间"
            label="项目时间"
            label-for="customer-project-time"
          >
            <FormDatePicker
              id="customer-project-time"
              v-model="form.projectTime"
              placeholder="请选择项目时间"
              @focus="handleFocus('section-project-time')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-duration"
            quick-nav-label="项目工期"
            label="项目工期"
            description="请输入项目工期天数（正整数）。"
            label-for="customer-project-duration"
          >
            <Input
              id="customer-project-duration"
              v-model="form.duration"
              type="number"
              min="1"
              step="1"
              placeholder="请输入工期天数"
              class="w-full"
              @focus="handleFocus('section-duration')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-introduction"
            quick-nav-label="项目介绍"
            label="项目介绍"
            label-for="customer-project-introduction"
            align="start"
            last
          >
            <Textarea
              id="customer-project-introduction"
              v-model="form.introduction"
              class="min-h-28 resize-y"
              placeholder="请输入项目介绍"
              @focus="handleFocus('section-introduction')"
            />
          </FormFieldSection>
        </template>

        <FormFieldSection
          v-else
          id="section-readonly"
          quick-nav-label="只读信息"
          label="只读信息"
          description="项目更新接口目前只支持修改项目名称和关联客户。"
          layout="vertical"
          last
        >
          <dl class="grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <div class="min-w-0">
              <dt class="text-muted-foreground">项目地址</dt>
              <dd class="mt-1 truncate font-medium text-foreground">{{ form.address || '-' }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-muted-foreground">项目时间</dt>
              <dd class="mt-1 font-medium text-foreground">{{ form.projectTime || '-' }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-muted-foreground">项目工期</dt>
              <dd class="mt-1 font-medium text-foreground">{{ form.duration ? `${form.duration} 天` : '-' }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-muted-foreground">状态</dt>
              <dd class="mt-1 font-medium text-foreground">
                {{ formatStatus(editDetail?.Status) }} / {{ formatPublicStatus(editDetail?.IsPublic) }}
              </dd>
            </div>
            <div class="min-w-0 sm:col-span-2">
              <dt class="text-muted-foreground">项目介绍</dt>
              <dd class="mt-1 whitespace-pre-wrap font-medium text-foreground">{{ form.introduction || '-' }}</dd>
            </div>
          </dl>
        </FormFieldSection>
      </form>

      <FormQuickNav
        class="hidden lg:sticky lg:top-24 lg:block lg:self-start"
        :active-id="activeNavId"
        :items="anchorItems"
        @select="scrollToSection"
      />
    </div>
  </section>
</template>
