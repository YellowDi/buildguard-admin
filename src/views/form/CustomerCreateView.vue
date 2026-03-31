<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { toast } from "vue-sonner"

import FormBodyLoading from "@/components/loading/FormBodyLoading.vue"
import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createCustomer, fetchCustomerDetail, updateCustomer, updateCustomerStatus, type CustomerDetailResult } from "@/lib/customers-api"
import { handleApiError } from "@/lib/api-errors"

type CustomerFormState = {
  corpName: string
  business: string
  status: string
  level: string
  usci: string
  usciFile: string
  address: string
  invoice: string
}

type PrincipalFormState = {
  id: number
  name: string
  phone: string
  isMain: boolean
}

type QuickNavItem = {
  id: string
  label: string
}

type CustomerFormSnapshot = {
  form: CustomerFormState
  principals: PrincipalFormState[]
  mainPrincipalId: number
  businessLicenseFileName: string
}

function createPrincipal(id: number, isMain = false): PrincipalFormState {
  return {
    id,
    name: "",
    phone: "",
    isMain,
  }
}

function createEmptySnapshot(): CustomerFormSnapshot {
  return {
    form: {
      corpName: "",
      business: "",
      status: "",
      level: "",
      usci: "",
      usciFile: "",
      address: "",
      invoice: "",
    },
    principals: [createPrincipal(1, true)],
    mainPrincipalId: 1,
    businessLicenseFileName: "",
  }
}

const router = useRouter()
const route = useRoute()
const form = reactive<CustomerFormState>(createEmptySnapshot().form)
const principals = ref<PrincipalFormState[]>(createEmptySnapshot().principals)
const mainPrincipalId = ref(createEmptySnapshot().mainPrincipalId)
const submitting = ref(false)
const loadingDetail = ref(false)
const loadErrorMessage = ref("")
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const formSectionsRef = ref<HTMLElement | null>(null)
const businessLicenseInput = ref<HTMLInputElement | null>(null)
const businessLicenseFileName = ref("")
const initialSnapshot = ref<CustomerFormSnapshot>(createEmptySnapshot())
const STICKY_HEADER_OFFSET = 112
let nextPrincipalId = 2
let observer: IntersectionObserver | null = null
let observerActive = false

const editCustomerUuid = computed(() => typeof route.params.id === "string" ? route.params.id.trim() : "")
const isEditMode = computed(() => route.name === "customer-edit" && Boolean(editCustomerUuid.value))
const pageTitle = computed(() => isEditMode.value ? "修改客户信息" : "添加客户")
const hasValidPrincipal = computed(() =>
  principals.value.some(principal => normalizeText(principal.name) && normalizeText(principal.phone)),
)
const canSubmit = computed(() =>
  Boolean(normalizeText(form.corpName) && hasValidPrincipal.value && !submitting.value && !loadingDetail.value),
)
const primaryActionLabel = computed(() => {
  if (loadingDetail.value) {
    return "加载中..."
  }

  if (submitting.value) {
    return isEditMode.value ? "保存中..." : "提交中..."
  }

  return isEditMode.value ? "保存修改" : "添加客户"
})
const resetDialogDescription = computed(() => (
  isEditMode.value
    ? "当前已修改的客户信息和责任人内容都会恢复为最近一次加载的资料。"
    : "当前已填写的客户信息和责任人内容都会被清空，此操作不可撤销。"
))

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
  if (!section) return

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

function addPrincipal() {
  principals.value.push(createPrincipal(nextPrincipalId++))
}

function removePrincipal(id: number) {
  if (principals.value.length <= 1) {
    return
  }

  principals.value = principals.value.filter(principal => principal.id !== id)

  if (mainPrincipalId.value === id) {
    mainPrincipalId.value = principals.value[0]?.id ?? 0
  }

  syncMainPrincipalFlags()
}

function setMainPrincipal(id: number, checked: boolean) {
  if (!checked) {
    return
  }

  mainPrincipalId.value = id
  syncMainPrincipalFlags()
}

async function handleBusinessLicenseFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (!file) {
    return
  }

  await applyBusinessLicenseFile(file)
}

