<script setup lang="ts">
import type { HTMLAttributes } from "vue"

import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <p data-slot="field-error" :class="cn('text-xs text-destructive', props.class)">
    <slot />
  </p>
</template>
