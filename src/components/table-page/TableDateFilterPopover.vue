<script setup lang="ts">
import { getLocalTimeZone, parseDate, today } from "@internationalized/date"
import { computed, nextTick, onMounted, ref, watch } from "vue"

import PopoverSelect from "@/components/table-page/TablePopoverSelect.vue"
import { Calendar, RangeCalendar } from "@/components/ui/calendar"
import type { DateFilterOperator, DateFilterPreset, DateFilterState } from "@/components/table-page/types"

const props = defineProps<{
  title: string
  value: DateFilterState
  fields?: string[]
}>()

const emit = defineEmits<{
  close: []
  remove: []
  "switch-field": [field: string]
  "update:value": [value: DateFilterState]
}>()

const openActionMenu = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const calendarPlaceholder = ref<any>(getInitialPlaceholder())
const operatorOptions: Array<{ value: DateFilterOperator; label: string }> = [
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
const presetOptions: Array<{ value: DateFilterPreset; label: string }> = [
  { value: "today", label: "今天" },
  { value: "tomorrow", label: "明天" },
  { value: "yesterday", label: "昨天" },
  { value: "oneWeekAgo", label: "一周前" },
  { value: "oneWeekAfter", label: "一周后" },
  { value: "oneMonthAgo", label: "一个月前" },
  { value: "oneMonthAfter", label: "一个月后" },
  { value: "custom", label: "自定义日期" },
]

const singleCalendarValue = computed<any>({
  get: () => parseIsoDate(props.value.startDate),
  set: (date) => {
    updateValue({
      startDate: date?.toString() ?? "",
      endDate: "",
      preset: "custom",
    })
    if (date) {
      calendarPlaceholder.value = date
    }
  },
})

const rangeCalendarValue = computed({
  get: () => ({
    start: parseIsoDate(props.value.startDate),
    end: parseIsoDate(props.value.endDate),
  }),
  set: (range) => {
    updateValue({
      startDate: range?.start?.toString() ?? "",
      endDate: range?.end?.toString() ?? "",
      preset: "custom",
    })
    if (range?.start) {
      calendarPlaceholder.value = range.start
    }
  },
})

function getInitialPlaceholder() {
  return parseIsoDate(props.value.startDate) ?? today(getLocalTimeZone())
}

function parseIsoDate(value?: string) {
  if (!value) {
    return undefined
  }

  try {
    return parseDate(value) as any
  }
  catch {
    return undefined
  }
}

function getOperatorLabel(operator: DateFilterOperator) {
  return operatorOptions.find((option) => option.value === operator)?.label ?? "是"
}

function getPresetLabel(preset: DateFilterPreset) {
  return presetOptions.find((option) => option.value === preset)?.label ?? "自定义日期"
}

function operatorNeedsDateInput(operator: DateFilterOperator) {
  return operator !== "isEmpty" && operator !== "isNotEmpty"
}

function formatDisplayValue() {
  if (!operatorNeedsDateInput(props.value.operator)) {
    return ""
  }

  if (props.value.operator === "relativeToToday") {
    return props.value.startDate
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

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getRelativeDate(preset: DateFilterPreset) {
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

function updateValue(patch: Partial<DateFilterState>) {
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

function handleOperatorSelect(operator: DateFilterOperator) {
  const clearDates = operatorNeedsDateInput(operator)
    ? {}
    : { startDate: "", endDate: "", preset: "custom" as DateFilterPreset }

  updateValue({
    operator,
    ...clearDates,
  })
  openActionMenu.value = false
}

function handleFieldSelect(field: string) {
  if (field === props.title) {
    return
  }

  openActionMenu.value = false
  emit("switch-field", field)
}

function handlePresetSelect(preset: DateFilterPreset) {
  if (preset === "custom") {
    updateValue({
      preset,
      operator: props.value.operator === "relativeToToday" ? "equals" : props.value.operator,
    })
    return
  }

  const date = getRelativeDate(preset)
  updateValue({
    preset,
    operator: "relativeToToday",
    startDate: date,
    endDate: "",
  })
}

function handleDateInput(value: string) {
  updateValue({
    startDate: value,
    endDate: props.value.operator === "between" ? props.value.endDate : "",
    preset: "custom",
  })
}

function handleBetweenDateInput(boundary: "start" | "end", value: string) {
  updateValue({
    startDate: boundary === "start" ? value : props.value.startDate,
    endDate: boundary === "end" ? value : props.value.endDate,
    preset: "custom",
  })
}

function clearSingleDateInput() {
  updateValue({
    startDate: "",
    endDate: "",
    preset: "custom",
  })
}

function clearBetweenDateInput(boundary: "start" | "end") {
  updateValue({
    startDate: boundary === "start" ? "" : props.value.startDate,
    endDate: boundary === "end" ? "" : props.value.endDate,
    preset: "custom",
  })
}

function handleDeleteFilter() {
  openActionMenu.value = false
  emit("remove")
  emit("close")
}

function focusSingleInput() {
  nextTick(() => {
    const inputs = rootRef.value?.querySelectorAll<HTMLInputElement>("input:not([disabled])") ?? []
    if (inputs.length !== 1) {
      return
    }

    const [input] = inputs
    input.focus()
    const cursorPosition = input.value.length
    input.setSelectionRange(cursorPosition, cursorPosition)
  })
}

onMounted(() => {
  focusSingleInput()
})

watch(
  () => [props.value.operator, props.value.preset] as const,
  () => {
    if (!operatorNeedsDateInput(props.value.operator)) {
      return
    }

    focusSingleInput()
  },
)
</script>

<template>
  <div
    ref="rootRef"
    class="w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-card)]"
    data-list-popover
  >
    <div class="p-2.5">
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 flex-1 items-center gap-2.5">
          <PopoverSelect
            v-if="(props.fields?.length ?? 0) > 0"
            :model-value="title"
            :options="(props.fields ?? []).map(field => ({ value: field, label: field }))"
            :placeholder="title"
            trigger-label="筛选字段"
            content-class="min-w-[156px]"
            @update:model-value="(field) => handleFieldSelect(String(field))"
          />

          <span v-else class="truncate text-[12px] font-semibold leading-none text-muted-foreground">{{ title }}</span>

          <PopoverSelect
            :model-value="value.operator"
            :options="operatorOptions"
            :placeholder="getOperatorLabel(value.operator)"
            trigger-label="筛选条件"
            content-class="min-w-[156px]"
            @update:model-value="(operator) => handleOperatorSelect(operator as DateFilterOperator)"
          />
        </div>

        <div class="relative shrink-0" data-list-popover>
          <button
            type="button"
            class="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground ring-offset-background transition hover:bg-surface-tertiary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0"
            aria-label="删除当前筛选"
            @click="openActionMenu = !openActionMenu"
          >
            <i class="ri-more-line text-[14px]" />
          </button>

          <div
            v-if="openActionMenu"
            class="absolute left-[calc(100%+6px)] top-1/2 z-40 min-w-[104px] -translate-y-1/2 rounded-md border border-border bg-popover p-1 shadow-[var(--shadow-card)]"
            data-list-popover
          >
            <button
              type="button"
              class="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[11px] font-medium text-destructive transition hover:bg-destructive/10"
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
            class="border-input dark:bg-input/30 flex h-9 items-center rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 md:text-sm"
          >
            <input
              :value="value.startDate"
              type="text"
              placeholder="开始日期..."
              class="w-full border-0 bg-transparent p-0 text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              @input="handleBetweenDateInput('start', ($event.target as HTMLInputElement).value)"
            >
            <button
              v-if="value.startDate"
              type="button"
              class="ml-2 inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-surface-tertiary hover:text-foreground"
              aria-label="清空开始日期"
              @mousedown.prevent.stop
              @click.stop="clearBetweenDateInput('start')"
            >
              <i class="ri-close-line text-[13px]" />
            </button>
          </label>

          <label
            class="border-input dark:bg-input/30 flex h-9 items-center rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 md:text-sm"
          >
            <input
              :value="value.endDate"
              type="text"
              placeholder="结束日期..."
              class="w-full border-0 bg-transparent p-0 text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              @input="handleBetweenDateInput('end', ($event.target as HTMLInputElement).value)"
            >
            <button
              v-if="value.endDate"
              type="button"
              class="ml-2 inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-surface-tertiary hover:text-foreground"
              aria-label="清空结束日期"
              @mousedown.prevent.stop
              @click.stop="clearBetweenDateInput('end')"
            >
              <i class="ri-close-line text-[13px]" />
            </button>
          </label>
        </div>

        <div v-else>
          <label
            :class="[
              'flex h-9 items-center rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm',
              operatorNeedsDateInput(value.operator)
                ? 'border-input bg-transparent dark:bg-input/30 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50'
                : 'cursor-not-allowed border-border bg-muted opacity-70',
            ]"
          >
            <input
              :value="formatDisplayValue()"
              type="text"
              :disabled="!operatorNeedsDateInput(value.operator)"
              placeholder="选择或输入日期..."
              :class="[
                'w-full border-0 bg-transparent p-0 text-[12px] text-foreground outline-none placeholder:text-muted-foreground',
                operatorNeedsDateInput(value.operator) ? '' : 'cursor-not-allowed text-muted-foreground',
              ]"
              @input="handleDateInput(($event.target as HTMLInputElement).value)"
            >
            <button
              v-if="formatDisplayValue()"
              type="button"
              class="ml-2 inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-surface-tertiary hover:text-foreground"
              aria-label="清空日期"
              @mousedown.prevent.stop
              @click.stop="clearSingleDateInput"
            >
              <i class="ri-close-line text-[13px]" />
            </button>

            <PopoverSelect
              v-if="operatorNeedsDateInput(value.operator)"
              :model-value="value.preset"
              :options="presetOptions"
              :placeholder="getPresetLabel(value.preset)"
              trigger-label="日期预设"
              align="right"
              trigger-class="ml-2 shrink-0 text-[12px] font-medium text-muted-foreground hover:text-foreground"
              content-class="min-w-[148px]"
              @update:model-value="(preset) => handlePresetSelect(preset as DateFilterPreset)"
            />
          </label>
        </div>
      </div>
    </div>

    <div
      v-if="operatorNeedsDateInput(value.operator)"
      class="mt-2.5"
    >
      <RangeCalendar
        v-if="isBetweenOperator()"
        v-model="rangeCalendarValue"
        :placeholder="calendarPlaceholder"
        layout="month-and-year"
        locale="zh-CN"
        @update:placeholder="(value) => { calendarPlaceholder = value }"
      />
      <Calendar
        v-else
        v-model="singleCalendarValue"
        :placeholder="calendarPlaceholder"
        layout="month-and-year"
        locale="zh-CN"
        @update:placeholder="(value) => { calendarPlaceholder = value }"
      />
    </div>
  </div>
</template>
