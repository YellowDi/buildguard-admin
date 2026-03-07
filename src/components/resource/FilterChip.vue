<script setup lang="ts">
import { computed } from "vue"

import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  icon?: string
  label: string
  selected?: boolean
  caret?: boolean
  variant?: "pill" | "ghost"
  class?: string
}>(), {
  icon: undefined,
  selected: false,
  caret: false,
  variant: "pill",
  class: undefined,
})

const classes = computed(() => {
  const base =
    "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[14px] transition-colors outline-none"

  if (props.variant === "ghost") {
    return cn(
      "inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[14px] transition-colors outline-none",
      "text-[#9A9A9A] hover:bg-transparent hover:text-[#5F5F5F] active:text-[#3F3F3F]",
      props.class,
    )
  }

  return cn(
    base,
    props.selected
      ? "bg-[#EEF3FF] text-[#3559E0] hover:bg-[#E6EEFF] active:bg-[#DCE7FF]"
      : "text-[#666] hover:bg-[#F5F5F5] active:bg-[#EBEBEB]",
    props.class,
  )
})
</script>

<template>
  <button type="button" :class="classes" :aria-pressed="selected">
    <i v-if="icon" :class="[icon, 'text-[15px]']" />
    <span>{{ label }}</span>
    <i v-if="caret" class="ri-arrow-down-s-line text-sm text-[#8A8A8A]" />
  </button>
</template>
