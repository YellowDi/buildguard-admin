<script lang="ts" setup>
import type { CalendarPrevProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ChevronLeftIcon } from '@radix-icons/vue'
import { CalendarPrev, useForwardProps } from "reka-ui"
import { TooltipWrap } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { buttonVariants } from '@/components/ui/button'

const props = defineProps<CalendarPrevProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <TooltipWrap content="切换到上个月">
    <CalendarPrev
      data-slot="calendar-prev-button"
      aria-label="切换到上个月"
      :class="cn(
        buttonVariants({ variant: 'outline' }),
        'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        props.class,
      )"
      v-bind="forwardedProps"
    >
      <slot>
        <ChevronLeftIcon class="size-4" />
      </slot>
    </CalendarPrev>
  </TooltipWrap>
</template>
