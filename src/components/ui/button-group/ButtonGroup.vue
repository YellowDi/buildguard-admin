<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { ButtonGroupVariants } from "."
import { cn } from "@/lib/utils"
import { buttonGroupVariants } from "."

const props = withDefaults(defineProps<{
  class?: HTMLAttributes["class"]
  orientation?: ButtonGroupVariants["orientation"]
}>(), {
  orientation: "horizontal",
})
</script>

<template>
  <div
    data-slot="button-group"
    role="group"
    :data-orientation="props.orientation"
    :class="cn(buttonGroupVariants({ orientation: props.orientation }), props.class)"
  >
    <slot />
  </div>
</template>
