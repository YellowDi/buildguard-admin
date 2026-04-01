<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date"
import { Calendar as CalendarIcon } from "lucide-vue-next"
import { computed } from "vue"

import { Button } from "@/components/ui/button"
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
      <Button
        :id="id"
        variant="outline"
        :disabled="disabled"
        :class="
          cn(
            'w-full justify-start text-left font-normal',
            !modelValue && 'text-muted-foreground',
          )
        "
        @focus="emit('focus')"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ displayValue }}
      </Button>
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
