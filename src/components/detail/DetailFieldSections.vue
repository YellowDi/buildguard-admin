<script setup lang="ts">
import { computed } from "vue"

import TableStatusChip from "@/components/table-page/TableStatusChip.vue"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { DetailContactValue, DetailFieldSection, DetailFieldValue, DetailStatusValue } from "@/components/detail/types"
import { remixIconForDetailFieldAction } from "@/lib/actionIcons"
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

function isStatusValue(value: DetailFieldValue): value is DetailStatusValue {
  return Boolean(value && typeof value === "object" && "kind" in value && value.kind === "status")
}
</script>

<template>
  <div class="detail-field-sections" :style="sectionStyle">
    <template v-for="(section, sectionIndex) in sections" :key="section.key">
      <section :class="cn('detail-field-section', !props.compact && sectionIndex > 0 && 'detail-field-section--after-separator', props.compact && 'pb-0! pt-0!')">
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
            <div :class="cn('detail-field-row__value', row.truncate !== false && 'truncate', !row.action && !row.suffixAction && !row.linkAction && isEmptyLikeValue(row.value) && 'detail-field-row__value--empty', row.valueClass)">
              <template v-if="isContactValue(row.value) && row.suffixAction">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div class="min-w-0 flex-1">
                    <span :class="cn(isEmptyLikeValue(row.value.name) && 'detail-field-row__value--empty')">{{ displayValue(row.value.name) }}</span>
                    <span v-if="row.value.phone && !isEmptyLikeValue(row.value.phone)" class="ml-2 text-muted-foreground">{{ row.value.phone }}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    class="h-7 shrink-0 self-start rounded-md px-2.5 text-xs leading-5"
                    @click="row.suffixAction.onClick"
                  >
                    <i :class="remixIconForDetailFieldAction(row.suffixAction.label, row.suffixAction.icon)" />
                    {{ row.suffixAction.label }}
                  </Button>
                </div>
              </template>
              <template v-else-if="isContactValue(row.value)">
                <span :class="cn(isEmptyLikeValue(row.value.name) && 'detail-field-row__value--empty')">{{ displayValue(row.value.name) }}</span>
                <span v-if="row.value.phone && !isEmptyLikeValue(row.value.phone)" class="ml-2 text-muted-foreground">{{ row.value.phone }}</span>
              </template>
              <template v-else-if="isStatusValue(row.value) && row.suffixAction">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div class="min-w-0 flex-1">
                    <TableStatusChip :value="row.value.value" :renderer="row.value.renderer" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    class="h-7 shrink-0 self-start rounded-md px-2.5 text-xs leading-5"
                    @click="row.suffixAction.onClick"
                  >
                    <i :class="remixIconForDetailFieldAction(row.suffixAction.label, row.suffixAction.icon)" />
                    {{ row.suffixAction.label }}
                  </Button>
                </div>
              </template>
              <template v-else-if="isStatusValue(row.value)">
                <TableStatusChip :value="row.value.value" :renderer="row.value.renderer" />
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
              <template v-else-if="row.linkAction">
                <button
                  type="button"
                  class="inline-flex max-w-full min-w-0 items-center gap-1 text-left text-[#2B67F6] transition-colors hover:text-[#1D4ED8]"
                  @click="row.linkAction.onClick"
                >
                  <span class="truncate">{{ displayValue(row.value) }}</span>
                  <i class="ri-arrow-right-up-line shrink-0 text-sm" />
                </button>
              </template>
              <template v-else-if="row.suffixAction">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div :class="cn('min-w-0 flex-1', row.truncate !== false && 'truncate')">
                    {{ displayValue(row.value) }}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    class="h-7 shrink-0 self-start rounded-md px-2.5 text-xs leading-5"
                    @click="row.suffixAction.onClick"
                  >
                    <i :class="remixIconForDetailFieldAction(row.suffixAction.label, row.suffixAction.icon)" />
                    {{ row.suffixAction.label }}
                  </Button>
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
                  <i :class="remixIconForDetailFieldAction(row.action.label, row.action.icon)" />
                  {{ row.action.label }}
                </Button>
              </template>
              <template v-else>
                <span>{{ displayValue(row.value) }}</span>
                <span
                  v-if="row.suffixHint"
                  :class="cn('ml-2 inline-flex items-center gap-1 align-middle text-xs text-muted-foreground', row.suffixHintClass)"
                >
                  <span>{{ row.suffixHint }}</span>
                </span>
              </template>
            </div>
          </div>
        </div>
      </section>

      <Separator v-if="!props.compact && sectionIndex < sections.length - 1" class="bg-border/80" />
    </template>
  </div>
</template>
