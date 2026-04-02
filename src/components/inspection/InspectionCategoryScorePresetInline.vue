<script setup lang="ts">
import type { HTMLAttributes } from "vue"

import type { InspectionCategoryScorePreset } from "@/lib/inspection-category-score-presets"
import { cn } from "@/lib/utils"

const props = defineProps<{
  preset: InspectionCategoryScorePreset
  class?: HTMLAttributes["class"]
}>()

const items: Array<{
  key: keyof InspectionCategoryScorePreset
  label: string
  iconClass: string
  valueClass: string
}> = [
  {
    key: "normal",
    label: "一切正常",
    iconClass: "ri-checkbox-circle-fill text-[#25B26A]",
    valueClass: "text-[#163321]",
  },
  {
    key: "attention",
    label: "需重点关注",
    iconClass: "ri-error-warning-fill text-[#F08A24]",
    valueClass: "text-[#4A2B04]",
  },
  {
    key: "risk",
    label: "存在风险",
    iconClass: "ri-close-circle-fill text-[#F04438]",
    valueClass: "text-[#55160F]",
  },
]

function formatValue(value: number) {
  return value
}
</script>

<template>
  <div :class="cn('inline-flex items-center gap-3 rounded-full bg-[#F2F4F7] px-2.5 py-1', props.class)">
    <span
      v-for="item in items"
      :key="item.key"
      :title="item.label"
      :aria-label="`${item.label} ${formatValue(props.preset[item.key])} 分`"
      class="inline-flex items-center gap-1 text-[13px] leading-none"
    >
      <i :class="[item.iconClass, 'text-[12px]']" />
      <span :class="['font-medium tabular-nums', item.valueClass]">{{ formatValue(props.preset[item.key]) }}</span>
    </span>
  </div>
</template>
