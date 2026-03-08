<script lang="ts" setup>
import type { CalendarRootEmits, CalendarRootProps, DateValue } from "reka-ui"
import type { HTMLAttributes, Ref } from "vue"
import type { LayoutTypes } from "."
import { getLocalTimeZone, today } from "@internationalized/date"
import { createReusableTemplate, reactiveOmit, useVModel } from "@vueuse/core"
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-icons/vue"
import { CalendarRoot, useDateFormatter, useForwardPropsEmits } from "reka-ui"
import { createYear, createYearRange, toDate } from "reka-ui/date"
import { computed, toRaw } from "vue"
import { cn } from "@/lib/utils"
import CalendarSelect from "./CalendarSelect.vue"
import { CalendarCell, CalendarCellTrigger, CalendarGrid, CalendarGridBody, CalendarGridHead, CalendarGridRow, CalendarHeadCell, CalendarHeader, CalendarHeading, CalendarNextButton, CalendarPrevButton } from "."

const props = withDefaults(defineProps<CalendarRootProps & { class?: HTMLAttributes["class"], layout?: LayoutTypes, yearRange?: DateValue[] }>(), {
  modelValue: undefined,
  layout: undefined,
  locale: "zh-CN",
})
const emits = defineEmits<CalendarRootEmits>()

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

  <CalendarRoot
    v-slot="{ grid, weekDays, date }"
    v-bind="forwarded"
    v-model:placeholder="placeholder"
    data-slot="calendar"
    :class="cn('p-3', props.class)"
  >
    <CalendarHeader class="pt-0">
      <div class="grid w-full grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-1">
        <CalendarPrevButton class="justify-self-start">
          <slot name="calendar-prev-icon">
            <ChevronLeftIcon class="size-4" />
          </slot>
        </CalendarPrevButton>

        <div class="flex min-w-0 items-center justify-center">
          <slot name="calendar-heading" :date="date" :month="ReuseMonthTemplate" :year="ReuseYearTemplate">
            <template v-if="layout === 'month-and-year'">
              <div class="flex items-center justify-center gap-1">
                <ReuseMonthTemplate :date="date" />
                <ReuseYearTemplate :date="date" />
              </div>
            </template>
            <template v-else-if="layout === 'month-only'">
              <div class="flex items-center justify-center gap-1">
                <ReuseMonthTemplate :date="date" />
                {{ formatter.custom(toDate(date), { year: 'numeric' }) }}
              </div>
            </template>
            <template v-else-if="layout === 'year-only'">
              <div class="flex items-center justify-center gap-1">
                {{ formatter.custom(toDate(date), { month: 'short' }) }}
                <ReuseYearTemplate :date="date" />
              </div>
            </template>
            <template v-else>
              <CalendarHeading />
            </template>
          </slot>
        </div>

        <CalendarNextButton class="justify-self-end">
          <slot name="calendar-next-icon">
            <ChevronRightIcon class="size-4" />
          </slot>
        </CalendarNextButton>
      </div>
    </CalendarHeader>

    <div class="flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
      <CalendarGrid v-for="month in grid" :key="month.value.toString()">
        <CalendarGridHead>
          <CalendarGridRow>
            <CalendarHeadCell
              v-for="day in weekDays" :key="day"
            >
              {{ day }}
            </CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>
        <CalendarGridBody>
          <CalendarGridRow v-for="(weekDates, index) in month.rows" :key="`weekDate-${index}`" class="mt-2 w-full">
            <CalendarCell
              v-for="weekDate in weekDates"
              :key="weekDate.toString()"
              :date="weekDate"
            >
              <CalendarCellTrigger
                :day="weekDate"
                :month="month.value"
              />
            </CalendarCell>
          </CalendarGridRow>
        </CalendarGridBody>
      </CalendarGrid>
    </div>
  </CalendarRoot>
</template>
