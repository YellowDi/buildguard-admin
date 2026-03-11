<script setup lang="ts">
import { computed } from "vue"

import { Separator } from "@/components/ui/separator"
import type { DetailFieldSection } from "@/components/detail/types"
import { cn } from "@/lib/utils"

// 左侧“普通字段详情”模块。
// 新页面只需要准备 sections schema，不再手写标题、字段行和分隔线结构。
const props = withDefaults(defineProps<{
  sections: DetailFieldSection[]
  labelWidthMobile?: string
  labelWidthDesktop?: string
}>(), {
  labelWidthMobile: "6.5rem",
  labelWidthDesktop: "180px",
})

const sectionStyle = computed(() => ({
  "--detail-field-label-mobile": props.labelWidthMobile,
  "--detail-field-label-desktop": props.labelWidthDesktop,
}))

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—"
  return `${value}`
}
</script>

<template>
  <div class="detail-field-sections" :style="sectionStyle">
    <template v-for="(section, sectionIndex) in sections" :key="section.key">
      <section class="detail-field-section">
        <h2 class="detail-field-section__heading">{{ section.title }}</h2>
        <div>
          <div
            v-for="row in section.rows"
            :key="row.key"
            class="detail-field-row group"
          >
            <div class="detail-field-row__label">{{ row.label }}</div>
            <div :class="cn('detail-field-row__value', row.truncate !== false && 'truncate', row.valueClass)">
              {{ displayValue(row.value) }}
            </div>
          </div>
        </div>
      </section>

      <Separator v-if="sectionIndex < sections.length - 1" class="bg-border/80" />
    </template>
  </div>
</template>
