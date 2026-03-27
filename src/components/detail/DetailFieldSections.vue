<script setup lang="ts">
import { computed } from "vue"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { DetailContactValue, DetailFieldSection, DetailFieldValue } from "@/components/detail/types"
import { cn } from "@/lib/utils"

// 左侧“普通字段详情”模块。
// 新页面只需要准备 sections schema，不再手写标题、字段行和分隔线结构。
const props = withDefaults(defineProps<{
  sections: DetailFieldSection[]
  labelWidthMobile?: string
  labelWidthDesktop?: string
  compact?: boolean
  showSectionTitles?: boolean
}>(), {
  labelWidthMobile: "6.5rem",
  labelWidthDesktop: "180px",
  compact: false,
  showSectionTitles: true,
})

const sectionStyle = computed(() => ({
  "--detail-field-label-mobile": props.labelWidthMobile,
  "--detail-field-label-desktop": props.labelWidthDesktop,
}))

function isEmptyLikeValue(value: DetailFieldValue) {
  if (value === null || value === undefined) return true
  if (typeof value !== "string") return false

  const normalized = value.trim()
  return normalized === "" || normalized === "-" || normalized === "—" || normalized === "未填写"
}

function displayValue(value: DetailFieldValue) {
  if (isEmptyLikeValue(value)) return "无数据"
  return `${value}`
}

function isContactValue(value: DetailFieldValue): value is DetailContactValue {
  return Boolean(value && typeof value === "object" && "kind" in value && value.kind === "contact")
}
</script>

<template>
  <div class="detail-field-sections" :style="sectionStyle">
    <template v-for="(section, sectionIndex) in sections" :key="section.key">
      <section :class="cn('detail-field-section', !props.compact && sectionIndex > 0 && 'detail-field-section--after-separator', props.compact && '!pb-0 !pt-0')">
        <div v-if="props.showSectionTitles && section.title" class="detail-section-heading-row detail-section-inset">
          <h2 class="detail-field-section__heading">{{ section.title }}</h2>
        </div>
        <div>
          <div
            v-for="row in section.rows"
            :key="row.key"
            :class="cn(
              'detail-field-row group',
              (row.imageUrl || (row.truncate === false && !row.action)) && 'detail-field-row--top-aligned',
            )"
          >
            <div class="detail-field-row__label">{{ row.label }}</div>
            <div :class="cn('detail-field-row__value', row.truncate !== false && 'truncate', !row.action && isEmptyLikeValue(row.value) && 'detail-field-row__value--empty', row.valueClass)">
              <template v-if="isContactValue(row.value)">
                <span :class="cn(isEmptyLikeValue(row.value.name) && 'detail-field-row__value--empty')">{{ displayValue(row.value.name) }}</span>
                <span v-if="row.value.phone && !isEmptyLikeValue(row.value.phone)" class="ml-2 text-muted-foreground">{{ row.value.phone }}</span>
              </template>
              <template v-else-if="row.imageUrl">
                <div class="detail-field-row__image-frame">
                  <img
                    :src="row.imageUrl"
                    :alt="row.label"
                    class="detail-field-row__image object-contain"
                  >
                </div>
              </template>
              <template v-else-if="row.action">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  class="detail-field-row__action h-7 min-h-0 rounded-md px-2.5 text-xs leading-5"
                  @click="row.action.onClick"
                >
                  {{ row.action.label }}
                </Button>
              </template>
              <template v-else>
                {{ displayValue(row.value) }}
              </template>
            </div>
          </div>
        </div>
      </section>

      <Separator v-if="!props.compact && sectionIndex < sections.length - 1" class="bg-border/80" />
    </template>
  </div>
</template>
