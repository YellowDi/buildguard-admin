<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
  label?: string
}>()
</script>

<template>
  <i
    role="status"
    :aria-label="props.label ?? 'Loading'"
    :class="cn('ri-loader-4-line inline-flex text-base leading-none animate-spin', props.class)"
  />
</template>
