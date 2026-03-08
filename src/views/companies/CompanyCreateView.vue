<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"

import FormQuickNav from "@/components/form/FormQuickNav.vue"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
const isHeaderSticky = ref(false)
const headerStickySentinel = ref<HTMLElement | null>(null)
const businessLicenseInput = ref<HTMLInputElement | null>(null)
const transportLicenseInput = ref<HTMLInputElement | null>(null)
const formSectionsRef = ref<HTMLElement | null>(null)
const sectionClass = "scroll-mt-28 border-b border-dashed border-border py-5"
const formRowClass = `${sectionClass} flex flex-col gap-3 md:flex-row md:items-center md:gap-6`
const formRowTopClass = `${sectionClass} flex flex-col gap-3 md:flex-row md:items-start md:gap-6`
const formRowLastTopClass = "scroll-mt-28 flex flex-col gap-3 py-5 md:flex-row md:items-start md:gap-6"
const formLabelClass = "min-w-0 flex-1 text-sm font-medium text-foreground"
const formFieldClass = "w-full min-w-0 md:w-[360px] md:shrink-0"

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
let headerStickyObserver: IntersectionObserver | null = null
let observerActive = false
onMounted(() => {
  nextTick(() => {
    syncAnchorItems()

    if (headerStickySentinel.value) {
      headerStickyObserver = new IntersectionObserver(
        ([e]) => { isHeaderSticky.value = !e.isIntersecting },
        { threshold: 0, rootMargin: "64px 0px 0px 0px" },
      )
      headerStickyObserver.observe(headerStickySentinel.value)
    }
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
  headerStickyObserver?.disconnect()
})
</script>

<template>
  <section class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 pb-8">
    <!-- 标题行：吸顶固定时显示底边分割线，撑满视口宽度；内容与表单 grid 同构对齐 -->
    <div ref="headerStickySentinel" class="h-px w-full -mt-4 shrink-0" aria-hidden="true" />
    <div
      class="sticky top-[-1rem] z-10 -mx-4 bg-background xl:-mt-px xl:ml-[calc(50%-50vw)] xl:w-screen"
      :class="{ 'border-b border-border': isHeaderSticky }"
    >
      <div class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-4 px-4 pb-4 pt-4 sm:gap-5 md:grid md:grid-cols-[minmax(0,1fr)_max-content] md:gap-8 xl:px-0">
          <h1 class="min-w-0 text-2xl font-semibold tracking-tight text-foreground">
            添加企业
          </h1>
          <div class="flex w-full min-w-0 items-center gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap md:w-auto md:justify-end">
          <Button variant="outline" class="h-9 shrink-0 px-3 sm:h-10 sm:px-4" @click="goBack">
            返回列表
          </Button>
          <AlertDialog>
            <AlertDialogTrigger as-child>
              <Button variant="outline" class="h-9 shrink-0 px-3 sm:h-10 sm:px-4">
                重置表单
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认重置表单？</AlertDialogTitle>
                <AlertDialogDescription>
                  当前已填写的企业信息和联系人内容都会被清空，此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction @click="handleReset">
                  确认重置
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button :disabled="!canSubmit" class="h-9 shrink-0 px-3 sm:h-10 sm:px-4" @click="handleSubmit">
            <i class="ri-add-line mr-2 text-base" />
            添加
          </Button>
          </div>
        </div>
    </div>

    <!-- Section：设计稿 表单 + 右侧表单快速导航，无卡片容器 -->
    <div class="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_250px]">
      <form class="min-w-0 space-y-0" @submit.prevent="handleSubmit">
        <!-- 表单：设计稿 Row + Segment 交替，无 Card -->
        <div ref="formSectionsRef" class="min-w-0 space-y-0">
          <!-- Row: 设计稿 标签左 | 控件右，控件列固定 360px 左右对齐 -->
          <div id="section-type" data-quick-nav-label="企业类型" :class="formRowClass">
            <label :class="formLabelClass">企业类型</label>
            <div :class="formFieldClass">
              <Select v-model="form.type" required>
                <SelectTrigger class="w-full" @focus="handleFocus('section-type')">
                  <SelectValue placeholder="请选择企业类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="t in ROUTE_COMPANY_TYPES" :key="t" :value="t">
                    {{ t }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div id="section-license" data-quick-nav-label="营业执照" :class="formRowTopClass">
            <div class="min-w-0 flex-1 space-y-1">
              <label class="text-sm font-medium text-foreground">营业执照</label>
              <p class="text-xs text-muted-foreground">
                上传营业执照自动识别企业名称、统一社会信用代码、公司法人注册地址等信息，可编辑
              </p>
            </div>
            <div :class="formFieldClass">
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
            </div>
          </div>

          <div id="section-name" data-quick-nav-label="企业名称" :class="formRowClass">
            <label :class="formLabelClass">企业名称</label>
            <div :class="formFieldClass">
              <Input v-model="form.name" required placeholder="请输入企业名称" class="w-full" @focus="handleFocus('section-name')" />
            </div>
          </div>

          <div id="section-credit" data-quick-nav-label="统一社会信用代码" :class="formRowClass">
            <label :class="formLabelClass">统一社会信用代码</label>
            <div :class="formFieldClass">
              <Input v-model="form.creditCode" required placeholder="请输入..." class="w-full" @focus="handleFocus('section-credit')" />
            </div>
          </div>

          <div id="section-registered" data-quick-nav-label="注册地址" :class="formRowClass">
            <label :class="formLabelClass">注册地址</label>
            <div :class="formFieldClass">
              <Input v-model="form.registeredAddress" required placeholder="请输入..." class="w-full" @focus="handleFocus('section-registered')" />
            </div>
          </div>

          <div id="section-contact-addr" data-quick-nav-label="联系地址" :class="formRowClass">
            <label :class="formLabelClass">联系地址</label>
            <div :class="formFieldClass">
              <Input v-model="form.contactAddress" required placeholder="请输入..." class="w-full" @focus="handleFocus('section-contact-addr')" />
            </div>
          </div>

          <div id="section-district" data-quick-nav-label="所属行政区域" :class="formRowClass">
            <label :class="formLabelClass">所属行政区域</label>
            <div :class="formFieldClass">
              <Select v-model="form.district" required>
                <SelectTrigger class="w-full" @focus="handleFocus('section-district')">
                  <SelectValue placeholder="请选择..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="d in ROUTE_DISTRICTS" :key="d" :value="d">
                    {{ d }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div id="section-email" data-quick-nav-label="企业邮箱" :class="formRowClass">
            <label :class="formLabelClass">企业邮箱</label>
            <div :class="formFieldClass">
              <Input v-model="form.email" required type="email" placeholder="请输入..." class="w-full" @focus="handleFocus('section-email')" />
            </div>
          </div>

          <div id="section-contacts" data-quick-nav-label="公司法人/联系人" :class="`${sectionClass} flex flex-col gap-4`">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div class="min-w-0 flex-1 space-y-1">
                <label class="text-sm font-medium text-foreground">联系人</label>
                <p class="text-xs text-muted-foreground">默认法人身份必填，可以另外添加联系人信息</p>
              </div>
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
          </div>

          <div id="section-transport" data-quick-nav-label="道路运输许可证" :class="formRowTopClass">
            <label :class="formLabelClass">道路运输许可证</label>
            <div :class="formFieldClass">
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
            </div>
          </div>

          <div id="section-transport-no" data-quick-nav-label="道路运输许可证号" :class="formRowClass">
            <label :class="formLabelClass">道路运输许可证号</label>
            <div :class="formFieldClass">
              <Input v-model="form.transportLicenseNo" placeholder="请输入..." class="w-full" @focus="handleFocus('section-transport-no')" />
            </div>
          </div>

          <div id="section-note" data-quick-nav-label="备注" :class="formRowLastTopClass">
            <label :class="formLabelClass">
              备注
              <span class="font-normal text-muted-foreground">(选填)</span>
            </label>
            <div :class="formFieldClass">
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

      <FormQuickNav
        v-if="anchorItems.length"
        class="hidden xl:sticky xl:top-24 xl:block xl:self-start"
        :items="anchorItems"
        :active-id="activeNavId"
        @select="scrollToSection"
      />
    </div>
  </section>
</template>
