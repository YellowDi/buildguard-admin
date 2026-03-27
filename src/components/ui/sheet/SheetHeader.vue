<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{ class?: HTMLAttributes["class"] }>()
</script>

<template>
  <div
    :class="
      cn('flex flex-col gap-y-3 border-b border-border/70 px-4 pt-4 pb-3', props.class)
    "
  >
    <div v-if="$slots.actions" class="w-full">
      <slot name="actions" />
    </div>
    <div class="flex flex-col gap-y-2 text-left">
      <slot />
    </div>
  </div>
</template>
