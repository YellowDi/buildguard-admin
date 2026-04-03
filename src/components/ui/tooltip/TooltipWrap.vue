<script setup lang="ts">
import type { TooltipContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { ref } from "vue"
import Tooltip from "./Tooltip.vue"
import TooltipContent from "./TooltipContent.vue"
import TooltipTrigger from "./TooltipTrigger.vue"

const props = withDefaults(defineProps<{
  content?: string
  disabled?: boolean
  side?: TooltipContentProps["side"]
  align?: TooltipContentProps["align"]
  sideOffset?: TooltipContentProps["sideOffset"]
  ignoreNonKeyboardFocus?: boolean
  openOnFocus?: boolean
  class?: HTMLAttributes["class"]
}>(), {
  content: "",
  disabled: false,
  side: "top",
  align: "center",
  sideOffset: 4,
  ignoreNonKeyboardFocus: true,
  openOnFocus: false,
})

const open = ref(false)

function handleOpen() {
  if (props.disabled || !props.content) {
    return
  }

  open.value = true
}

function handleClose() {
  open.value = false
}

function handleFocus(event: FocusEvent) {
  if (!props.openOnFocus) {
    return
  }

  if (props.ignoreNonKeyboardFocus && !(event.target as HTMLElement | null)?.matches?.(":focus-visible")) {
    return
  }

  handleOpen()
}
</script>

<template>
  <slot v-if="disabled || !content" />

  <Tooltip v-else :open="open" :ignore-non-keyboard-focus="ignoreNonKeyboardFocus">
    <TooltipTrigger
      as-child
      @pointermove="handleOpen"
      @pointerleave="handleClose"
      @pointerdown="handleClose"
      @click="handleClose"
      @focus="handleFocus"
      @blur="handleClose"
    >
      <slot />
    </TooltipTrigger>
    <TooltipContent
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      :class="props.class"
    >
      {{ content }}
    </TooltipContent>
  </Tooltip>
</template>
