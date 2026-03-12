<script setup lang="ts">
import { computed } from "vue"

import type { TableStatusCellRenderer } from "@/components/table-page/types"
import { StatusBadge } from "@/components/ui/status-badge"

const props = defineProps<{
  value: unknown
  renderer: TableStatusCellRenderer
}>()

const resolvedStatus = computed(() => {
  const rawLabel = props.value === null || props.value === undefined ? "" : `${props.value}`.trim()
  const matched = rawLabel ? props.renderer.map[rawLabel] : undefined
  const fallback = props.renderer.fallback
  const label = matched?.label ?? rawLabel

  if (!label) {
    return null
  }

  return {
    label,
    tone: matched?.tone ?? fallback?.tone ?? "gray",
    icon: matched?.icon ?? fallback?.icon ?? "dot",
  }
})
</script>

<template>
  <StatusBadge
    v-if="resolvedStatus"
    :label="resolvedStatus.label"
    :tone="resolvedStatus.tone"
    :icon="resolvedStatus.icon"
  />
</template>
