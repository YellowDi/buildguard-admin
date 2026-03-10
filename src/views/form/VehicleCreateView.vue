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

type VehicleFormState = {
  plateNumber: string
  company: string
  vehicleType: string
  district: string
  vin: string
  transportLicenseNo: string
  terminalInstalledAt: string
  annualCheckAt: string
  status: string
  note: string
}

type SubmittedVehicleRecord = VehicleFormState & {
  id: number
  submittedAt: string
}

type QuickNavItem = {
  id: string
  label: string
}

const VEHICLE_TYPE_OPTIONS = ["大型客车", "中型客车", "商务客车", "危险货物运输车", "重型半挂牵引车"]
const DISTRICT_OPTIONS = [
  "海曙区", "鄞州区", "北仑区", "宁海县", "慈溪市",
  "余姚市", "奉化区", "象山县", "江北区", "镇海区",
]
const STATUS_OPTIONS = ["运营中", "待复核", "停运"]

const router = useRouter()
const today = new Date().toISOString().slice(0, 10)
const nextMonth = new Date()
nextMonth.setMonth(nextMonth.getMonth() + 1)

const form = reactive<VehicleFormState>({
  plateNumber: "",
  company: "",
  vehicleType: "",
  district: "",
  vin: "",
  transportLicenseNo: "",
  terminalInstalledAt: today,
  annualCheckAt: nextMonth.toISOString().slice(0, 10),
  status: "运营中",
  note: "",
})

const submittedRecord = ref<SubmittedVehicleRecord | null>(null)
const anchorItems = ref<QuickNavItem[]>([])
const activeNavId = ref("")
const formSectionsRef = ref<HTMLElement | null>(null)
const STICKY_HEADER_OFFSET = 112
const dateFormatter = new DateFormatter("zh-CN", { dateStyle: "long" })

const canSubmit = computed(() =>
  Boolean(
    form.plateNumber.trim()
    && form.company.trim()
    && form.vehicleType.trim()
    && form.district.trim()
    && form.vin.trim()
    && form.transportLicenseNo.trim()
    && form.terminalInstalledAt.trim()
    && form.annualCheckAt.trim(),
  ),
)

const terminalInstalledAtValue = computed({
  get: () => (form.terminalInstalledAt ? parseDate(form.terminalInstalledAt) : undefined),
  set: (value: { toString: () => string } | undefined) => {
    form.terminalInstalledAt = value?.toString() ?? ""
  },
})

const annualCheckAtValue = computed({
  get: () => (form.annualCheckAt ? parseDate(form.annualCheckAt) : undefined),
  set: (value: { toString: () => string } | undefined) => {
    form.annualCheckAt = value?.toString() ?? ""
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
    plateNumber: "",
    company: "",
    vehicleType: "",
    district: "",
    vin: "",
    transportLicenseNo: "",
    terminalInstalledAt: today,
    annualCheckAt: nextMonth.toISOString().slice(0, 10),
    status: "运营中",
    note: "",
  })
  submittedRecord.value = null
}

