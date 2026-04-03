<script lang="ts" setup>
import type { CalendarNextProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ChevronRightIcon } from '@radix-icons/vue'
import { CalendarNext, useForwardProps } from "reka-ui"
import { TooltipWrap } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { buttonVariants } from '@/components/ui/button'

const props = defineProps<CalendarNextProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <TooltipWrap content="切换到下个月">
    <CalendarNext
      data-slot="calendar-next-button"
      aria-label="切换到下个月"
      :class="cn(
        buttonVariants({ variant: 'outline' }),
        'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        props.class,
      )"
      v-bind="forwardedProps"
    >
      <slot>
        <ChevronRightIcon class="size-4" />
      </slot>
    </CalendarNext>
  </TooltipWrap>
</template>
