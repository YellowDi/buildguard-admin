<script setup lang="ts">
import { computed, ref } from "vue"

import type { ResourceDateFilterOperator, ResourceDateFilterPreset, ResourceDateFilterState } from "@/components/resource/types"

const props = defineProps<{
  title: string
  value: ResourceDateFilterState
  fields?: string[]
}>()

const emit = defineEmits<{
  close: []
  remove: []
  "switch-field": [field: string]
  "update:value": [value: ResourceDateFilterState]
}>()

const openFieldMenu = ref(false)
const openOperatorMenu = ref(false)
const openActionMenu = ref(false)
const openPresetMenu = ref(false)
const viewMonth = ref(getInitialViewMonth())
const activeRangeField = ref<"start" | "end">("start")

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"]
const operatorOptions: Array<{ value: ResourceDateFilterOperator; label: string }> = [
  { value: "equals", label: "是" },
  { value: "before", label: "早于" },
  { value: "after", label: "晚于" },
  { value: "onOrBefore", label: "不晚于" },
  { value: "onOrAfter", label: "不早于" },
  { value: "between", label: "介于" },
  { value: "relativeToToday", label: "相对于今天" },
  { value: "isEmpty", label: "为空白" },
  { value: "isNotEmpty", label: "不为空白" },
]
const presetOptions: Array<{ value: ResourceDateFilterPreset; label: string }> = [
  { value: "today", label: "今天" },
  { value: "tomorrow", label: "明天" },
  { value: "yesterday", label: "昨天" },
  { value: "oneWeekAgo", label: "一周前" },
  { value: "oneWeekAfter", label: "一周后" },
  { value: "oneMonthAgo", label: "一个月前" },
  { value: "oneMonthAfter", label: "一个月后" },
  { value: "custom", label: "自定义日期" },
]

const calendarDays = computed(() => buildCalendarDays(viewMonth.value))

function getInitialViewMonth() {
  if (props.value.startDate) {
    const date = new Date(`${props.value.startDate}T00:00:00`)
    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }

  return new Date()
}

function getOperatorLabel(operator: ResourceDateFilterOperator) {
  return operatorOptions.find((option) => option.value === operator)?.label ?? "是"
}

function getPresetLabel(preset: ResourceDateFilterPreset) {
  return presetOptions.find((option) => option.value === preset)?.label ?? "自定义日期"
}

function operatorNeedsDateInput(operator: ResourceDateFilterOperator) {
  return operator !== "isEmpty" && operator !== "isNotEmpty"
}

function formatMonthTitle(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

function formatDisplayValue() {
  if (!operatorNeedsDateInput(props.value.operator)) {
    return ""
  }

  if (props.value.operator === "relativeToToday") {
    return getPresetLabel(props.value.preset)
  }

  if (props.value.operator === "between") {
    if (props.value.startDate && props.value.endDate) {
      return `${props.value.startDate} - ${props.value.endDate}`
    }

    if (props.value.startDate) {
      return props.value.startDate
    }
  }

  return props.value.startDate
}

function isBetweenOperator() {
  return props.value.operator === "between"
}

function buildCalendarDays(baseDate: Date) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - startWeekday)
  const todayIso = toISODate(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart)
    current.setDate(gridStart.getDate() + index)
    const iso = toISODate(current)
    const startDate = props.value.startDate
    const endDate = props.value.endDate
    const inRange = Boolean(startDate && endDate && iso > startDate && iso < endDate)
    return {
      iso,
      label: current.getDate(),
      muted: current.getMonth() !== month,
      selected: iso === startDate || iso === endDate,
      rangeStart: Boolean(startDate && iso === startDate),
      rangeEnd: Boolean(endDate && iso === endDate),
      inRange,
      today: iso === todayIso,
    }
  })
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getRelativeDate(preset: ResourceDateFilterPreset) {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (preset === "tomorrow") {
    date.setDate(date.getDate() + 1)
  }
  else if (preset === "yesterday") {
    date.setDate(date.getDate() - 1)
  }
  else if (preset === "oneWeekAgo") {
    date.setDate(date.getDate() - 7)
  }
  else if (preset === "oneWeekAfter") {
    date.setDate(date.getDate() + 7)
  }
  else if (preset === "oneMonthAgo") {
    date.setMonth(date.getMonth() - 1)
  }
  else if (preset === "oneMonthAfter") {
    date.setMonth(date.getMonth() + 1)
  }

  return toISODate(date)
}

function updateValue(patch: Partial<ResourceDateFilterState>) {
  const nextValue = {
    ...props.value,
    ...patch,
  }

  emit("update:value", {
    ...nextValue,
    enabled: operatorNeedsDateInput(nextValue.operator)
      ? Boolean(nextValue.startDate || (nextValue.operator === "between" && nextValue.endDate))
      : true,
  })
}

