<script setup lang="ts">
import type { DetailRelationColumn } from "@/components/detail/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

defineProps<{
  moduleKey: string
  title: string
  count: number
  columns: DetailRelationColumn[]
  sticky?: boolean
  stickyTop?: string
  padded?: boolean
}>()
</script>

<template>
  <div
    :class="cn(
      'detail-section-inset',
      sticky && 'sticky z-[5] bg-background',
      padded && 'pt-4 pb-1',
    )"
    :style="sticky ? { top: stickyTop ?? 'var(--detail-layout-sticky-offset, 0px)' } : undefined"
  >
    <div class="detail-table-heading-row detail-table-grid detail-relation-grid items-center">
      <div class="flex min-w-0 items-center gap-2">
        <h2 class="detail-field-section__heading shrink-0 whitespace-nowrap">{{ title }}</h2>
        <Badge
          variant="secondary"
          class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
        >
          {{ count }}
        </Badge>
      </div>

      <div
        v-for="column in columns"
        :key="`${moduleKey}-header-${column.key}`"
        :class="cn('whitespace-nowrap text-[12px] text-muted-foreground', column.headerClass)"
      >
        <slot :name="`${column.key}-header`" :column="column">
          {{ column.label }}
        </slot>
      </div>
    </div>
  </div>
</template>
