<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date"
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
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type PractitionerFormState = {
  name: string
  phone: string
  company: string
  role: string
  district: string
  certificateLevel: string
  experienceYears: string
  joinedAt: string
  status: string
  note: string
}

type SubmittedPractitionerRecord = PractitionerFormState & {
  id: number
  submittedAt: string
}

type QuickNavItem = {
  id: string
  label: string
}

const ROLE_OPTIONS = ["驾驶员", "押运员", "安全员", "调度员"]
const DISTRICT_OPTIONS = [
  "海曙区", "鄞州区", "北仑区", "宁海县", "慈溪市",
  "余姚市", "奉化区", "象山县", "江北区", "镇海区",
]
const CERTIFICATE_LEVEL_OPTIONS = ["A 类", "B 类", "C 类"]
const STATUS_OPTIONS = ["在岗", "待审核", "离岗"]

const router = useRouter()
const form = reactive<PractitionerFormState>({
  name: "",
  phone: "",
  company: "",
  role: "",
  district: "",
  certificateLevel: "",
  experienceYears: "1",
  joinedAt: new Date().toISOString().slice(0, 10),
  status: "在岗",
  note: "",
})

const submittedRecord = ref<SubmittedPractitionerRecord | null>(null)
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const isHeaderSticky = ref(false)
const headerStickySentinel = ref<HTMLElement | null>(null)
const formSectionsRef = ref<HTMLElement | null>(null)

const sectionClass = "scroll-mt-28 border-b border-dashed border-border py-5"
const formRowClass = `${sectionClass} flex flex-col gap-3 md:flex-row md:items-center md:gap-6`
const formRowTopClass = `${sectionClass} flex flex-col gap-3 md:flex-row md:items-start md:gap-6`
const formRowLastTopClass = "scroll-mt-28 flex flex-col gap-3 py-5 md:flex-row md:items-start md:gap-6"
const formLabelClass = "min-w-0 flex-1 text-sm font-medium text-foreground"
const formFieldClass = "w-full min-w-0 md:w-[360px] md:shrink-0"
const STICKY_HEADER_OFFSET = 112
const joinedAtFormatter = new DateFormatter("zh-CN", { dateStyle: "long" })

const canSubmit = computed(() =>
  Boolean(
    form.name.trim()
    && form.phone.trim()
    && form.company.trim()
    && form.role.trim()
    && form.district.trim()
    && form.certificateLevel.trim()
    && form.joinedAt.trim(),
  ),
)

const joinedAtValue = computed({
  get: () => (form.joinedAt ? parseDate(form.joinedAt) : undefined),
  set: (value: { toString: () => string } | undefined) => {
    form.joinedAt = value?.toString() ?? ""
  },
})

const experienceYearsValue = computed({
  get: () => {
    const value = Number(form.experienceYears)
    return Number.isFinite(value) ? value : undefined
  },
  set: (value: number | undefined) => {
    form.experienceYears = value === undefined ? "" : `${value}`
  },
})

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
  if (!section) return
  const rect = section.getBoundingClientRect()
  const top = rect.top + window.scrollY - STICKY_HEADER_OFFSET
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
  nextTick(() => {
    const focusable = section.querySelector<HTMLElement>(
      'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    )
    focusable?.focus({ preventScroll: true })
    setTimeout(() => { observerActive = true }, 350)
  })
}

function handleSubmit() {
  submittedRecord.value = {
    ...form,
    id: Date.now(),
    submittedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
  }
}

function handleReset() {
  Object.assign(form, {
    name: "",
    phone: "",
    company: "",
    role: "",
    district: "",
    certificateLevel: "",
    experienceYears: "1",
    joinedAt: new Date().toISOString().slice(0, 10),
    status: "在岗",
    note: "",
  })
  submittedRecord.value = null
}

function goBack() {
  router.push({ name: "users" })
}

let observer: IntersectionObserver | null = null
let headerStickyObserver: IntersectionObserver | null = null
let observerActive = false

