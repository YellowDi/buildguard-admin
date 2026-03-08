<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

const contacts = ref<ContactItem[]>([{ id: 1, role: "法人", name: "", phone: "" }])
let nextContactId = 2

const canSubmit = computed(() =>
  Boolean(
    form.type.trim() && form.name.trim() && form.creditCode.trim()
    && form.registeredAddress.trim() && form.contactAddress.trim()
    && form.district.trim() && form.email.trim()
    && contacts.value[0]?.name.trim() && contacts.value[0]?.phone.trim(),
  ),
)

const anchorItems = [
  { id: "section-type", label: "企业类型" },
  { id: "section-license", label: "营业执照" },
  { id: "section-name", label: "企业名称" },
  { id: "section-credit", label: "统一社会信用代码" },
  { id: "section-registered", label: "注册地址" },
  { id: "section-contact-addr", label: "联系地址" },
  { id: "section-district", label: "所属行政区域" },
  { id: "section-email", label: "企业邮箱" },
  { id: "section-contacts", label: "公司法人/联系人" },
  { id: "section-transport", label: "道路运输许可证" },
  { id: "section-transport-no", label: "道路运输许可证号" },
  { id: "section-note", label: "备注" },
]

const activeNavId = ref(anchorItems[0].id)
const businessLicenseInput = ref<HTMLInputElement | null>(null)
const transportLicenseInput = ref<HTMLInputElement | null>(null)

function handleFocus(sectionId: string) {
  activeNavId.value = sectionId
}

