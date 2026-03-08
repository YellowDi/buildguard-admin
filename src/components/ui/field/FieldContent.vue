<script setup lang="ts">
import type { HTMLAttributes } from "vue"

import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div data-slot="field-content" :class="cn('grid min-w-0 gap-2', props.class)">
    <slot />
  </div>
</template>