function handleOperatorSelect(operator: ResourceDateFilterOperator) {
  const clearDates = operatorNeedsDateInput(operator)
    ? {}
    : { startDate: "", endDate: "", preset: "custom" as ResourceDateFilterPreset }

  updateValue({
    operator,
    ...clearDates,
  })
  activeRangeField.value = "start"
  openFieldMenu.value = false
  openOperatorMenu.value = false
  openActionMenu.value = false
  openPresetMenu.value = false
}

function handleFieldSelect(field: string) {
  if (field === props.title) {
    openFieldMenu.value = false
    return
  }

  openFieldMenu.value = false
  openOperatorMenu.value = false
  openActionMenu.value = false
  openPresetMenu.value = false
  emit("switch-field", field)
}

function handlePresetSelect(preset: ResourceDateFilterPreset) {
  if (preset === "custom") {
    updateValue({
      preset,
      operator: props.value.operator === "relativeToToday" ? "equals" : props.value.operator,
    })
    openPresetMenu.value = false
    return
  }

  const date = getRelativeDate(preset)
  updateValue({
    preset,
    operator: "relativeToToday",
    startDate: date,
    endDate: "",
  })
  openPresetMenu.value = false
}

function handleDateInput(value: string) {
  updateValue({
    startDate: value,
    endDate: props.value.operator === "between" ? props.value.endDate : "",
    preset: "custom",
  })
}

function handleBetweenDateInput(boundary: "start" | "end", value: string) {
  activeRangeField.value = boundary
  updateValue({
    startDate: boundary === "start" ? value : props.value.startDate,
    endDate: boundary === "end" ? value : props.value.endDate,
    preset: "custom",
  })
}

function focusRangeField(boundary: "start" | "end") {
  activeRangeField.value = boundary
}

function clearSingleDateInput() {
  updateValue({
    startDate: "",
    endDate: "",
    preset: "custom",
  })
}

function clearBetweenDateInput(boundary: "start" | "end") {
  activeRangeField.value = boundary
  updateValue({
    startDate: boundary === "start" ? "" : props.value.startDate,
    endDate: boundary === "end" ? "" : props.value.endDate,
    preset: "custom",
  })
}

function handleDaySelect(iso: string) {
  viewMonth.value = new Date(`${iso}T00:00:00`)

  if (props.value.operator === "between") {
    if (activeRangeField.value === "end" && props.value.startDate) {
      const start = props.value.startDate <= iso ? props.value.startDate : iso
      const end = props.value.startDate <= iso ? iso : props.value.startDate
      updateValue({
        startDate: start,
        endDate: end,
        preset: "custom",
      })
      return
    }

    if (!props.value.startDate || props.value.endDate) {
      updateValue({
        startDate: iso,
        endDate: "",
        preset: "custom",
      })
      activeRangeField.value = "end"
      return
    }

    const start = props.value.startDate <= iso ? props.value.startDate : iso
    const end = props.value.startDate <= iso ? iso : props.value.startDate
    updateValue({
      startDate: start,
      endDate: end,
      preset: "custom",
    })
    activeRangeField.value = "end"
    return
  }

  updateValue({
    startDate: iso,
    endDate: "",
    preset: "custom",
  })
}

function shiftMonth(step: number) {
  const nextDate = new Date(viewMonth.value)
  nextDate.setMonth(nextDate.getMonth() + step)
  viewMonth.value = nextDate
}

function handleDeleteFilter() {
  openFieldMenu.value = false
  openOperatorMenu.value = false
  openActionMenu.value = false
  emit("remove")
  emit("close")
}
</script>

