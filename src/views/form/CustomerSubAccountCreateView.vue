<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { handleApiError } from "@/lib/api-errors"
import {
  appendCustomerSubAccountLocalRecord,
  createCustomerSubAccount,
} from "@/lib/customer-sub-accounts-api"
import { fetchCustomerDetail } from "@/lib/customers-api"

type QuickNavItem = {
  id: string
  label: string
}

type CustomerSubAccountFormState = {
  customerUuid: string
  name: string
  account: string
  password: string
  phone: string
}

function createEmptyForm(): CustomerSubAccountFormState {
  return {
    customerUuid: "",
    name: "",
    account: "",
    password: "",
    phone: "",
  }
}

const router = useRouter()
const route = useRoute()
const form = reactive<CustomerSubAccountFormState>(createEmptyForm())
const initialFormState = ref<CustomerSubAccountFormState>(createEmptyForm())
const customerName = ref("")
const contextError = ref("")
const submitting = ref(false)
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
    && normalizeText(form.name)
    && normalizeText(form.account)
    && normalizeText(form.password)
    && normalizeText(form.phone)
    && !submitting.value,
  ),
)
const submitButtonLabel = computed(() => submitting.value ? "提交中..." : "添加子账号")

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

  if (!normalizeText(form.name)) {
    toast.error("请填写用户名")
    return
  }

  if (!normalizeText(form.account)) {
    toast.error("请填写账号")
    return
  }

  if (!normalizeText(form.password)) {
    toast.error("请填写密码")
    return
  }

  if (!normalizeText(form.phone)) {
    toast.error("请填写手机号")
    return
  }

  submitting.value = true

  try {
    const payload = {
      Account: normalizeText(form.account),
      Password: normalizeText(form.password),
      Phone: normalizeText(form.phone),
      Name: normalizeText(form.name),
      CustomerUuid: normalizeText(form.customerUuid),
    }
    const result = await createCustomerSubAccount(payload)

    appendCustomerSubAccountLocalRecord(payload.CustomerUuid, {
      id: result.Uuid?.trim() || `${payload.CustomerUuid}-sub-account-${Date.now()}`,
      username: payload.Name,
      account: payload.Account,
      password: payload.Password,
      phone: payload.Phone,
    })

    toast.success("子账号已创建", {
      description: result.Uuid
        ? `子账号 UUID：${result.Uuid}`
        : "子账号信息已提交到接口。",
    })

    await router.push({
      name: "customer-detail",
      params: { id: payload.CustomerUuid },
      query: { tab: "sub-accounts" },
    })
  } catch (error) {
    handleApiError(error, {
      title: "子账号创建失败",
      fallback: "子账号创建失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  Object.assign(form, initialFormState.value)
}

function resetLocalStateForRoute() {
  contextError.value = ""
  customerName.value = ""
  Object.assign(form, createEmptyForm())

  if (routeCustomerUuid.value) {
    form.customerUuid = routeCustomerUuid.value
    initialFormState.value = {
      ...createEmptyForm(),
      customerUuid: routeCustomerUuid.value,
    }
    return
  }

  initialFormState.value = createEmptyForm()
}

async function loadCustomerContext() {
  contextError.value = ""

  if (!routeCustomerUuid.value) {
    contextError.value = "所属客户信息缺失，无法创建子账号。"
    return
  }

  if (queryCustomerName.value) {
    customerName.value = queryCustomerName.value
  }

  try {
    const detail = await fetchCustomerDetail({ Uuid: routeCustomerUuid.value })
    customerName.value = normalizeText(detail.CorpName) || customerName.value || "当前客户"
    form.customerUuid = routeCustomerUuid.value
    initialFormState.value = {
      ...createEmptyForm(),
      customerUuid: routeCustomerUuid.value,
    }
  } catch (error) {
    customerName.value = customerName.value || "当前客户"
    contextError.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户信息加载失败，请稍后重试。",
    })
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

onMounted(() => {
  resetLocalStateForRoute()
  void loadCustomerContext()

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
    void loadCustomerContext()
  },
)
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      title="添加子账号"
      :primary-action="{ label: submitButtonLabel, icon: 'ri-user-add-line', disabled: !canSubmit }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: '当前已填写的子账号信息都会被清空，此操作不可撤销。' }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="contextError" variant="destructive">
      <AlertTitle>所属客户信息加载失败</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        <span>{{ contextError }}</span>
        <Button size="sm" variant="outline" class="gap-2" @click="loadCustomerContext">
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
            label-for="sub-account-customer"
          >
            <Input
              id="sub-account-customer"
              :model-value="customerName || '当前客户'"
              disabled
              class="w-full"
              @focus="handleFocus('section-customer')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-name"
            quick-nav-label="用户名"
            label="用户名"
            label-for="sub-account-name"
          >
            <Input
              id="sub-account-name"
              v-model="form.name"
              required
              placeholder="请输入用户名"
              class="w-full"
              @focus="handleFocus('section-name')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-account"
            quick-nav-label="账号"
            label="账号"
            label-for="sub-account-account"
          >
            <Input
              id="sub-account-account"
              v-model="form.account"
              required
              placeholder="请输入登录账号"
              class="w-full"
              @focus="handleFocus('section-account')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-password"
            quick-nav-label="密码"
            label="密码"
            label-for="sub-account-password"
          >
            <Input
              id="sub-account-password"
              v-model="form.password"
              required
              placeholder="请输入密码"
              class="w-full"
              @focus="handleFocus('section-password')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-phone"
            quick-nav-label="手机号"
            label="手机号"
            label-for="sub-account-phone"
            last
          >
            <Input
              id="sub-account-phone"
              v-model="form.phone"
              required
              type="tel"
              inputmode="numeric"
              placeholder="请输入手机号"
              class="w-full"
              @focus="handleFocus('section-phone')"
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
