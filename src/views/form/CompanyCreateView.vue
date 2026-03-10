<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"

import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type ContactItem = {
  id: number
  role: string
  name: string
  phone: string
}

type CompanyFormState = {
  type: string
  businessLicenseFile: File | null
  name: string
  creditCode: string
  registeredAddress: string
  contactAddress: string
  district: string
  email: string
  transportLicenseFile: File | null
  transportLicenseNo: string
  note: string
}

type QuickNavItem = {
  id: string
  label: string
}

function createPrimaryContact(): ContactItem {
  return { id: 1, role: "", name: "", phone: "" }
}

function createAdditionalContact(id: number): ContactItem {
  return { id, role: "", name: "", phone: "" }
}

const ROUTE_COMPANY_TYPES = ["道路旅客运输", "道路危险货物运输"]
const ROUTE_DISTRICTS = [
  "海曙区", "鄞州区", "北仑区", "宁海县", "慈溪市",
  "余姚市", "奉化区", "象山县", "江北区", "镇海区",
]

const router = useRouter()
const form = reactive<CompanyFormState>({
  type: "",
  businessLicenseFile: null,
  name: "",
  creditCode: "",
  registeredAddress: "",
  contactAddress: "",
  district: "",
  email: "",
  transportLicenseFile: null,
  transportLicenseNo: "",
  note: "",
})

const contacts = ref<ContactItem[]>([createPrimaryContact()])
let nextContactId = 2

const canSubmit = computed(() =>
  Boolean(
    form.type.trim() && form.name.trim() && form.creditCode.trim()
    && form.registeredAddress.trim() && form.contactAddress.trim()
    && form.district.trim() && form.email.trim()
    && contacts.value[0]?.name.trim() && contacts.value[0]?.phone.trim(),
  ),
)

const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const businessLicenseInput = ref<HTMLInputElement | null>(null)
const transportLicenseInput = ref<HTMLInputElement | null>(null)
const formSectionsRef = ref<HTMLElement | null>(null)

function handleFocus(sectionId: string) {
  activeNavId.value = sectionId
}

const STICKY_HEADER_OFFSET = 112 // 吸顶标题栏高度，用于 scroll-margin

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
  activeNavId.value = id // 立即高亮点击项
  observerActive = false
  const section = document.getElementById(id)
  if (!section) return
  const rect = section.getBoundingClientRect()
  const top = rect.top + window.scrollY - STICKY_HEADER_OFFSET
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
  // 不在此处 focus，避免 focus 触发浏览器二次滚动导致跳到其他区块
  nextTick(() => {
    const focusable = section.querySelector<HTMLElement>(
      'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    )
    focusable?.focus({ preventScroll: true }) // 仅聚焦不滚动
    setTimeout(() => { observerActive = true }, 350)
  })
}

function addContact() {
  contacts.value.push(createAdditionalContact(nextContactId++))
}

function removeContact(id: number) {
  if (contacts.value.length <= 1) return
  contacts.value = contacts.value.filter((c) => c.id !== id)
}

function handleBusinessLicenseFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) form.businessLicenseFile = file
}

function handleTransportLicenseFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) form.transportLicenseFile = file
}

function handleSubmit() {
  console.info("提交企业表单", { form, contacts: contacts.value })
  router.push({ name: "companies" })
}

function handleReset() {
  Object.assign(form, {
    type: "",
    businessLicenseFile: null,
    name: "",
    creditCode: "",
    registeredAddress: "",
    contactAddress: "",
    district: "",
    email: "",
    transportLicenseFile: null,
    transportLicenseNo: "",
    note: "",
  })
  contacts.value = [createPrimaryContact()]
  nextContactId = 2
}

function goBack() {
  router.push({ name: "companies" })
}

function triggerBusinessLicenseSelect() {
  businessLicenseInput.value?.click()
}

function triggerTransportLicenseSelect() {
  transportLicenseInput.value?.click()
}

