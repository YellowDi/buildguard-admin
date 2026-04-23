<script setup lang="ts">
import { computed, useSlots } from "vue"

import TableTitleBlock from "@/components/detail/TableTitleBlock.vue"
import type { DetailRelationColumn, DetailRelationModuleSchema } from "@/components/detail/types"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

type RelationRow = Record<string, unknown>

// 右侧“关联数据”模块。
// 适合渲染标题/计数 + 表头 + 分组 + 行的详情块；特殊单元格统一用 slot 扩展。
// 新页面优先通过 schema 配列和分组，只有状态图标、操作按钮这类特殊内容再写 slot。
const props = defineProps<{
  schema: DetailRelationModuleSchema<any>
  useTitleBlock?: boolean
  hideTitleBlock?: boolean
}>()

const slots = useSlots()

const moduleStyle = computed(() => ({
  "--detail-relation-columns-mobile": props.schema.columnTemplateMobile,
  "--detail-relation-columns-desktop": props.schema.columnTemplateDesktop ?? props.schema.columnTemplateMobile,
  "--detail-relation-grid-gap-mobile": props.schema.columnGapMobile ?? "0.75rem",
  "--detail-relation-grid-gap-desktop": props.schema.columnGapDesktop ?? props.schema.columnGapMobile ?? "1rem",
}))

const displayCount = computed(() => (
  props.schema.count
  ?? props.schema.groups.reduce((sum, group) => sum + group.rows.length, 0)
))

const hasRows = computed(() => displayCount.value > 0)

const trailingColumns = computed(() => props.schema.columns.slice(1))
const hasRowAction = computed(() => typeof props.schema.rowAction === "function")

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

function isInteractiveTarget(target: EventTarget | null, currentTarget?: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const interactiveAncestor = target.closest(
    "button, a, input, select, textarea, summary, label, [role='button'], [role='link'], [data-detail-relation-ignore-row-click='true']",
  )

  if (!interactiveAncestor) {
    return false
  }

  return interactiveAncestor !== currentTarget
}

function hasActiveTextSelection() {
  if (typeof window === "undefined" || typeof window.getSelection !== "function") {
    return false
  }

  const selection = window.getSelection()
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim())
}

function handleRowClick(event: MouseEvent, row: RelationRow) {
  if (!props.schema.rowAction) {
    return
  }

  if (isInteractiveTarget(event.target, event.currentTarget) || hasActiveTextSelection()) {
    return
  }

  props.schema.rowAction(row)
}

function handleRowKeydown(event: KeyboardEvent, row: RelationRow) {
  if (!props.schema.rowAction) {
    return
  }

  if (isInteractiveTarget(event.target, event.currentTarget)) {
    return
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return
  }

  event.preventDefault()
  props.schema.rowAction(row)
}

// cell 的默认回退顺序固定为：slot > value(row) > row[key]。
// 这样页面侧大多数列只配 schema 即可，只有少数复杂列需要模板。
</script>

<template>
  <section class="detail-relation-module w-full min-w-0 max-w-full" :style="moduleStyle">
    <div class="detail-table-scroll">
      <div class="detail-table-frame detail-relation-frame" :style="{ minWidth: props.schema.mobileMinWidth ?? '100%' }">
        <TableTitleBlock
          v-if="!props.hideTitleBlock"
          :module-key="schema.key"
          :title="schema.title"
          :count="displayCount"
          :columns="trailingColumns"
          :padded="props.useTitleBlock"
        >
          <template
            v-for="column in trailingColumns"
            :key="`${schema.key}-header-slot-${column.key}`"
            #[`${column.key}-header`]="slotProps"
          >
            <slot
              v-if="hasNamedSlot(`${column.key}-header`)"
              :name="`${column.key}-header`"
              v-bind="slotProps"
            />
            <template v-else>
              {{ column.label }}
            </template>
          </template>
        </TableTitleBlock>

        <div
          v-if="!hasRows"
          class="flex min-h-[min(160px,30vh)] w-full min-w-0 flex-col items-center justify-center px-4 py-12"
        >
          <Empty class="w-full max-w-md flex-none border-0 bg-transparent shadow-none p-6! md:p-8!">
            <EmptyHeader class="max-w-md">
              <EmptyMedia variant="icon">
                <i
                  :class="[
                    schema.emptyState?.icon ?? 'ri-inbox-line',
                    'text-[18px]',
                  ]"
                />
              </EmptyMedia>
              <EmptyTitle>{{ schema.emptyState?.title ?? "暂无数据" }}</EmptyTitle>
              <EmptyDescription>
                {{ schema.emptyState?.description ?? "当前暂无可展示的数据。" }}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>

        <div v-else class="detail-group-stack">
          <div v-for="group in schema.groups" :key="group.key">
            <div
              v-if="group.title || hasNamedSlot('group-actions')"
              class="detail-group-divider-row detail-section-inset flex min-w-0 items-center gap-3"
            >
              <div class="flex min-w-0 items-center gap-2">
                <div class="min-w-0 truncate text-[14px] font-medium text-muted-foreground">{{ group.title }}</div>
                <slot
                  v-if="hasNamedSlot('group-actions')"
                  name="group-actions"
                  :group="group"
                />
              </div>
              <div class="h-px min-w-0 flex-1 bg-border/80" />
            </div>

            <div
              v-for="(row, rowIndex) in group.rows"
              :key="`${group.key}-${getRowKey(row, rowIndex)}`"
              :class="cn(
                'detail-relation-row detail-table-grid detail-relation-grid detail-section-inset items-center text-[14px] transition-colors hover:bg-surface-hover-strong',
                hasRowAction && 'cursor-pointer active:bg-surface-secondary/80',
              )"
              :tabindex="hasRowAction ? 0 : undefined"
              :role="hasRowAction ? 'button' : undefined"
              @click="handleRowClick($event, row)"
              @keydown="handleRowKeydown($event, row)"
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
