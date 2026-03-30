<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"

withDefaults(defineProps<{
  /** 字段分组（对应 DetailFieldSections 的 section 数量） */
  sections?: number
  /** 每组标签行数量 */
  rowsPerSection?: number
}>(), {
  sections: 2,
  rowsPerSection: 4,
})
</script>

<template>
  <div class="min-w-0">
    <div
      v-for="section in sections"
      :key="`detail-fields-skeleton-${section}`"
      class="border-b border-border/60 px-5 py-5 last:border-b-0"
    >
      <Skeleton class="mb-5 h-5 w-32" />
      <div class="grid gap-4">
        <div
          v-for="row in rowsPerSection"
          :key="`detail-fields-skeleton-${section}-${row}`"
          class="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-center"
        >
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-full max-w-md" />
        </div>
      </div>
    </div>
  </div>
</template>