let observer: IntersectionObserver | null = null
let observerActive = false
onMounted(() => {
  nextTick(() => {
    syncAnchorItems()
    observer = new IntersectionObserver(
      (entries) => {
        if (!observerActive) return // 延后生效，保持首屏默认第一个
        const intersecting = entries.filter(
          entry => entry.isIntersecting && anchorItems.value.some(item => item.id === entry.target.id),
        )
        if (intersecting.length === 0) return
        const topmost = anchorItems.value.find(item =>
          intersecting.some(entry => entry.target.id === item.id),
        )
        if (topmost) activeNavId.value = topmost.id
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    )
    anchorItems.value.forEach((item) => {
      const el = document.getElementById(item.id)
      if (el) observer?.observe(el)
    })
    // 延迟启用 observer，避免首屏时 rootMargin 导致第二个被高亮
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
      title="添加企业"
      :primary-action="{ label: '添加', icon: 'ri-add-line', disabled: !canSubmit }"
      :secondary-actions="[
        { key: 'back', label: '返回列表' },
        { key: 'reset', label: '重置表单' },
      ]"
      :reset-dialog="{ description: '当前已填写的企业信息和联系人内容都会被清空，此操作不可撤销。' }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <!-- Section：设计稿 表单 + 右侧表单快速导航，无卡片容器 -->
    <div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]">
      <form class="min-w-0 space-y-0" @submit.prevent="handleSubmit">
        <!-- 表单：设计稿 Row + Segment 交替，无 Card -->
        <div ref="formSectionsRef" class="min-w-0 space-y-0">
          <FormFieldSection
            id="section-type"
            quick-nav-label="企业类型"
            label="企业类型"
            label-for="company-type"
          >
            <Select v-model="form.type" required>
              <SelectTrigger id="company-type" class="w-full" @focus="handleFocus('section-type')">
                <SelectValue placeholder="请选择企业类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in ROUTE_COMPANY_TYPES" :key="t" :value="t">
                  {{ t }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-license"
            quick-nav-label="营业执照"
            label="营业执照"
            description="上传营业执照自动识别企业名称、统一社会信用代码、公司法人注册地址等信息，可编辑"
            align="start"
          >
            <div
              class="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/30 px-3 py-6 text-center transition-colors hover:border-muted-foreground/50 sm:px-4 sm:py-8"
              @dragover.prevent
              @drop.prevent="(e) => { const f = e.dataTransfer?.files?.[0]; if (f) form.businessLicenseFile = f }"
            >
              <input ref="businessLicenseInput" type="file" accept=".jpg,.jpeg,.png,.pdf,.mp4" class="hidden" @change="handleBusinessLicenseFile">
              <p class="text-sm text-muted-foreground">选择一个文件，或者将其拖放到此处</p>
              <p class="text-xs text-muted-foreground">支持 JPEG、PNG、PDF 和 MP4 格式，文件大小上限为 50 MB</p>
              <Button variant="outline" size="sm" type="button" @click="triggerBusinessLicenseSelect" @focus="handleFocus('section-license')">
                选择文件
              </Button>
            </div>
          </FormFieldSection>

          <FormFieldSection
            id="section-name"
            quick-nav-label="企业名称"
            label="企业名称"
            label-for="company-name"
          >
            <Input id="company-name" v-model="form.name" required placeholder="请输入企业名称" class="w-full" @focus="handleFocus('section-name')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-credit"
            quick-nav-label="统一社会信用代码"
            label="统一社会信用代码"
            label-for="company-credit-code"
          >
            <Input id="company-credit-code" v-model="form.creditCode" required placeholder="请输入..." class="w-full" @focus="handleFocus('section-credit')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-registered"
            quick-nav-label="注册地址"
            label="注册地址"
            label-for="company-registered-address"
          >
            <Input id="company-registered-address" v-model="form.registeredAddress" required placeholder="请输入..." class="w-full" @focus="handleFocus('section-registered')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-contact-addr"
            quick-nav-label="联系地址"
            label="联系地址"
            label-for="company-contact-address"
          >
            <Input id="company-contact-address" v-model="form.contactAddress" required placeholder="请输入..." class="w-full" @focus="handleFocus('section-contact-addr')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-district"
            quick-nav-label="所属行政区域"
            label="所属行政区域"
            label-for="company-district"
          >
            <Select v-model="form.district" required>
              <SelectTrigger id="company-district" class="w-full" @focus="handleFocus('section-district')">
                <SelectValue placeholder="请选择..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="d in ROUTE_DISTRICTS" :key="d" :value="d">
                  {{ d }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-email"
            quick-nav-label="企业邮箱"
            label="企业邮箱"
            label-for="company-email"
          >
            <Input id="company-email" v-model="form.email" required type="email" placeholder="请输入..." class="w-full" @focus="handleFocus('section-email')" />
          </FormFieldSection>

          <div id="section-contacts" data-quick-nav-label="公司法人/联系人" class="scroll-mt-28 border-b border-dashed border-border py-5">
            <FieldSet>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <FieldGroup class="min-w-0 flex-1 gap-1">
                  <FieldLegend>联系人</FieldLegend>
                  <FieldDescription>默认法人身份必填，可以另外添加联系人信息</FieldDescription>
                </FieldGroup>
                <Button variant="outline" size="sm" type="button" class="shrink-0" @click="addContact" @focus="handleFocus('section-contacts')">
                  添加联系人
                </Button>
              </div>
              <div class="min-w-0 max-w-full overflow-x-auto overflow-y-hidden rounded-md">
                <table class="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th class="rounded-tl-md rounded-bl-md bg-muted px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pl-7">
                        身份
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
                    <tr v-for="c in contacts" :key="c.id" class="border-b border-dashed border-border last:border-b-0">
                      <td class="px-3 py-3 sm:px-4">
                        <Input v-model="c.role" placeholder="身份" class="h-9 min-w-0" @focus="handleFocus('section-contacts')" />
                      </td>
                      <td class="px-3 py-3 sm:px-4">
                        <Input v-model="c.name" placeholder="姓名" class="h-9 min-w-0" @focus="handleFocus('section-contacts')" />
                      </td>
                      <td class="px-3 py-3 sm:px-4">
                        <Input v-model="c.phone" type="tel" placeholder="联系电话" class="h-9 min-w-0" @focus="handleFocus('section-contacts')" />
                      </td>
                      <td class="w-12 min-w-12 px-3 py-3 sm:px-4">
                        <Button
                          v-if="contacts.length > 1"
                          variant="ghost"
                          size="sm"
                          type="button"
                          class="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                          @click="removeContact(c.id)"
                        >
                          <i class="ri-close-line text-base" />
                        </Button>
                        <span v-else class="inline-block h-8 w-8 shrink-0" aria-hidden="true" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </FieldSet>
          </div>

          <FormFieldSection
            id="section-transport"
            quick-nav-label="道路运输许可证"
            label="道路运输许可证"
            align="start"
          >
            <div
              class="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/30 px-3 py-6 text-center transition-colors hover:border-muted-foreground/50 sm:px-4 sm:py-8"
              @dragover.prevent
              @drop.prevent="(e) => { const f = e.dataTransfer?.files?.[0]; if (f) form.transportLicenseFile = f }"
            >
              <input ref="transportLicenseInput" type="file" accept=".jpg,.jpeg,.png,.pdf,.mp4" class="hidden" @change="handleTransportLicenseFile">
              <p class="text-sm text-muted-foreground">选择一个文件，或者将其拖放到此处</p>
              <p class="text-xs text-muted-foreground">支持 JPEG、PNG、PDF 和 MP4 格式，文件大小上限为 50 MB</p>
              <Button variant="outline" size="sm" type="button" @click="triggerTransportLicenseSelect" @focus="handleFocus('section-transport')">
                选择文件
              </Button>
            </div>
          </FormFieldSection>

          <FormFieldSection
            id="section-transport-no"
            quick-nav-label="道路运输许可证号"
            label="道路运输许可证号"
            label-for="company-transport-license-no"
          >
            <Input id="company-transport-license-no" v-model="form.transportLicenseNo" placeholder="请输入..." class="w-full" @focus="handleFocus('section-transport-no')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-note"
            quick-nav-label="备注"
            label-for="company-note"
            align="start"
            last
          >
            <template #label>
              备注
              <span class="font-normal text-muted-foreground">(选填)</span>
            </template>
            <Textarea
              id="company-note"
              v-model="form.note"
              rows="4"
              placeholder="请输入..."
              @focus="handleFocus('section-note')"
            />
          </FormFieldSection>
        </div>
      </form>

      <FormQuickNav
        v-if="anchorItems.length"
        class="hidden lg:sticky lg:top-24 lg:block lg:self-start"
        :items="anchorItems"
        :active-id="activeNavId"
        @select="scrollToSection"
      />
    </div>
  </section>
</template>
