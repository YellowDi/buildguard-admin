<script setup lang="ts">
import { computed } from "vue"

import AnimatedText from "@/components/animation/AnimatedText.vue"
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
    "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[14px] transition-[background-color,color,box-shadow,transform] duration-180 ease-out outline-none active:scale-[0.98] motion-reduce:active:scale-100"

  if (props.variant === "ghost") {
    return cn(
      "inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[14px] transition-[background-color,color,box-shadow,transform] duration-180 ease-out outline-none active:scale-[0.98] motion-reduce:active:scale-100",
      "text-muted-foreground hover:bg-transparent hover:text-foreground active:text-foreground",
      props.class,
    )
  }

  return cn(
    base,
    props.selected
      ? "bg-selection text-link hover:bg-selection-hover active:bg-selection-active"
      : "text-muted-foreground hover:bg-interactive-hover active:bg-surface-secondary",
    props.class,
  )
})
</script>

<template>
  <button type="button" :class="classes" :aria-pressed="selected">
    <i v-if="icon" :class="[icon, 'text-[15px]']" />
    <AnimatedText
      as="span"
      :text="label"
      effect="fade-through"
    />
    <i v-if="caret" class="ri-arrow-down-s-line text-sm text-muted-foreground" />
  </button>
</template>
