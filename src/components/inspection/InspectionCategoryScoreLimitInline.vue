<script setup lang="ts">
import type { HTMLAttributes } from "vue"

import { cn } from "@/lib/utils"

const props = defineProps<{
  limit: number
  class?: HTMLAttributes["class"]
}>()

function formatLimit(limit: number) {
  return Number.isFinite(limit) ? Math.round(limit) : 0
}
</script>

<template>
  <div
    :class="cn(
      'inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-[13px] leading-none text-foreground',
      props.class,
    )"
  >
    <span class="text-muted-foreground">上限</span>
    <span class="font-semibold tabular-nums text-foreground">{{ formatLimit(props.limit) }}</span>
    <span class="text-muted-foreground">分</span>
  </div>
</template>