function goBack() {
  router.push({ name: "vehicles" })
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
      title="添加车辆"
      :primary-action="{ label: '添加', icon: 'ri-add-line', disabled: !canSubmit }"
      :secondary-actions="[
        { key: 'back', label: '返回列表' },
        { key: 'reset', label: '重置表单' },
      ]"
      :reset-dialog="{ description: '当前已填写的车辆信息都会被清空，此操作不可撤销。' }"
      @back="goBack"
      @reset="handleReset"
      @submit="handleSubmit"
    />

    <div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]">
      <form class="min-w-0 space-y-0" @submit.prevent="handleSubmit">
        <div ref="formSectionsRef" class="min-w-0 space-y-0">
          <FormFieldSection
            id="section-plate-number"
            quick-nav-label="车牌号"
            label="车牌号"
            label-for="vehicle-plate-number"
          >
            <Input id="vehicle-plate-number" v-model="form.plateNumber" required placeholder="请输入车牌号" class="w-full" @focus="handleFocus('section-plate-number')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-company"
            quick-nav-label="所属企业"
            label="所属企业"
            label-for="vehicle-company"
          >
            <Input id="vehicle-company" v-model="form.company" required placeholder="请输入所属企业名称" class="w-full" @focus="handleFocus('section-company')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-vehicle-type"
            quick-nav-label="车辆类型"
            label="车辆类型"
            label-for="vehicle-type"
          >
            <Select v-model="form.vehicleType" required>
              <SelectTrigger id="vehicle-type" class="w-full" @focus="handleFocus('section-vehicle-type')">
                <SelectValue placeholder="请选择车辆类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="vehicleType in VEHICLE_TYPE_OPTIONS" :key="vehicleType" :value="vehicleType">
                  {{ vehicleType }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormFieldSection>

          <FormFieldSection
            id="section-district"
            quick-nav-label="行政区域"
            label="行政区域"
            label-for="vehicle-district"
          >
            <Select v-model="form.district" required>
              <SelectTrigger id="vehicle-district" class="w-full" @focus="handleFocus('section-district')">
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
            id="section-vin"
            quick-nav-label="车架号"
            label="车架号"
            label-for="vehicle-vin"
          >
            <Input id="vehicle-vin" v-model="form.vin" required placeholder="请输入 17 位车架号" class="w-full" @focus="handleFocus('section-vin')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-license"
            quick-nav-label="道路运输证号"
            label="道路运输证号"
            label-for="vehicle-license"
          >
            <Input id="vehicle-license" v-model="form.transportLicenseNo" required placeholder="请输入道路运输证号" class="w-full" @focus="handleFocus('section-license')" />
          </FormFieldSection>

          <FormFieldSection
            id="section-terminal-installed-at"
            quick-nav-label="终端安装日期"
            label="终端安装日期"
            label-for="vehicle-terminal-installed-at"
          >
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  id="vehicle-terminal-installed-at"
                  variant="outline"
                  :class="
                    cn(
                      'w-full justify-start text-left font-normal',
                      !form.terminalInstalledAt && 'text-muted-foreground',
                    )
                  "
                  @focus="handleFocus('section-terminal-installed-at')"
                >
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{
                    form.terminalInstalledAt
                      ? dateFormatter.format(parseDate(form.terminalInstalledAt).toDate(getLocalTimeZone()))
                      : "请选择终端安装日期"
                  }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <Calendar
                  v-model="terminalInstalledAtValue"
                  layout="month-and-year"
                  locale="zh-CN"
                  initial-focus
                />
              </PopoverContent>
            </Popover>
          </FormFieldSection>

          <FormFieldSection
            id="section-annual-check-at"
            quick-nav-label="下次年检日期"
            label="下次年检日期"
            label-for="vehicle-annual-check-at"
          >
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  id="vehicle-annual-check-at"
                  variant="outline"
                  :class="
                    cn(
                      'w-full justify-start text-left font-normal',
                      !form.annualCheckAt && 'text-muted-foreground',
                    )
                  "
                  @focus="handleFocus('section-annual-check-at')"
                >
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{
                    form.annualCheckAt
                      ? dateFormatter.format(parseDate(form.annualCheckAt).toDate(getLocalTimeZone()))
                      : "请选择下次年检日期"
                  }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <Calendar
                  v-model="annualCheckAtValue"
                  layout="month-and-year"
                  locale="zh-CN"
                  initial-focus
                />
              </PopoverContent>
            </Popover>
          </FormFieldSection>

          <FormFieldSection
            id="section-status"
            quick-nav-label="车辆状态"
            label="车辆状态"
            label-for="vehicle-status"
          >
            <Select v-model="form.status">
              <SelectTrigger id="vehicle-status" class="w-full" @focus="handleFocus('section-status')">
                <SelectValue placeholder="请选择车辆状态" />
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
            label-for="vehicle-note"
            align="start"
            last
          >
            <template #label>
              备注
              <span class="font-normal text-muted-foreground">(选填)</span>
            </template>
            <Textarea
              id="vehicle-note"
              v-model="form.note"
              rows="4"
              placeholder="请输入备注信息，用于补充车辆营运、终端或证照状态。"
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
          <p class="font-medium text-foreground">{{ submittedRecord.plateNumber }}</p>
          <p class="mt-1 text-muted-foreground">
            {{ submittedRecord.vehicleType }} / {{ submittedRecord.company }}
          </p>
          <p class="mt-3 text-xs text-muted-foreground">
            最近提交：{{ submittedRecord.submittedAt }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
