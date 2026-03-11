<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue"

import { Input } from "@/components/ui/input"
import PopoverSelect from "@/components/table-page/TablePopoverSelect.vue"
import type { TextFilterOperator, TextFilterState } from "@/components/table-page/types"

const props = defineProps<{
  title: string
  value: TextFilterState
}>()

const emit = defineEmits<{
  close: []
  remove: []
  "update:value": [value: TextFilterState]
}>()

const openActionMenu = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const operatorOptions: Array<{ value: TextFilterOperator; label: string }> = [
  { value: "equals", label: "是" },
  { value: "notEquals", label: "不是" },
  { value: "contains", label: "包含" },
  { value: "notContains", label: "不包含" },
  { value: "startsWith", label: "开头是" },
  { value: "endsWith", label: "结尾是" },
  { value: "isEmpty", label: "为空白" },
  { value: "isNotEmpty", label: "不为空白" },
]

function getOperatorLabel(operator: TextFilterOperator) {
  return operatorOptions.find((option) => option.value === operator)?.label ?? "包含"
}

function operatorNeedsInput(operator: TextFilterOperator) {
  return operator !== "isEmpty" && operator !== "isNotEmpty"
}

function handleDeleteFilter() {
  openActionMenu.value = false
  emit("remove")
  emit("close")
}

function handleQueryInput(query: string) {
  emit("update:value", {
    ...props.value,
    query,
    enabled: query.trim().length > 0,
  })
}

function handleClearQuery() {
  handleQueryInput("")
}

function handleOperatorSelect(operator: TextFilterOperator, currentValue: TextFilterState) {
  const nextQuery = operatorNeedsInput(operator) ? currentValue.query : ""
  emit("update:value", {
    ...currentValue,
    operator,
    query: nextQuery,
    enabled: operatorNeedsInput(operator) ? nextQuery.trim().length > 0 : true,
  })
  openActionMenu.value = false
}

function focusSingleInput() {
  nextTick(() => {
    const inputs = rootRef.value?.querySelectorAll<HTMLInputElement>("input:not([disabled])") ?? []
    if (inputs.length !== 1) {
      return
    }

    const [input] = inputs
    input.focus()
    const cursorPosition = input.value.length
    input.setSelectionRange(cursorPosition, cursorPosition)
  })
}

onMounted(() => {
  focusSingleInput()
})

watch(() => props.value.operator, () => {
  if (!operatorNeedsInput(props.value.operator)) {
    return
  }

  focusSingleInput()
})
</script>

<template>
  <div
    ref="rootRef"
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
          @update:model-value="(operator) => handleOperatorSelect(operator as TextFilterOperator, value)"
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

    <div class="mt-2 flex items-center gap-2">
      <Input
        :model-value="value.query"
        :disabled="!operatorNeedsInput(value.operator)"
        :placeholder="operatorNeedsInput(value.operator) ? (value.placeholder ?? `输入${title}`) : '当前条件无需输入内容'"
        :class="[
          'h-9 min-w-0 flex-1 text-[12px]',
          !operatorNeedsInput(value.operator) && 'cursor-not-allowed opacity-70',
        ]"
        @update:model-value="(v) => handleQueryInput(String(v))"
      />
      <button
        v-if="operatorNeedsInput(value.operator) && value.query"
        type="button"
        class="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-tertiary hover:text-foreground"
        aria-label="清空输入内容"
        @click="handleClearQuery"
      >
        <i class="ri-close-line text-[12px]" />
      </button>
    </div>
  </div>
</template>
