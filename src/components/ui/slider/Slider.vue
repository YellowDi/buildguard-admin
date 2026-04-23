<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from "reka-ui"

import { cn } from "@/lib/utils"

const props = defineProps<SliderRootProps & {
  class?: HTMLAttributes["class"]
  trackClass?: HTMLAttributes["class"]
  rangeClass?: HTMLAttributes["class"]
  thumbClass?: HTMLAttributes["class"]
}>()

const emits = defineEmits<SliderRootEmits>()

const delegatedProps = reactiveOmit(props, "class", "trackClass", "rangeClass", "thumbClass")
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SliderRoot
    v-bind="{ ...forwarded, ...$attrs }"
    data-slot="slider"
    :thumb-alignment="props.thumbAlignment ?? 'overflow'"
    :class="cn(
      'relative flex w-full touch-none select-none items-center data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      'data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-28 data-[orientation=vertical]:w-5 data-[orientation=vertical]:justify-center',
      props.class,
    )"
  >
    <SliderTrack
      data-slot="slider-track"
      :class="cn(
        'relative h-2 w-full grow overflow-hidden rounded-full bg-muted',
        'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2',
        props.trackClass,
      )"
    >
      <SliderRange
        data-slot="slider-range"
        :class="cn(
          'absolute h-full bg-primary',
          'data-[orientation=vertical]:w-full',
          props.rangeClass,
        )"
      />
    </SliderTrack>

    <SliderThumb
      data-slot="slider-thumb"
      :class="cn(
        'block size-4 rounded-full border border-primary/25 bg-background shadow-sm transition-[box-shadow,transform] duration-180 ease-out',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/35',
        'disabled:pointer-events-none disabled:opacity-50',
        props.thumbClass,
      )"
    />
  </SliderRoot>
</template>
