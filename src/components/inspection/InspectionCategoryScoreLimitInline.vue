<script setup lang="ts">
import type { HTMLAttributes } from "vue"

import { cn } from "@/lib/utils"

const props = defineProps<{
  limit: number | null | undefined
  class?: HTMLAttributes["class"]
}>()

function hasLimit(limit: number | null | undefined) {
  return typeof limit === "number" && Number.isFinite(limit)
}

function formatLimit(limit: number | null | undefined) {
  return hasLimit(limit) ? Math.round(limit as number) : "--"
}
</script>

<template>
  <div
    :class="cn(
      'inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-[13px] leading-none text-foreground',
      props.class,
    )"
  >
    <span class="text-muted-foreground">权重</span>
    <span class="font-semibold tabular-nums text-foreground">{{ formatLimit(props.limit) }}</span>
  </div>
</template>
