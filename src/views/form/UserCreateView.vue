<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date"
import { Calendar as CalendarIcon } from "lucide-vue-next"
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"

import FormFieldSection from "@/components/form/FormFieldSection.vue"
import FormHeader from "@/components/form/FormHeader.vue"
import FormQuickNav from "@/components/form/FormQuickNav.vue"
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
import { Textarea } from "@/components/ui/textarea"
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
const formSectionsRef = ref<HTMLElement | null>(null)
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

let observer: IntersectionObserver | null = null
let observerActive = false

onMounted(() => {
  nextTick(() => {
    syncAnchorItems()

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
})
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <FormHeader
      title="添加从业人员"
      :primary-action="{ label: '添加', icon: 'ri-add-line', disabled: !canSubmit }"
      :secondary-actions="[{ key: 'reset', label: '重置表单' }]"
      :reset-dialog="{ description: '当前已填写的从业人员信息都会被清空，此操作不可撤销。' }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]">
      <form class="min-w-0 space-y-0" @submit.prevent="handleSubmit">
        <div ref="formSectionsRef" class="min-w-0 space-y-0">
          <FormFieldSection
            id="section-name"
            quick-nav-label="姓名"
            label="姓名"
            label-for="user-name"
          >
            <Input id="user-name" v-model="form.name" required placeholder="请输入从业人员姓名" class="w-full" @focus="handleFocus('section-name')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-phone"
            quick-nav-label="手机号"
            label="手机号"
            label-for="user-phone"
          >
            <Input
              id="user-phone"
              v-model="form.phone"
              required
              type="tel"
              inputmode="numeric"
              pattern="^1[3-9]\\d{9}$"
              placeholder="请输入 11 位手机号"
              class="w-full"
              @focus="handleFocus('section-phone')"
            />
          </FormFieldSection>

          <FormFieldSection
            id="section-company"
            quick-nav-label="所属企业"
            label="所属企业"
            label-for="user-company"
          >
            <Input id="user-company" v-model="form.company" required placeholder="请输入企业名称" class="w-full" @focus="handleFocus('section-company')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-role"
            quick-nav-label="岗位类型"
            label="岗位类型"
            label-for="user-role"
          >
            <Select v-model="form.role" required>
              <SelectTrigger id="user-role" class="w-full" @focus="handleFocus('section-role')">
                <SelectValue placeholder="请选择岗位类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="role in ROLE_OPTIONS" :key="role" :value="role">
                  {{ role }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-district"
            quick-nav-label="行政区域"
            label="行政区域"
            label-for="user-district"
          >
            <Select v-model="form.district" required>
              <SelectTrigger id="user-district" class="w-full" @focus="handleFocus('section-district')">
                <SelectValue placeholder="请选择行政区域" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="district in DISTRICT_OPTIONS" :key="district" :value="district">
                  {{ district }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-joined-at"
            quick-nav-label="入职日期"
            label="入职日期"
            label-for="user-joined-at"
          >
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  id="user-joined-at"
                  variant="outline"
                  :class="
                    cn(
                      'w-full justify-start text-left font-normal',
                      !form.joinedAt && 'text-muted-foreground',
                    )
                  "
                  @focus="handleFocus('section-joined-at')"
                >
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{
                    form.joinedAt
                      ? joinedAtFormatter.format(parseDate(form.joinedAt).toDate(getLocalTimeZone()))
                      : "请选择入职日期"
                  }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <Calendar
                  v-model="joinedAtValue"
                  layout="month-and-year"
                  locale="zh-CN"
                  initial-focus
                />
              </PopoverContent>
            </Popover>
          </FormFieldSection>

          <FormFieldSection
            id="section-certificate"
            quick-nav-label="证件级别"
            label="证件级别"
            label-for="user-certificate"
          >
            <Select v-model="form.certificateLevel" required>
              <SelectTrigger id="user-certificate" class="w-full" @focus="handleFocus('section-certificate')">
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
          </FormFieldSection>

          <FormFieldSection
            id="section-experience"
            quick-nav-label="从业年限"
            label="从业年限"
          >
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
          </FormFieldSection>

          <FormFieldSection
            id="section-status"
            quick-nav-label="状态"
            label="状态"
            label-for="user-status"
          >
            <Select v-model="form.status">
              <SelectTrigger id="user-status" class="w-full" @focus="handleFocus('section-status')">
                <SelectValue placeholder="请选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="status in STATUS_OPTIONS" :key="status" :value="status">
                  {{ status }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-note"
            quick-nav-label="备注"
            label-for="user-note"
            align="start"
            last
          >
            <template #label>
              备注
              <span class="font-normal text-muted-foreground">(选填)</span>
            </template>
            <Textarea
              id="user-note"
              v-model="form.note"
              rows="4"
              placeholder="请输入备注信息，用于测试新增后的详情展示或列表回填。"
              @focus="handleFocus('section-note')"
            />
          </FormFieldSection>
        </div>
      </form>

      <div class="hidden lg:block lg:self-start">
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
