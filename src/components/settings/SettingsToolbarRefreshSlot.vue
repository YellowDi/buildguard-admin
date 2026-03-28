<script setup lang="ts">
import { cn } from "@/lib/utils"

defineProps<{
  /** 为 true 时表示搜索框已展开，收起本区域以让出横向空间 */
  yieldSpace: boolean
}>()
</script>

<template>
  <div
    :class="
      cn(
        'min-w-0 shrink-0 overflow-hidden transition-[max-width,opacity] duration-[300ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
        yieldSpace
          ? 'max-w-0 opacity-0 pointer-events-none -mr-2'
          : 'max-w-[14rem] opacity-100',
      )
    "
  >
    <div class="inline-flex w-max">
      <slot />
    </div>
  </div>
</template>
