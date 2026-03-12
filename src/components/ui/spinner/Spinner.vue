<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { LoaderCircleIcon } from "lucide-vue-next"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
  label?: string
}>()
</script>

<template>
  <LoaderCircleIcon
    role="status"
    :aria-label="props.label ?? 'Loading'"
    :class="cn('size-4 animate-spin', props.class)"
  />
</template>