const STICKY_HEADER_OFFSET = 112 // 吸顶标题栏高度，用于 scroll-margin

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
  contacts.value.push({ id: nextContactId++, role: "总监", name: "", phone: "" })
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
  contacts.value = [{ id: 1, role: "法人", name: "", phone: "" }]
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
  observer = new IntersectionObserver(
    (entries) => {
      if (!observerActive) return // 延后生效，保持首屏默认第一个
      const intersecting = entries.filter(
        (e) => e.isIntersecting && anchorItems.some((a) => a.id === e.target.id),
      )
      if (intersecting.length === 0) return
      const topmost = anchorItems.find((a) =>
        intersecting.some((e) => e.target.id === a.id),
      )
      if (topmost) activeNavId.value = topmost.id
    },
    { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
  )
  anchorItems.forEach((item) => {
    const el = document.getElementById(item.id)
    if (el) observer!.observe(el)
  })
  // 延迟启用 observer，避免首屏时 rootMargin 导致第二个被高亮
  setTimeout(() => { observerActive = true }, 150)
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <section class="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-8">
    <!-- 标题行：实线底边，吸顶固定 -->
    <div class="sticky top-0 z-10 -mx-4 -mt-4 flex flex-col gap-3 border-b border-border bg-background px-4 pb-5 pt-4 sm:flex-row sm:items-end sm:justify-between">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">
        添加企业
      </h1>
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="goBack">
          返回列表
        </Button>
        <Button variant="outline" @click="handleReset">
          重置表单
        </Button>
        <Button :disabled="!canSubmit" @click="handleSubmit">
          <i class="ri-add-line mr-2 text-base" />
          添加
        </Button>
      </div>
    </div>

    <!-- Section：设计稿 表单 + 右侧表单快速导航，无卡片容器 -->
    <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_250px]">
      <form class="space-y-0" @submit.prevent="handleSubmit">
        <!-- 表单：设计稿 Row + Segment 交替，无 Card -->
        <div class="space-y-0">
          <!-- Row: 设计稿 标签左 | 控件右，控件列固定 360px 左右对齐 -->
          <div id="section-type" class="flex items-center gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <label class="min-w-0 flex-1 text-sm font-medium text-foreground">企业类型</label>
            <div class="w-[360px] shrink-0">
            <select
              v-model="form.type"
              required
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              @focus="handleFocus('section-type')"
              >
              <option disabled value="">请选择企业类型</option>
              <option v-for="t in ROUTE_COMPANY_TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>

          <div id="section-license" class="flex items-start gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <div class="min-w-0 flex-1 space-y-1">
              <label class="text-sm font-medium text-foreground">营业执照</label>
              <p class="text-xs text-muted-foreground">
                上传营业执照自动识别企业名称、统一社会信用代码、公司法人注册地址等信息，可编辑
              </p>
            </div>
            <div class="w-[360px] shrink-0">
              <div
                class="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/30 px-4 py-8 transition-colors hover:border-muted-foreground/50"
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
            </div>
          </div>

          <div id="section-name" class="flex items-center gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <label class="min-w-0 flex-1 text-sm font-medium text-foreground">企业名称</label>
            <div class="w-[360px] shrink-0">
              <Input v-model="form.name" required placeholder="请输入企业名称" class="w-full" @focus="handleFocus('section-name')" />
            </div>
          </div>

          <div id="section-credit" class="flex items-center gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <label class="min-w-0 flex-1 text-sm font-medium text-foreground">统一社会信用代码</label>
            <div class="w-[360px] shrink-0">
              <Input v-model="form.creditCode" required placeholder="请输入..." class="w-full" @focus="handleFocus('section-credit')" />
            </div>
          </div>

          <div id="section-registered" class="flex items-center gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <label class="min-w-0 flex-1 text-sm font-medium text-foreground">注册地址</label>
            <div class="w-[360px] shrink-0">
              <Input v-model="form.registeredAddress" required placeholder="请输入..." class="w-full" @focus="handleFocus('section-registered')" />
            </div>
          </div>

          <div id="section-contact-addr" class="flex items-center gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <label class="min-w-0 flex-1 text-sm font-medium text-foreground">联系地址</label>
            <div class="w-[360px] shrink-0">
              <Input v-model="form.contactAddress" required placeholder="请输入..." class="w-full" @focus="handleFocus('section-contact-addr')" />
            </div>
          </div>

          <div id="section-district" class="flex items-center gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <label class="min-w-0 flex-1 text-sm font-medium text-foreground">所属行政区域</label>
            <div class="w-[360px] shrink-0">
              <select
                v-model="form.district"
                required
                class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                @focus="handleFocus('section-district')"
              >
                <option disabled value="">请选择...</option>
                <option v-for="d in ROUTE_DISTRICTS" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
          </div>

          <div id="section-email" class="flex items-center gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <label class="min-w-0 flex-1 text-sm font-medium text-foreground">企业邮箱</label>
            <div class="w-[360px] shrink-0">
              <Input v-model="form.email" required type="email" placeholder="请输入..." class="w-full" @focus="handleFocus('section-email')" />
            </div>
          </div>

          <div id="section-contacts" class="flex flex-col gap-4 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0 flex-1 space-y-1">
                <label class="text-sm font-medium text-foreground">联系人</label>
                <p class="text-xs text-muted-foreground">默认法人身份必填，可以另外添加联系人信息</p>
              </div>
              <Button variant="outline" size="sm" type="button" class="shrink-0" @click="addContact" @focus="handleFocus('section-contacts')">
                添加联系人
              </Button>
            </div>
            <div class="overflow-x-auto overflow-y-hidden rounded-t-md">
              <table class="w-full min-w-[400px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th class="rounded-tl-md rounded-bl-md bg-muted py-3 pl-7 pr-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      身份
                    </th>
                    <th class="bg-muted py-3 pl-7 pr-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      姓名
                    </th>
                    <th class="bg-muted py-3 pl-7 pr-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      联系电话
                    </th>
                    <th class="w-12 rounded-tr-md rounded-br-md bg-muted px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in contacts" :key="c.id" class="border-b border-dashed border-border last:border-b-0">
                    <td class="px-4 py-3">
                      <Input v-model="c.role" placeholder="身份" class="h-9 min-w-0" @focus="handleFocus('section-contacts')" />
                    </td>
                    <td class="px-4 py-3">
                      <Input v-model="c.name" placeholder="姓名" class="h-9 min-w-0" @focus="handleFocus('section-contacts')" />
                    </td>
                    <td class="px-4 py-3">
                      <Input v-model="c.phone" type="tel" placeholder="联系电话" class="h-9 min-w-0" @focus="handleFocus('section-contacts')" />
                    </td>
                    <td class="w-12 min-w-12 px-4 py-3">
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
          </div>

          <div id="section-transport" class="flex items-start gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <label class="min-w-0 flex-1 text-sm font-medium text-foreground">道路运输许可证</label>
            <div class="w-[360px] shrink-0">
              <div
                class="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/30 px-4 py-8 transition-colors hover:border-muted-foreground/50"
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
            </div>
          </div>

          <div id="section-transport-no" class="flex items-center gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <label class="min-w-0 flex-1 text-sm font-medium text-foreground">道路运输许可证号</label>
            <div class="w-[360px] shrink-0">
              <Input v-model="form.transportLicenseNo" placeholder="请输入..." class="w-full" @focus="handleFocus('section-transport-no')" />
            </div>
          </div>

          <div id="section-note" class="flex items-start gap-6 border-b border-dashed border-border py-5" style="scroll-margin-top: 7rem">
            <label class="min-w-0 flex-1 text-sm font-medium text-foreground">
              备注
              <span class="font-normal text-muted-foreground">(选填)</span>
            </label>
            <div class="w-[360px] shrink-0">
              <textarea
                v-model="form.note"
                rows="4"
                class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="请输入..."
                @focus="handleFocus('section-note')"
              />
            </div>
          </div>
        </div>
      </form>

      <nav class="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <div class="space-y-1">
          <button
              v-for="item in anchorItems"
              :key="item.id"
              type="button"
              :class="[
                'flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors',
                activeNavId === item.id
                  ? 'bg-accent font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              ]"
              @click="scrollToSection(item.id)"
            >
              {{ item.label }}
            </button>
        </div>
      </nav>
    </div>
  </section>
</template>
