<script setup lang="ts">
import { ref } from "vue"

import type { TagFilterOperator, TagFilterState } from "@/components/resource/types"

const props = defineProps<{
  title: string
  value: TagFilterState
  options: string[]
}>()

const emit = defineEmits<{
  close: []
  remove: []
  "update:value": [value: TagFilterState]
}>()

const openMenu = ref(false)
const openActionMenu = ref(false)

const operatorOptions: Array<{ value: TagFilterOperator; label: string }> = [
  { value: "equals", label: "是" },
  { value: "notEquals", label: "不是" },
  { value: "isEmpty", label: "为空白" },
  { value: "isNotEmpty", label: "不为空白" },
]

function getOperatorLabel(operator: TagFilterOperator) {
  return operatorOptions.find((option) => option.value === operator)?.label ?? "是"
}

function operatorNeedsSelection(operator: TagFilterOperator) {
  return operator !== "isEmpty" && operator !== "isNotEmpty"
}

function updateValue(nextValue: TagFilterState) {
  emit("update:value", {
    ...nextValue,
    enabled: operatorNeedsSelection(nextValue.operator) ? nextValue.values.length > 0 : true,
  })
}

function handleDeleteFilter() {
  openMenu.value = false
  openActionMenu.value = false
  emit("remove")
  emit("close")
}

function handleOperatorSelect(operator: TagFilterOperator) {
  updateValue({
    ...props.value,
    operator,
    values: operatorNeedsSelection(operator) ? props.value.values : [],
  })
  openMenu.value = false
  openActionMenu.value = false
}

function handleOptionToggle(option: string) {
  const nextValues = props.value.values.includes(option)
    ? props.value.values.filter((value) => value !== option)
    : [...props.value.values, option]

  updateValue({
    ...props.value,
    values: nextValues,
  })
}
</script>

<template>
  <div
    class="w-[252px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-2.5 shadow-lg"
    data-list-popover
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-1 text-[12px] font-semibold text-muted-foreground">
        <span class="truncate">{{ title }}</span>
        <div class="relative" data-list-popover>
          <button
            type="button"
            class="inline-flex items-center gap-0.5 rounded-sm px-0.5 text-muted-foreground ring-offset-background transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            @click="openMenu = !openMenu; openActionMenu = false"
          >
            <span>{{ getOperatorLabel(value.operator) }}</span>
            <i class="ri-arrow-down-s-line text-[16px]" />
          </button>

          <div
            v-if="openMenu"
            class="absolute left-[-8px] top-[calc(100%+8px)] z-40 min-w-[132px] rounded-md border border-border bg-popover p-1 shadow-lg"
            data-list-popover
          >
            <button
              v-for="option in operatorOptions"
              :key="option.value"
              type="button"
              :class="[
                'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[11px] font-medium transition whitespace-nowrap',
                value.operator === option.value ? 'bg-surface-tertiary text-foreground' : 'text-muted-foreground hover:bg-surface-tertiary',
              ]"
              @click="handleOperatorSelect(option.value)"
            >
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="relative shrink-0" data-list-popover>
        <button
          type="button"
          class="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground ring-offset-background transition hover:bg-surface-tertiary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="删除当前筛选"
          @click="openActionMenu = !openActionMenu; openMenu = false"
        >
          <i class="ri-more-line text-[14px]" />
        </button>

        <div
          v-if="openActionMenu"
          class="absolute left-[calc(100%+6px)] top-1/2 z-40 min-w-[104px] -translate-y-1/2 rounded-md border border-border bg-popover p-1 shadow-lg"
          data-list-popover
        >
          <button
            type="button"
            class="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[11px] font-medium text-destructive transition hover:bg-destructive/10"
            @click="handleDeleteFilter"
          >
            删除筛选
          </button>
        </div>
      </div>
    </div>

    <div
      :class="[
        'mt-2 max-h-[220px] space-y-1 overflow-y-auto',
        operatorNeedsSelection(value.operator) ? '' : 'opacity-70',
      ]"
    >
      <button
        v-for="option in options"
        :key="option"
        type="button"
        :disabled="!operatorNeedsSelection(value.operator)"
        :class="[
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition',
          !operatorNeedsSelection(value.operator)
            ? 'cursor-not-allowed text-muted-foreground'
            : value.values.includes(option)
              ? 'bg-surface-tertiary text-foreground'
              : 'text-muted-foreground hover:bg-surface-tertiary',
        ]"
        @click="handleOptionToggle(option)"
      >
        <span
          :class="[
            'inline-flex size-4 items-center justify-center rounded border text-[11px]',
            value.values.includes(option)
              ? 'border-link bg-selection text-link'
              : 'border-input bg-background text-transparent',
          ]"
        >
          <i class="ri-check-line" />
        </span>
        <span class="truncate">{{ option }}</span>
      </button>
    </div>
  </div>
</template>
