<script lang="ts" setup>
import type { DateValue, RangeCalendarRootEmits, RangeCalendarRootProps } from "reka-ui"
import type { HTMLAttributes, Ref } from "vue"
import type { LayoutTypes } from "."
import { getLocalTimeZone, today } from "@internationalized/date"
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-icons/vue"
import { createReusableTemplate, reactiveOmit, useVModel } from "@vueuse/core"
import {
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  RangeCalendarGrid,
  RangeCalendarGridBody,
  RangeCalendarGridHead,
  RangeCalendarGridRow,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarNext,
  RangeCalendarPrev,
  RangeCalendarRoot,
  useDateFormatter,
  useForwardPropsEmits,
} from "reka-ui"
import { createYear, createYearRange, toDate } from "reka-ui/date"
import { computed, toRaw } from "vue"

import { buttonVariants } from "@/components/ui/button"
import { TooltipWrap } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import CalendarSelect from "./CalendarSelect.vue"

const props = withDefaults(defineProps<RangeCalendarRootProps & { class?: HTMLAttributes["class"], layout?: LayoutTypes, yearRange?: DateValue[] }>(), {
  modelValue: undefined,
  layout: undefined,
  locale: "zh-CN",
})
const emits = defineEmits<RangeCalendarRootEmits>()

const delegatedProps = reactiveOmit(props, "class", "layout", "placeholder")

const placeholder = useVModel(props, "placeholder", emits, {
  passive: true,
  defaultValue: props.defaultPlaceholder ?? today(getLocalTimeZone()),
}) as Ref<DateValue>

const formatter = useDateFormatter(props.locale ?? "zh-CN")

const yearRange = computed(() => {
  return props.yearRange ?? createYearRange({
    start: props?.minValue ?? (toRaw(props.placeholder) ?? props.defaultPlaceholder ?? today(getLocalTimeZone()))
      .cycle("year", -100),

    end: props?.maxValue ?? (toRaw(props.placeholder) ?? props.defaultPlaceholder ?? today(getLocalTimeZone()))
      .cycle("year", 10),
  })
})

const monthOptions = computed(() => {
  return createYear({ dateObj: placeholder.value }).map(month => ({
    value: month.month,
    label: formatter.custom(toDate(month), { month: "long" }),
  }))
})

const yearOptions = computed(() => {
  return yearRange.value.map(year => ({
    value: year.year,
    label: formatter.custom(toDate(year), { year: "numeric" }),
  }))
})

const [DefineMonthTemplate, ReuseMonthTemplate] = createReusableTemplate<{ date: DateValue }>()
const [DefineYearTemplate, ReuseYearTemplate] = createReusableTemplate<{ date: DateValue }>()

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DefineMonthTemplate v-slot="{ date }">
    <CalendarSelect
      :model-value="date.month"
      :options="monthOptions"
      trigger-label="选择月份"
      content-class="min-w-[8rem]"
      @update:model-value="(month) => {
        placeholder = placeholder.set({ month })
      }"
    />
  </DefineMonthTemplate>

  <DefineYearTemplate v-slot="{ date }">
    <CalendarSelect
      :model-value="date.year"
      :options="yearOptions"
      trigger-label="选择年份"
      content-class="min-w-[6rem]"
      @update:model-value="(year) => {
        placeholder = placeholder.set({ year })
      }"
    />
  </DefineYearTemplate>

  <RangeCalendarRoot
    v-slot="{ grid, weekDays, date }"
    v-bind="forwarded"
    v-model:placeholder="placeholder"
    data-slot="range-calendar"
    :class="cn('p-3', props.class)"
  >
    <RangeCalendarHeader class="pt-0">
      <div class="grid w-full grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-1">
        <TooltipWrap content="切换到上个月">
          <RangeCalendarPrev
            aria-label="切换到上个月"
            :class="cn(buttonVariants({ variant: 'ghost' }), 'size-8 justify-self-start p-0')"
          >
            <ChevronLeftIcon class="size-4" />
          </RangeCalendarPrev>
        </TooltipWrap>

        <div class="flex min-w-0 items-center justify-center">
          <template v-if="layout === 'month-and-year'">
            <div class="flex items-center justify-center gap-1">
              <ReuseMonthTemplate :date="date" />
              <ReuseYearTemplate :date="date" />
            </div>
          </template>
          <template v-else-if="layout === 'month-only'">
            <div class="flex items-center justify-center gap-1">
              <ReuseMonthTemplate :date="date" />
              {{ formatter.custom(toDate(date), { year: "numeric" }) }}
            </div>
          </template>
          <template v-else-if="layout === 'year-only'">
            <div class="flex items-center justify-center gap-1">
              {{ formatter.custom(toDate(date), { month: "short" }) }}
              <ReuseYearTemplate :date="date" />
            </div>
          </template>
          <template v-else>
            <RangeCalendarHeading />
          </template>
        </div>

        <TooltipWrap content="切换到下个月">
          <RangeCalendarNext
            aria-label="切换到下个月"
            :class="cn(buttonVariants({ variant: 'ghost' }), 'size-8 justify-self-end p-0')"
          >
            <ChevronRightIcon class="size-4" />
          </RangeCalendarNext>
        </TooltipWrap>
      </div>
    </RangeCalendarHeader>

    <div class="mt-4 flex flex-col gap-y-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
      <RangeCalendarGrid
        v-for="month in grid"
        :key="month.value.toString()"
        class="w-full border-collapse space-y-1"
      >
        <RangeCalendarGridHead>
          <RangeCalendarGridRow class="flex">
            <th
              v-for="day in weekDays"
              :key="day"
              class="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]"
            >
              {{ day }}
            </th>
          </RangeCalendarGridRow>
        </RangeCalendarGridHead>
        <RangeCalendarGridBody>
          <RangeCalendarGridRow
            v-for="(weekDates, index) in month.rows"
            :key="`weekDate-${index}`"
            class="mt-2 flex w-full"
          >
            <RangeCalendarCell
              v-for="weekDate in weekDates"
              :key="weekDate.toString()"
              :date="weekDate"
              class="relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20"
            >
              <RangeCalendarCellTrigger
                :day="weekDate"
                :month="month.value"
                :class="cn(
                  buttonVariants({ variant: 'ghost' }),
                  'size-9 p-0 font-normal aria-selected:opacity-100',
                  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                  'data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-start]:hover:bg-primary data-[selection-start]:hover:text-primary-foreground data-[selection-start]:focus:bg-primary data-[selection-start]:focus:text-primary-foreground',
                  'data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground data-[selection-end]:hover:bg-primary data-[selection-end]:hover:text-primary-foreground data-[selection-end]:focus:bg-primary data-[selection-end]:focus:text-primary-foreground',
                  'data-[selection-start]:rounded-l-md data-[selection-end]:rounded-r-md',
                  'data-[selection-start]:rounded-r-md data-[selection-end]:rounded-l-md',
                  'data-[outside-view]:text-muted-foreground data-[disabled]:text-muted-foreground data-[disabled]:opacity-50',
                  '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
                )"
              />
            </RangeCalendarCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridBody>
      </RangeCalendarGrid>
    </div>
  </RangeCalendarRoot>
</template>
