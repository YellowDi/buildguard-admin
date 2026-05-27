<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, inject } from "vue"

import { cn } from "@/lib/utils"
import { INPUT_OTP_CONTEXT_KEY } from "./context"

const props = defineProps<{
  class?: HTMLAttributes["class"]
  index: number
}>()

const context = inject(INPUT_OTP_CONTEXT_KEY)

const character = computed(() => context?.value.value[props.index] ?? "")
const isActive = computed(() => context?.activeIndex.value === props.index)
const isDisabled = computed(() => Boolean(context?.disabled.value))
</script>

<template>
  <div
    data-slot="input-otp-slot"
    :data-active="isActive ? 'true' : undefined"
    :data-disabled="isDisabled ? 'true' : undefined"
    :class="cn(
      'relative flex size-11 items-center justify-center border-y border-r border-input bg-background text-lg font-semibold tabular-nums shadow-xs transition-[border-color,box-shadow,color] duration-180 first:rounded-l-md first:border-l last:rounded-r-md',
      isActive && 'z-10 border-ring ring-ring/50 ring-[3px]',
      isDisabled && 'opacity-50',
      props.class,
    )"
  >
    <span>{{ character }}</span>
    <span
      v-if="isActive && !character"
      class="absolute h-5 w-px animate-pulse bg-foreground"
    />
  </div>
</template>