async function handleBusinessLicenseDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]

  if (!file) {
    return
  }

  await applyBusinessLicenseFile(file)
}

async function applyBusinessLicenseFile(file: File) {
  if (!file.type.startsWith("image/")) {
    toast.error("请上传图片格式的营业执照")
    return
  }

  try {
    form.usciFile = await readFileAsDataUrl(file)
    businessLicenseFileName.value = file.name
  } catch {
    toast.error("营业执照读取失败")
  }
}

function triggerBusinessLicenseSelect() {
  businessLicenseInput.value?.click()
}

async function handleSubmit() {
  if (loadingDetail.value) {
    return
  }

  if (!normalizeText(form.corpName)) {
    toast.error("请填写公司名称")
    return
  }

  const people = principals.value
    .map(principal => ({
      Name: normalizeText(principal.name),
      Phone: normalizeText(principal.phone),
      IsMain: principal.id === mainPrincipalId.value ? 1 : 0,
    }))
    .filter(principal => principal.Name || principal.Phone)

  if (!people.length) {
    toast.error("请至少填写一位责任人")
    return
  }

  if (!people.some(principal => principal.IsMain === 1)) {
    people[0].IsMain = 1
  }

  if (isEditMode.value && !normalizeText(form.status)) {
    toast.error("请选择客户状态")
    return
  }

  submitting.value = true

  try {
    const payload = {
      People: people,
      Business: getOptionalText(form.business),
      Usci: getOptionalText(form.usci),
      UsciFile: getOptionalText(form.usciFile),
      CorpName: getOptionalText(form.corpName),
      Address: getOptionalText(form.address),
      Invoice: getOptionalText(form.invoice),
      Level: getOptionalInteger(form.level),
    }

    if (isEditMode.value) {
      const nextCustomerUuid = editCustomerUuid.value
      const result = await updateCustomer({
        Uuid: nextCustomerUuid,
        People: people,
        Business: normalizeText(form.business),
        Usci: normalizeText(form.usci),
        UsciFile: normalizeText(form.usciFile),
        CorpName: normalizeText(form.corpName),
        Address: normalizeText(form.address),
        Invoice: normalizeText(form.invoice),
        Level: getRequiredInteger(form.level),
      })

      await updateCustomerStatus({
        Uuid: result.Uuid || nextCustomerUuid,
        Status: getRequiredInteger(form.status),
      })

      const refreshedCustomer = await fetchCustomerDetail({ Uuid: result.Uuid || nextCustomerUuid })

      if (!didCustomerUpdatePersist(refreshedCustomer, payload, people, getRequiredInteger(form.status))) {
        throw new Error("客户资料提交成功，但刷新后未发现更新结果。请核对 /bqi/customer/update 与 /bqi/customer/status/update 的字段要求。")
      }

      toast.success("客户信息已更新", {
        description: editCustomerUuid.value ? `客户 UUID：${editCustomerUuid.value}` : "客户资料已更新。",
      })

      await router.push({
        name: "customer-detail",
        params: { id: result.Uuid || editCustomerUuid.value },
      })
      return
    }

    const result = await createCustomer(payload)

    toast.success("客户已创建", {
      description: result.Uuid ? `客户 UUID：${result.Uuid}` : "客户信息已提交到接口。",
    })

    if (result.Uuid) {
      await router.push({ name: "customer-detail", params: { id: result.Uuid } })
      return
    }

    await router.push({ name: "customers" })
  } catch (error) {
    handleApiError(error, {
      title: isEditMode.value ? "客户信息更新失败" : "客户创建失败",
      fallback: isEditMode.value ? "客户信息更新失败，请稍后重试。" : "客户创建失败，请稍后重试。",
    })
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  applySnapshot(initialSnapshot.value)
}

function syncMainPrincipalFlags() {
  principals.value.forEach((principal) => {
    principal.isMain = principal.id === mainPrincipalId.value
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

function getOptionalText(value: unknown) {
  const normalized = normalizeText(value)
  return normalized || undefined
}

function getOptionalInteger(value: unknown) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getRequiredInteger(value: unknown) {
  const parsed = getOptionalInteger(value)

  if (typeof parsed === "number" && Number.isFinite(parsed)) {
    return parsed
  }

  return 0
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }

      reject(new Error("invalid_result"))
    }

    reader.onerror = () => reject(reader.error ?? new Error("read_failed"))
    reader.readAsDataURL(file)
  })
}

