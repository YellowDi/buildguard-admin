<script setup lang="ts">
import type { DateValue } from "reka-ui"
import { computed, ref, watch } from "vue"
import { getLocalTimeZone, today } from "@internationalized/date"
import { ChevronDown, ChevronUp, CornerUpLeft } from "lucide-vue-next"
import { CalendarRoot, CalendarCellTrigger as RekaCalendarCellTrigger } from "reka-ui"
import { Button } from "@/components/ui/button"
import {
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
} from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { AppSidebarCalendarDate } from "@/components/layout/app-sidebar/types"
import { cn } from "@/lib/utils"

const props = defineProps<{
  modelValue: AppSidebarCalendarDate
  hasEventOnDate?: (date: AppSidebarCalendarDate) => boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [value: AppSidebarCalendarDate]
}>()

const weekDayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
const monthLabels = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]

function getTodayDate() {
  return today(getLocalTimeZone()) as unknown as AppSidebarCalendarDate
}

const placeholder = ref<AppSidebarCalendarDate>(props.modelValue.copy())

const isViewingCurrentMonth = computed(() => isSameMonthValue(placeholder.value, getTodayDate()))
const visibleMonthLabel = computed(() => `${placeholder.value.year} ${monthLabels[placeholder.value.month - 1]}`)

watch(
  () => props.modelValue,
  (value) => {
    placeholder.value = value.copy()
  },
)

function toRekaDateValue(value: AppSidebarCalendarDate): DateValue {
  return value as unknown as DateValue
}

function fromRekaDateValue(value: DateValue): AppSidebarCalendarDate {
  return value as unknown as AppSidebarCalendarDate
}

function isSameMonthValue(a: AppSidebarCalendarDate, b: AppSidebarCalendarDate) {
  return a.year === b.year && a.month === b.month
}

function isSameDayValue(a: AppSidebarCalendarDate, b: AppSidebarCalendarDate) {
  return isSameMonthValue(a, b) && a.day === b.day
}

function handleModelValueChange(value: DateValue | undefined) {
  if (!value) return
  emit("update:modelValue", fromRekaDateValue(value).copy())
}

function handlePlaceholderChange(value: DateValue) {
  placeholder.value = fromRekaDateValue(value).copy()
}

function goToPreviousMonth() {
  placeholder.value = placeholder.value.cycle("month", -1)
}

function goToNextMonth() {
  placeholder.value = placeholder.value.cycle("month", 1)
}

function goToCurrentMonth() {
  const current = getTodayDate()
  placeholder.value = current
  emit("update:modelValue", current)
}

function getEventDotClass(date: AppSidebarCalendarDate) {
  const isTodayCell = isSameDayValue(date, getTodayDate())
  const isOutsideView = !isSameMonthValue(date, placeholder.value)

  return cn(
    "absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
    isTodayCell ? "bg-white/95" : isOutsideView ? "bg-muted-foreground/35" : "bg-foreground/35",
  )
}
</script>

<template>
  <CalendarRoot
    :model-value="toRekaDateValue(modelValue)"
    :placeholder="toRekaDateValue(placeholder)"
    locale="zh-CN"
    :week-starts-on="0"
    fixed-weeks
    prevent-deselect
    data-slot="sidebar-mini-calendar"
    class="w-full"
    @update:model-value="handleModelValueChange"
    @update:placeholder="handlePlaceholderChange"
  >
    <template #default="{ grid }">
      <div class="flex min-h-6 items-center justify-between">
        <div class="min-h-6 pl-2 text-sm font-semibold leading-6 tracking-normal text-foreground">
          <span v-if="!isViewingCurrentMonth">{{ visibleMonthLabel }}</span>
        </div>

        <TooltipProvider>
          <div class="flex items-center gap-0.5 text-muted-foreground">
            <Tooltip v-if="!isViewingCurrentMonth">
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="size-6 rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  aria-label="回到今天"
                  @click="goToCurrentMonth"
                >
                  <CornerUpLeft class="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>回到今天</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="size-6 rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  aria-label="转到上个月"
                  @click="goToPreviousMonth"
                >
                  <ChevronUp class="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>转到上个月</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="size-6 rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  aria-label="转到下个月"
                  @click="goToNextMonth"
                >
                  <ChevronDown class="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>转到下个月</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div class="mt-2">
        <CalendarGrid v-for="month in grid" :key="month.value.toString()" class="w-full">
          <CalendarGridHead>
            <CalendarGridRow class="grid grid-cols-7">
              <CalendarHeadCell
                v-for="day in weekDayLabels"
                :key="day"
                class="flex h-8 items-center justify-center px-0 text-[11px] font-medium tracking-[0.01em] text-muted-foreground"
              >
                {{ day }}
              </CalendarHeadCell>
            </CalendarGridRow>
          </CalendarGridHead>

          <CalendarGridBody>
            <CalendarGridRow
              v-for="(weekDates, index) in month.rows"
              :key="`week-${index}`"
              class="mt-1 grid grid-cols-7"
            >
              <CalendarCell
                v-for="weekDate in weekDates"
                :key="weekDate.toString()"
                :date="weekDate"
                class="relative flex h-8.5 items-center justify-center [&:has([data-selected])]:rounded-none [&:has([data-selected])]:bg-transparent"
              >
                <RekaCalendarCellTrigger
                  :day="weekDate"
                  :month="month.value"
                  as="button"
                  :class="cn(
                    'relative flex size-7 items-center justify-center rounded-[9px] border-0 bg-transparent p-0 text-[11px] font-medium leading-none text-foreground outline-none shadow-none transition-colors appearance-none',
                    'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0',
                    'hover:bg-[hsl(39.43deg_26.32%_26.08%_/_8%)]',
                    'data-[selected]:bg-white data-[selected]:text-foreground data-[selected]:shadow-[var(--shadow-card)]',
                    'data-[outside-view]:text-muted-foreground/60 data-[outside-view]:hover:bg-transparent',
                    'data-[today]:bg-[#f54a3d] data-[today]:text-white data-[today]:shadow-none data-[today]:hover:bg-[#f54a3d]',
                  )"
                >
                  <span class="pointer-events-none flex size-full items-center justify-center">
                    {{ weekDate.day }}
                  </span>
                </RekaCalendarCellTrigger>

                <span
                  v-if="hasEventOnDate?.(weekDate)"
                  :class="getEventDotClass(weekDate)"
                />
              </CalendarCell>
            </CalendarGridRow>
          </CalendarGridBody>
        </CalendarGrid>
      </div>
    </template>
  </CalendarRoot>
</template>
