<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date"
import { computed } from "vue"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  modelValue: string
  id?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  id: undefined,
  placeholder: "请选择日期",
  disabled: false,
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
  focus: []
}>()

const dateFormatter = new DateFormatter("zh-CN", { dateStyle: "long" })

function parseCalendarDate(value: string) {
  try {
    return parseDate(value)
  } catch {
    return undefined
  }
}

const calendarValue = computed({
  get: () => (props.modelValue ? parseCalendarDate(props.modelValue) : undefined),
  set: (value: { toString: () => string } | undefined) => {
    emit("update:modelValue", value?.toString() ?? "")
  },
})

const displayValue = computed(() => {
  if (!props.modelValue) {
    return props.placeholder
  }

  const parsed = parseCalendarDate(props.modelValue)

  if (!parsed) {
    return props.placeholder
  }

  return dateFormatter.format(parsed.toDate(getLocalTimeZone()))
})
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        :id="id"
        type="button"
        data-slot="date-picker-trigger"
        :disabled="disabled"
        :class="
          cn(
            'border-input dark:bg-input/30 flex h-9 w-full min-w-0 items-center justify-start rounded-md border bg-background/92 px-3 py-1 text-left text-base font-normal shadow-xs transition-[border-color,background-color,color,box-shadow] duration-180 ease-out outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'data-[state=open]:border-ring data-[state=open]:ring-ring/50 data-[state=open]:ring-[3px]',
            !modelValue && 'text-muted-foreground',
          )
        "
        @focus="emit('focus')"
      >
        <i class="ri-calendar-line mr-2 text-base leading-none" />
        {{ displayValue }}
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        v-model="calendarValue"
        layout="month-and-year"
        locale="zh-CN"
        initial-focus
      />
    </PopoverContent>
  </Popover>
</template>