watch(editCustomerUuid, (uuid) => {
  if (!isEditMode.value) {
    const snapshot = createEmptySnapshot()
    initialSnapshot.value = snapshot
    applySnapshot(snapshot)
    loadErrorMessage.value = ""
    return
  }

  void loadCustomerForEdit(uuid)
}, { immediate: true })

onMounted(() => {
  nextTick(() => {
    syncAnchorItems()

    observer = new IntersectionObserver(
      (entries) => {
        if (!observerActive) return

        const intersecting = entries.filter(
          entry => entry.isIntersecting && anchorItems.value.some(item => item.id === entry.target.id),
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

function applySnapshot(snapshot: CustomerFormSnapshot) {
  Object.assign(form, snapshot.form)
  principals.value = snapshot.principals.map(principal => ({ ...principal }))
  mainPrincipalId.value = snapshot.mainPrincipalId
  businessLicenseFileName.value = snapshot.businessLicenseFileName
  nextPrincipalId = Math.max(1, ...principals.value.map(principal => principal.id)) + 1
  syncMainPrincipalFlags()
}

async function loadCustomerForEdit(uuid: string) {
  if (!uuid) {
    loadErrorMessage.value = "客户 Uuid 缺失，无法加载编辑资料。"
    return
  }

  loadingDetail.value = true
  loadErrorMessage.value = ""

  try {
    const detail = await fetchCustomerDetail({ Uuid: uuid })
    const snapshot = buildSnapshotFromDetail(detail)

    initialSnapshot.value = snapshot
    applySnapshot(snapshot)
  } catch (error) {
    loadErrorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "客户资料加载失败，请稍后重试。",
    })
  } finally {
    loadingDetail.value = false
  }
}

function buildSnapshotFromDetail(detail: CustomerDetailResult): CustomerFormSnapshot {
  const principalsSnapshot = buildPrincipalsFromDetail(detail)
  const mainId = principalsSnapshot.find(principal => principal.isMain)?.id ?? principalsSnapshot[0]?.id ?? 1

  return {
    form: {
      corpName: normalizeText(detail.CorpName),
      business: normalizeText(detail.Business),
      status: normalizeText(detail.Status),
      level: normalizeText(detail.Level),
      usci: normalizeText(detail.Usci),
      usciFile: normalizeText(detail.UsciFile),
      address: normalizeText(detail.Address),
      invoice: normalizeText(detail.Invoice),
    },
    principals: principalsSnapshot,
    mainPrincipalId: mainId,
    businessLicenseFileName: "",
  }
}

function buildPrincipalsFromDetail(detail: CustomerDetailResult) {
  if (!Array.isArray(detail.People) || !detail.People.length) {
    return [createPrincipal(1, true)]
  }

  const filled = detail.People.filter(
    person => normalizeText(person.Name) || normalizeText(person.Phone),
  ).map((person, index) => ({
    id: index + 1,
    name: normalizeText(person.Name),
    phone: normalizeText(person.Phone),
    isMain: Number(person.IsMain) === 1,
  }))

  if (!filled.length) {
    return [createPrincipal(1, true)]
  }

  const mainIndex = filled.findIndex(principal => principal.isMain)
  const resolvedMain = mainIndex >= 0 ? mainIndex : 0

  return filled.map((principal, index) => ({
    ...principal,
    id: index + 1,
    isMain: index === resolvedMain,
  }))
}

function didCustomerUpdatePersist(
  detail: CustomerDetailResult,
  payload: {
    CorpName?: string
    Business?: string
    Usci?: string
    UsciFile?: string
    Address?: string
    Invoice?: string
    Level?: number
  },
  people: Array<{ Name: string; Phone: string; IsMain: number }>,
  status?: number,
) {
  const expectedPeople = normalizePeopleForCompare(people)
  const actualPeople = normalizePeopleForCompare(
    (detail.People ?? []).map(person => ({
      Name: normalizeText(person.Name),
      Phone: normalizeText(person.Phone),
      IsMain: Number(person.IsMain) === 1 ? 1 : 0,
    })),
  )

  return normalizeText(detail.CorpName) === normalizeText(payload.CorpName)
    && normalizeText(detail.Business) === normalizeText(payload.Business)
    && normalizeText(detail.Status) === normalizeText(status)
    && normalizeText(detail.Usci) === normalizeText(payload.Usci)
    && normalizeText(detail.UsciFile) === normalizeText(payload.UsciFile)
    && normalizeText(detail.Address) === normalizeText(payload.Address)
    && normalizeText(detail.Invoice) === normalizeText(payload.Invoice)
    && normalizeText(detail.Level) === normalizeText(payload.Level)
    && JSON.stringify(actualPeople) === JSON.stringify(expectedPeople)
}

function normalizePeopleForCompare(people: Array<{ Name: string; Phone: string; IsMain: number }>) {
  return people
    .map(person => ({
      Name: normalizeText(person.Name),
      Phone: normalizeText(person.Phone),
      IsMain: Number(person.IsMain) === 1 ? 1 : 0,
    }))
    .filter(person => person.Name || person.Phone)
    .sort((left, right) => (
      `${left.IsMain}-${left.Name}-${left.Phone}`.localeCompare(`${right.IsMain}-${right.Name}-${right.Phone}`, "zh-CN")
    ))
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      :title="pageTitle"
      :primary-action="{ label: primaryActionLabel, icon: isEditMode ? 'ri-save-line' : 'ri-add-line', disabled: !canSubmit }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: resetDialogDescription }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <Alert v-if="loadErrorMessage" variant="destructive">
      <AlertTitle>客户资料加载失败</AlertTitle>
      <AlertDescription>{{ loadErrorMessage }}</AlertDescription>
    </Alert>

    <FormBodyLoading v-if="loadingDetail" />

    <div
      v-else
      class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]"
    >
      <form class="min-w-0 space-y-0" @submit.prevent="handleSubmit">
        <div ref="formSectionsRef" class="min-w-0 space-y-0">
          <FormFieldSection
            id="section-name"
            quick-nav-label="公司名称"
            label="公司名称"
            label-for="customer-corp-name"
          >
            <Input
              id="customer-corp-name"
              v-model="form.corpName"
              required
              placeholder="请输入公司名称"
              class="w-full"
              @focus="handleFocus('section-name')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-business"
            quick-nav-label="行业"
            label="行业"
            label-for="customer-business"
          >
            <Input
              id="customer-business"
              v-model="form.business"
              placeholder="请输入行业"
              class="w-full"
              @focus="handleFocus('section-business')"
            />
          </FormFieldSection>

          <FormFieldSection
            v-if="isEditMode"
            id="section-status"
            quick-nav-label="客户状态"
            label="客户状态"
            label-for="customer-status"
          >
            <Select v-model="form.status">
              <SelectTrigger id="customer-status" class="w-full" @focus="handleFocus('section-status')">
                <SelectValue placeholder="请选择客户状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  正常
                </SelectItem>
                <SelectItem value="2">
                  封禁
                </SelectItem>
                <SelectItem value="3">
                  未完善
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-level"
            quick-nav-label="客户等级"
            label="客户等级"
            label-for="customer-level"
          >
            <Input
              id="customer-level"
              v-model="form.level"
              type="number"
              inputmode="numeric"
              placeholder="请输入客户等级"
              class="w-full"
              @focus="handleFocus('section-level')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-address"
            quick-nav-label="地址"
            label="地址"
            label-for="customer-address"
            align="start"
          >
            <Textarea
              id="customer-address"
              v-model="form.address"
              placeholder="请输入客户地址"
              class="min-h-[112px] w-full resize-y"
              @focus="handleFocus('section-address')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-license"
            quick-nav-label="营业执照照片"
            label="营业执照照片"
            description="上传营业执照图片，当前会以图片内容编码字符串提交到接口。"
            align="start"
          >
            <div
              class="flex w-full flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-input bg-muted/30 px-3 py-6 text-center transition-colors hover:border-muted-foreground/50 sm:px-4 sm:py-8"
              @dragover.prevent
              @drop.prevent="handleBusinessLicenseDrop"
            >
              <input
                ref="businessLicenseInput"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                class="hidden"
                @change="handleBusinessLicenseFile"
              >

              <template v-if="form.usciFile">
                <img
                  :src="form.usciFile"
                  alt="营业执照预览"
                  class="max-h-56 w-auto max-w-full rounded-md border border-border object-contain"
                >
                <p class="text-sm text-muted-foreground">{{ businessLicenseFileName || "已选择营业执照图片" }}</p>
              </template>
              <template v-else>
                <p class="text-sm text-muted-foreground">选择一张图片，或者将其拖放到此处</p>
                <p class="text-xs text-muted-foreground">支持 JPG、PNG、WEBP，建议上传清晰的营业执照照片</p>
              </template>

              <Button
                variant="outline"
                size="sm"
                type="button"
                @click="triggerBusinessLicenseSelect"
                @focus="handleFocus('section-license')"
              >
                选择图片
              </Button>
            </div>
          </FormFieldSection>

          <FormFieldSection
            id="section-usci"
            quick-nav-label="统一社会信用代码"
            label="统一社会信用代码"
            label-for="customer-usci"
          >
            <Input
              id="customer-usci"
              v-model="form.usci"
              placeholder="请输入统一社会信用代码"
              class="w-full"
              @focus="handleFocus('section-usci')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-invoice"
            quick-nav-label="开票信息"
            label="开票信息"
            label-for="customer-invoice"
            align="start"
          >
            <Textarea
              id="customer-invoice"
              v-model="form.invoice"
              placeholder="请输入开票信息"
              class="min-h-[140px] w-full resize-y"
              @focus="handleFocus('section-invoice')"
            />
          </FormFieldSection>

          <div id="section-principals" data-quick-nav-label="责任人" class="scroll-mt-28 py-5">
            <FieldSet>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <FieldGroup class="min-w-0 flex-1 gap-1">
                  <FieldLegend>责任人</FieldLegend>
                  <FieldDescription>至少填写一位责任人，并指定一位主要责任人。</FieldDescription>
                </FieldGroup>
                <Button variant="outline" size="sm" type="button" class="shrink-0" @click="addPrincipal" @focus="handleFocus('section-principals')">
                  添加责任人
                </Button>
              </div>

              <RadioGroup v-model="mainPrincipalId" class="gap-0">
                <div class="min-w-0 max-w-full overflow-x-auto overflow-y-hidden rounded-md">
                  <table class="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th class="rounded-tl-md rounded-bl-md bg-muted px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pl-7">
                          主要责任人
                        </th>
                        <th class="bg-muted px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pl-7">
                          姓名
                        </th>
                        <th class="bg-muted px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pl-7">
                          联系电话
                        </th>
                        <th class="w-12 rounded-tr-md rounded-br-md bg-muted px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="principal in principals" :key="principal.id" class="border-b border-dashed border-border last:border-b-0">
                        <td class="px-3 py-3 sm:px-4">
                          <label class="flex items-center gap-2 text-sm text-foreground">
                            <RadioGroupItem :value="principal.id" />
                            <span>主要</span>
                          </label>
                        </td>
                        <td class="px-3 py-3 sm:px-4">
                          <Input
                            v-model="principal.name"
                            placeholder="姓名"
                            class="h-9 min-w-0"
                            @focus="handleFocus('section-principals')"
                          />
                        </td>
                        <td class="px-3 py-3 sm:px-4">
                          <Input
                            v-model="principal.phone"
                            type="tel"
                            inputmode="numeric"
                            placeholder="联系电话"
                            class="h-9 min-w-0"
                            @focus="handleFocus('section-principals')"
                          />
                        </td>
                        <td class="w-12 min-w-12 px-3 py-3 sm:px-4">
                          <Button
                            v-if="principals.length > 1"
                            variant="ghost"
                            size="sm"
                            type="button"
                            class="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                            @click="removePrincipal(principal.id)"
                          >
                            <i class="ri-close-line text-base" />
                          </Button>
                          <span v-else class="inline-block h-8 w-8 shrink-0" aria-hidden="true" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </RadioGroup>
            </FieldSet>
          </div>

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