onMounted(() => {
  nextTick(() => {
    syncAnchorItems()

    if (headerStickySentinel.value) {
      headerStickyObserver = new IntersectionObserver(
        ([entry]) => { isHeaderSticky.value = !entry.isIntersecting },
        { threshold: 0, rootMargin: "64px 0px 0px 0px" },
      )
      headerStickyObserver.observe(headerStickySentinel.value)
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (!observerActive) return
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
    <div ref="headerStickySentinel" class="h-px w-full -mt-4 shrink-0" aria-hidden="true" />
    <div
      class="sticky top-[-1rem] z-10 -mx-4 bg-background xl:-mt-px xl:ml-[calc(50%-50vw)] xl:w-screen"
      :class="{ 'border-b border-border': isHeaderSticky }"
    >
      <div class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-4 px-4 pb-4 pt-4 sm:gap-5 md:grid md:grid-cols-[minmax(0,1fr)_max-content] md:gap-8 xl:px-0">
        <h1 class="min-w-0 text-2xl font-semibold tracking-tight text-foreground">
          添加从业人员
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
                  当前已填写的从业人员信息都会被清空，此操作不可撤销。
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

    <div class="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_250px]">
      <form class="min-w-0 space-y-0" @submit.prevent="handleSubmit">
        <div ref="formSectionsRef" class="min-w-0 space-y-0">
          <div id="section-name" data-quick-nav-label="姓名" :class="formRowClass">
            <label :class="formLabelClass">姓名</label>
            <div :class="formFieldClass">
              <Input v-model="form.name" required placeholder="请输入从业人员姓名" class="w-full" @focus="handleFocus('section-name')" />
            </div>
          </div>

          <div id="section-phone" data-quick-nav-label="手机号" :class="formRowClass">
            <label :class="formLabelClass">手机号</label>
            <div :class="formFieldClass">
              <Input
                v-model="form.phone"
                required
                type="tel"
                inputmode="numeric"
                pattern="^1[3-9]\\d{9}$"
                placeholder="请输入 11 位手机号"
                class="w-full"
                @focus="handleFocus('section-phone')"
              />
            </div>
          </div>

          <div id="section-company" data-quick-nav-label="所属企业" :class="formRowClass">
            <label :class="formLabelClass">所属企业</label>
            <div :class="formFieldClass">
              <Input v-model="form.company" required placeholder="请输入企业名称" class="w-full" @focus="handleFocus('section-company')" />
            </div>
          </div>

          <div id="section-role" data-quick-nav-label="岗位类型" :class="formRowClass">
            <label :class="formLabelClass">岗位类型</label>
            <div :class="formFieldClass">
              <Select v-model="form.role" required>
                <SelectTrigger class="w-full" @focus="handleFocus('section-role')">
                  <SelectValue placeholder="请选择岗位类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="role in ROLE_OPTIONS" :key="role" :value="role">
                    {{ role }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div id="section-district" data-quick-nav-label="行政区域" :class="formRowClass">
            <label :class="formLabelClass">行政区域</label>
            <div :class="formFieldClass">
              <Select v-model="form.district" required>
                <SelectTrigger class="w-full" @focus="handleFocus('section-district')">
                  <SelectValue placeholder="请选择行政区域" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="district in DISTRICT_OPTIONS" :key="district" :value="district">
                    {{ district }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div id="section-joined-at" data-quick-nav-label="入职日期" :class="formRowClass">
            <label :class="formLabelClass">入职日期</label>
            <div :class="formFieldClass">
              <Popover>
                <PopoverTrigger as-child>
                  <Button
                    variant="outline"
                    :class="
                      cn(
                        'h-9 w-full justify-between px-3 text-left font-normal',
                        !form.joinedAt && 'text-muted-foreground',
                      )
                    "
                    @focus="handleFocus('section-joined-at')"
                  >
                    {{
                      form.joinedAt
                        ? joinedAtFormatter.format(parseDate(form.joinedAt).toDate(getLocalTimeZone()))
                        : "请选择入职日期"
                    }}
                    <i class="ri-calendar-line ml-2 shrink-0 text-base text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="start">
                  <Calendar
                    v-model="joinedAtValue"
                    initial-focus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div id="section-certificate" data-quick-nav-label="证件级别" :class="formRowClass">
            <label :class="formLabelClass">证件级别</label>
            <div :class="formFieldClass">
              <Select v-model="form.certificateLevel" required>
                <SelectTrigger class="w-full" @focus="handleFocus('section-certificate')">
                  <SelectValue placeholder="请选择证件级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="certificateLevel in CERTIFICATE_LEVEL_OPTIONS"
                    :key="certificateLevel"
                    :value="certificateLevel"
                  >
                    {{ certificateLevel }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div id="section-experience" data-quick-nav-label="从业年限" :class="formRowClass">
            <label :class="formLabelClass">从业年限</label>
            <div :class="formFieldClass">
              <NumberField
                v-model="experienceYearsValue"
                :min="0"
                :max="50"
                :step="1"
                class="w-full"
              >
                <NumberFieldContent>
                  <NumberFieldDecrement />
                  <NumberFieldInput
                    placeholder="请输入从业年限"
                    @focus="handleFocus('section-experience')"
                  />
                  <NumberFieldIncrement />
                </NumberFieldContent>
              </NumberField>
            </div>
          </div>

          <div id="section-status" data-quick-nav-label="状态" :class="formRowClass">
            <label :class="formLabelClass">状态</label>
            <div :class="formFieldClass">
              <Select v-model="form.status">
                <SelectTrigger class="w-full" @focus="handleFocus('section-status')">
                  <SelectValue placeholder="请选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="status in STATUS_OPTIONS" :key="status" :value="status">
                    {{ status }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            id="section-note"
            data-quick-nav-label="备注"
            :class="formRowLastTopClass"
          >
            <label :class="formLabelClass">
              备注
              <span class="font-normal text-muted-foreground">(选填)</span>
            </label>
            <div :class="formFieldClass">
              <textarea
                v-model="form.note"
                rows="4"
                class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="请输入备注信息，用于测试新增后的详情展示或列表回填。"
                @focus="handleFocus('section-note')"
              />
            </div>
          </div>
        </div>
      </form>

      <div class="hidden xl:block xl:self-start">
        <FormQuickNav
          v-if="anchorItems.length"
          class="sticky top-24"
          :items="anchorItems"
          :active-id="activeNavId"
          @select="scrollToSection"
        />

        <div
          v-if="submittedRecord"
          class="mt-4 rounded-md border border-border bg-muted/20 p-4 text-sm"
        >
          <p class="font-medium text-foreground">{{ submittedRecord.name }}</p>
          <p class="mt-1 text-muted-foreground">
            {{ submittedRecord.role }} / {{ submittedRecord.company }}
          </p>
          <p class="mt-3 text-xs text-muted-foreground">
            最近提交：{{ submittedRecord.submittedAt }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
