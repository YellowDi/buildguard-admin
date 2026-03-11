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
      "text-muted-foreground hover:bg-transparent hover:text-foreground active:text-foreground",
      props.class,
    )
  }

  return cn(
    base,
    props.selected
      ? "bg-selection text-link hover:bg-selection-hover active:bg-selection-active"
      : "text-muted-foreground hover:bg-surface-tertiary active:bg-surface-secondary",
    props.class,
  )
})
</script>

<template>
  <button type="button" :class="classes" :aria-pressed="selected">
    <i v-if="icon" :class="[icon, 'text-[15px]']" />
    <span>{{ label }}</span>
    <i v-if="caret" class="ri-arrow-down-s-line text-sm text-muted-foreground" />
  </button>
</template>