<template>
  <div
    class="w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#E5E7EB] bg-white p-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.10)]"
    data-list-popover
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-1.5 text-[12px] font-semibold text-[#666]">
        <div class="relative" data-list-popover>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-sm px-1 text-[#666] ring-offset-background transition hover:text-[#303030] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            @click="openFieldMenu = !openFieldMenu; openOperatorMenu = false; openActionMenu = false"
          >
            <span>{{ title }}</span>
            <i class="ri-arrow-down-s-line text-[16px]" />
          </button>

          <div
            v-if="openFieldMenu && (props.fields?.length ?? 0) > 0"
            class="absolute left-0 top-[calc(100%+8px)] z-40 min-w-[156px] rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
            data-list-popover
          >
            <button
              v-for="field in props.fields"
              :key="field"
              type="button"
              :class="[
                'flex w-full items-center rounded-md px-3 py-2 text-left text-[12px] font-medium transition',
                title === field ? 'bg-[#F4F4F5] text-[#18181B]' : 'text-[#52525B] hover:bg-[#F8F8F9]',
              ]"
              @click="handleFieldSelect(field)"
            >
              <span>{{ field }}</span>
            </button>
          </div>
        </div>

        <div class="relative" data-list-popover>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-sm px-1 text-[#666] ring-offset-background transition hover:text-[#303030] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            @click="openOperatorMenu = !openOperatorMenu; openFieldMenu = false; openActionMenu = false"
          >
            <span>{{ getOperatorLabel(value.operator) }}</span>
            <i class="ri-arrow-down-s-line text-[16px]" />
          </button>

          <div
            v-if="openOperatorMenu"
            class="absolute left-0 top-[calc(100%+8px)] z-40 min-w-[156px] rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
            data-list-popover
          >
            <button
              v-for="option in operatorOptions"
              :key="option.value"
              type="button"
              :class="[
                'flex w-full items-center rounded-md px-3 py-2 text-left text-[12px] font-medium transition',
                value.operator === option.value ? 'bg-[#F4F4F5] text-[#18181B]' : 'text-[#52525B] hover:bg-[#F8F8F9]',
              ]"
              @click="handleOperatorSelect(option.value)"
            >
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="relative shrink-0" data-list-popover>
        <button
          type="button"
          class="inline-flex size-6 items-center justify-center rounded-md text-[#8B8B8B] ring-offset-background transition hover:bg-[#F5F5F5] hover:text-[#4B4B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="删除当前筛选"
          @click="openActionMenu = !openActionMenu; openFieldMenu = false; openOperatorMenu = false"
        >
          <i class="ri-more-line text-[14px]" />
        </button>

        <div
          v-if="openActionMenu"
          class="absolute left-[calc(100%+6px)] top-1/2 z-40 min-w-[104px] -translate-y-1/2 rounded-md border border-[#E5E7EB] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
          data-list-popover
        >
          <button
            type="button"
            class="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[11px] font-medium text-[#B42318] transition hover:bg-[#FEF3F2]"
            @click="handleDeleteFilter"
          >
            删除筛选
          </button>
        </div>
      </div>
    </div>

    <div class="mt-2.5">
      <div
        v-if="isBetweenOperator()"
        class="grid grid-cols-2 gap-2"
      >
        <label
          class="flex h-9 items-center rounded-md border border-[#E4E4E7] bg-white px-3 ring-offset-background transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        >
          <input
            :value="value.startDate"
            type="text"
            placeholder="开始日期..."
            class="w-full border-0 bg-transparent p-0 text-[12px] text-[#303030] outline-none placeholder:text-[#B4B4B4]"
            @focus="focusRangeField('start')"
            @input="handleBetweenDateInput('start', ($event.target as HTMLInputElement).value)"
          >
          <button
            v-if="value.startDate"
            type="button"
            class="ml-2 inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-[#A1A1AA] transition hover:bg-[#F5F5F5] hover:text-[#52525B]"
            aria-label="清空开始日期"
            @mousedown.prevent.stop
            @click.stop="clearBetweenDateInput('start')"
          >
            <i class="ri-close-line text-[13px]" />
          </button>
        </label>

        <label
          class="flex h-9 items-center rounded-md border border-[#E4E4E7] bg-white px-3 ring-offset-background transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        >
          <input
            :value="value.endDate"
            type="text"
            placeholder="结束日期..."
            class="w-full border-0 bg-transparent p-0 text-[12px] text-[#303030] outline-none placeholder:text-[#B4B4B4]"
            @focus="focusRangeField('end')"
            @input="handleBetweenDateInput('end', ($event.target as HTMLInputElement).value)"
          >
          <button
            v-if="value.endDate"
            type="button"
            class="ml-2 inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-[#A1A1AA] transition hover:bg-[#F5F5F5] hover:text-[#52525B]"
            aria-label="清空结束日期"
            @mousedown.prevent.stop
            @click.stop="clearBetweenDateInput('end')"
          >
            <i class="ri-close-line text-[13px]" />
          </button>
        </label>
      </div>

      <label
        v-else
        :class="[
          'flex h-9 items-center rounded-md border px-3 ring-offset-background transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          operatorNeedsDateInput(value.operator) ? 'border-[#E4E4E7] bg-white' : 'cursor-not-allowed border-[#ECECEC] bg-[#F8F8F8] opacity-70',
        ]"
      >
        <input
          :value="formatDisplayValue()"
          type="text"
          :disabled="!operatorNeedsDateInput(value.operator)"
          placeholder="选择或输入日期..."
          :class="[
            'w-full border-0 bg-transparent p-0 text-[12px] text-[#303030] outline-none placeholder:text-[#B4B4B4]',
            operatorNeedsDateInput(value.operator) ? '' : 'cursor-not-allowed text-[#B4B4B4]',
          ]"
          @input="handleDateInput(($event.target as HTMLInputElement).value)"
        >
        <button
          v-if="formatDisplayValue()"
          type="button"
          class="ml-2 inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-[#A1A1AA] transition hover:bg-[#F5F5F5] hover:text-[#52525B]"
          aria-label="清空日期"
          @mousedown.prevent.stop
          @click.stop="clearSingleDateInput"
        >
          <i class="ri-close-line text-[13px]" />
        </button>
        <div class="relative ml-2 shrink-0" data-list-popover>
          <button
            type="button"
            class="inline-flex size-6 items-center justify-center rounded-md text-[#A1A1AA] transition hover:bg-[#F5F5F5] hover:text-[#52525B]"
            :disabled="!operatorNeedsDateInput(value.operator)"
            @click="openPresetMenu = !openPresetMenu"
          >
            <i class="ri-arrow-down-s-line text-[16px]" />
          </button>

          <div
            v-if="openPresetMenu && operatorNeedsDateInput(value.operator)"
            class="absolute right-0 top-[calc(100%+8px)] z-40 min-w-[148px] rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
            data-list-popover
          >
            <button
              v-for="option in presetOptions"
              :key="option.value"
              type="button"
              :class="[
                'flex w-full items-center rounded-md px-3 py-2 text-left text-[12px] transition',
                value.preset === option.value ? 'bg-[#F4F4F5] text-[#18181B]' : 'text-[#52525B] hover:bg-[#F8F8F9]',
              ]"
              @click="handlePresetSelect(option.value)"
            >
              <span>{{ option.label }}</span>
              <i v-if="value.preset === option.value" class="ri-check-line ml-auto text-[14px] text-[#18181B]" />
            </button>
          </div>
        </div>
      </label>
    </div>

    <div
      v-if="operatorNeedsDateInput(value.operator)"
      class="mt-2.5"
    >
      <div>
        <div class="flex items-center justify-between">
          <h4 class="text-[14px] font-semibold text-[#2E2E2E]">{{ formatMonthTitle(viewMonth) }}</h4>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="inline-flex size-7 items-center justify-center rounded-full text-[#707070] ring-offset-background transition hover:bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              @click="shiftMonth(-1)"
            >
              <i class="ri-arrow-left-s-line text-[18px]" />
            </button>
            <button
              type="button"
              class="inline-flex size-7 items-center justify-center rounded-full text-[#707070] ring-offset-background transition hover:bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              @click="shiftMonth(1)"
            >
              <i class="ri-arrow-right-s-line text-[18px]" />
            </button>
          </div>
        </div>

        <div class="mt-2 grid grid-cols-7 text-center text-[11px] text-[#98A2A2]">
          <div v-for="weekday in weekdayLabels" :key="weekday" class="py-1 font-medium">
            {{ weekday }}
          </div>
        </div>

        <div class="mt-1 grid grid-cols-7 gap-y-0.5 text-center">
          <div
            v-for="day in calendarDays"
            :key="day.iso"
            class="relative flex h-10 items-center justify-center"
          >
            <span
              v-if="day.inRange || (isBetweenOperator() && day.rangeStart) || (isBetweenOperator() && day.rangeEnd)"
              :class="[
                'pointer-events-none absolute inset-y-1 bg-[#DDE9FB]',
                day.inRange ? 'inset-x-0' : '',
                day.rangeStart && day.rangeEnd ? 'inset-x-1 rounded-full' : '',
                day.rangeStart && !day.rangeEnd ? 'left-1 right-0 rounded-l-full' : '',
                day.rangeEnd && !day.rangeStart ? 'left-0 right-1 rounded-r-full' : '',
              ]"
            />

            <button
              type="button"
              :class="[
                'relative z-10 inline-flex h-10 min-w-10 items-center justify-center rounded-full px-0 text-[12px] ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                day.selected
                  ? 'bg-[#2F7DE1] text-white shadow-[0_4px_10px_rgba(47,125,225,0.18)]'
                  : day.today
                    ? 'rounded-full bg-[#E56D5B] text-white shadow-[0_4px_10px_rgba(229,109,91,0.22)]'
                    : day.muted
                      ? 'text-[#9BA6A7]'
                      : 'text-[#2E2E2E] hover:bg-[#F5F7FA]',
              ]"
              @click="handleDaySelect(day.iso)"
            >
              {{ day.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
