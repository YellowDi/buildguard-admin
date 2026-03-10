<script setup lang="ts">
import { ref } from "vue"

import PopoverSelect from "@/components/resource/PopoverSelect.vue"
import { Checkbox } from "@/components/ui/checkbox"
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
      <div class="flex min-w-0 items-baseline gap-2.5">
        <span class="shrink-0 truncate text-[12px] font-semibold leading-none text-muted-foreground">{{ title }}</span>
        <PopoverSelect
          :model-value="value.operator"
          :options="operatorOptions"
          :placeholder="getOperatorLabel(value.operator)"
          trigger-label="筛选条件"
          content-class="min-w-[132px]"
          @update:model-value="(operator) => handleOperatorSelect(operator as TagFilterOperator)"
        />
      </div>

      <div class="relative shrink-0" data-list-popover>
        <button
          type="button"
          class="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground ring-offset-background transition hover:bg-surface-tertiary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0"
          aria-label="删除当前筛选"
          @click="openActionMenu = !openActionMenu"
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
        <Checkbox
          :model-value="value.values.includes(option)"
          :disabled="!operatorNeedsSelection(value.operator)"
          class="pointer-events-none"
        />
        <span class="truncate">{{ option }}</span>
      </button>
    </div>
  </div>
</template>
