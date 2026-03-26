<script setup lang="ts">
import { computed, useSlots } from "vue"

import type { DetailRelationColumn, DetailRelationModuleSchema } from "@/components/detail/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RelationRow = Record<string, unknown>

// 右侧“关联数据”模块。
// 适合渲染标题/计数 + 表头 + 分组 + 行的详情块；特殊单元格统一用 slot 扩展。
// 新页面优先通过 schema 配列和分组，只有状态图标、操作按钮这类特殊内容再写 slot。
const props = defineProps<{
  schema: DetailRelationModuleSchema<any>
}>()

const slots = useSlots()

const moduleStyle = computed(() => ({
  "--detail-relation-min-width": props.schema.mobileMinWidth ?? "100%",
  "--detail-relation-columns-mobile": props.schema.columnTemplateMobile,
  "--detail-relation-columns-desktop": props.schema.columnTemplateDesktop ?? props.schema.columnTemplateMobile,
  "--detail-relation-grid-gap-mobile": props.schema.columnGapMobile ?? "0.75rem",
  "--detail-relation-grid-gap-desktop": props.schema.columnGapDesktop ?? props.schema.columnGapMobile ?? "1rem",
}))

const displayCount = computed(() => (
  props.schema.count
  ?? props.schema.groups.reduce((sum, group) => sum + group.rows.length, 0)
))

const trailingColumns = computed(() => props.schema.columns.slice(1))

function getRowKey(row: RelationRow, index: number) {
  if (typeof props.schema.rowKey === "function") {
    return props.schema.rowKey(row, index)
  }

  const value = row[props.schema.rowKey]
  return typeof value === "string" || typeof value === "number" ? value : index
}

function getCellValue(column: DetailRelationColumn<RelationRow>, row: RelationRow) {
  if (column.value) {
    return column.value(row)
  }

  return row[column.key]
}

function getCellText(column: DetailRelationColumn<RelationRow>, row: RelationRow) {
  const value = getCellValue(column, row)
  if (isEmptyLikeValue(value)) return "无数据"
  return `${value}`
}

function isEmptyLikeValue(value: unknown) {
  if (value === null || value === undefined) return true
  if (typeof value !== "string") return false

  const normalized = value.trim()
  return normalized === "" || normalized === "-" || normalized === "—" || normalized === "未填写"
}

function hasNamedSlot(name?: string) {
  return Boolean(name && slots[name])
}

// cell 的默认回退顺序固定为：slot > value(row) > row[key]。
// 这样页面侧大多数列只配 schema 即可，只有少数复杂列需要模板。
</script>

<template>
  <section class="detail-relation-module min-w-0" :style="moduleStyle">
    <div class="detail-table-scroll">
      <div class="detail-table-frame detail-relation-frame">
        <div class="detail-table-heading-row detail-table-grid detail-relation-grid detail-section-inset items-center">
          <div class="flex min-w-0 items-center gap-2">
            <span class="shrink-0 whitespace-nowrap text-[15px] font-semibold leading-none text-foreground">{{ schema.title }}</span>
            <Badge
              variant="secondary"
              class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
            >
              {{ displayCount }}
            </Badge>
          </div>

          <div
            v-for="column in trailingColumns"
            :key="`${schema.key}-header-${column.key}`"
            :class="cn('whitespace-nowrap text-[12px] text-muted-foreground', column.headerClass)"
          >
            {{ column.label }}
          </div>
        </div>

        <div class="detail-group-stack">
          <div v-for="group in schema.groups" :key="group.key">
            <div class="detail-group-divider-row detail-section-inset flex items-center gap-3">
              <div class="shrink-0 text-[14px] font-medium text-muted-foreground">{{ group.title }}</div>
              <div class="h-px flex-1 bg-border/80" />
              <slot
                v-if="hasNamedSlot('group-actions')"
                name="group-actions"
                :group="group"
              />
            </div>

            <div
              v-for="(row, rowIndex) in group.rows"
              :key="`${group.key}-${getRowKey(row, rowIndex)}`"
              class="detail-relation-row detail-table-grid detail-relation-grid detail-section-inset items-center text-[14px] transition-colors hover:bg-surface-hover-strong"
            >
              <div
                v-for="column in schema.columns"
                :key="`${group.key}-${getRowKey(row, rowIndex)}-${column.key}`"
                :class="cn('min-w-0 text-foreground', isEmptyLikeValue(getCellValue(column, row)) && 'detail-relation-cell--empty', column.cellClass)"
              >
                <slot
                  v-if="column.slot"
                  :name="column.slot"
                  :row="row"
                  :column="column"
                  :group="group"
                  :row-index="rowIndex"
                  :value="getCellValue(column, row)"
                >
                  {{ getCellText(column, row) }}
                </slot>

                <template v-else-if="hasNamedSlot(column.key)">
                  <slot
                    :name="column.key"
                    :row="row"
                    :column="column"
                    :group="group"
                    :row-index="rowIndex"
                    :value="getCellValue(column, row)"
                  />
                </template>

                <template v-else>
                  {{ getCellText(column, row) }}
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
