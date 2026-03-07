<script setup lang="ts">
import { ref } from "vue"

import type { NumberFilterOperator, NumberFilterState } from "@/components/resource/types"

const props = defineProps<{
  title: string
  value: NumberFilterState
}>()

const emit = defineEmits<{
  close: []
  remove: []
  "update:value": [value: NumberFilterState]
}>()

const openMenu = ref(false)
const openActionMenu = ref(false)

const operatorOptions: Array<{ value: NumberFilterOperator; label: string }> = [
  { value: "equals", label: "=" },
  { value: "notEquals", label: "≠" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
  { value: "isEmpty", label: "为空白" },
  { value: "isNotEmpty", label: "不为空白" },
]

function getOperatorLabel(operator: NumberFilterOperator) {
  return operatorOptions.find((option) => option.value === operator)?.label ?? "="
}

function operatorNeedsInput(operator: NumberFilterOperator) {
  return operator !== "isEmpty" && operator !== "isNotEmpty"
}

function handleDeleteFilter() {
  openMenu.value = false
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

function handleOperatorSelect(operator: NumberFilterOperator, currentValue: NumberFilterState) {
  const nextQuery = operatorNeedsInput(operator) ? currentValue.query : ""
  emit("update:value", {
    ...currentValue,
    operator,
    query: nextQuery,
    enabled: operatorNeedsInput(operator) ? nextQuery.trim().length > 0 : true,
  })
  openMenu.value = false
  openActionMenu.value = false
}
</script>

<template>
  <div
    class="w-[252px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#E5E7EB] bg-white p-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.10)]"
    data-list-popover
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-1 text-[12px] font-semibold text-[#727272]">
        <span class="truncate">{{ title }}</span>
        <div class="relative" data-list-popover>
          <button
            type="button"
            class="inline-flex items-center gap-0.5 rounded-sm px-0.5 text-[#6A6A6A] ring-offset-background transition hover:text-[#303030] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            @click="openMenu = !openMenu; openActionMenu = false"
          >
            <span>{{ getOperatorLabel(value.operator) }}</span>
            <i class="ri-arrow-down-s-line text-[16px]" />
          </button>

          <div
            v-if="openMenu"
            class="absolute left-[-8px] top-[calc(100%+8px)] z-40 min-w-[132px] rounded-md border border-[#E5E7EB] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
            data-list-popover
          >
            <button
              v-for="option in operatorOptions"
              :key="option.value"
              type="button"
              :class="[
                'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[11px] font-medium transition whitespace-nowrap',
                value.operator === option.value ? 'bg-[#F4F4F5] text-[#18181B]' : 'text-[#52525B] hover:bg-[#F8F8F9]',
              ]"
              @click="handleOperatorSelect(option.value, value)"
            >
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="relative shrink-0" data-list-popover>
        <button
          type="button"
          class="inline-flex size-6 items-center justify-center rounded-md text-[#8B8B8B] ring-offset-background transition hover:bg-[#F5F5F5] hover:text-[#4B4B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="删除当前筛选"
          @click="openActionMenu = !openActionMenu; openMenu = false"
        >
          <i class="ri-more-line text-[14px]" />
        </button>

        <div
          v-if="openActionMenu"
          class="absolute left-[calc(100%+6px)] top-1/2 z-40 min-w-[104px] -translate-y-1/2 rounded-md border border-[#E5E7EB] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
          data-list-popover
        >
          <button
            type="button"
            class="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[11px] font-medium text-[#B42318] transition hover:bg-[#FEF3F2]"
            @click="handleDeleteFilter"
          >
            删除筛选
          </button>
        </div>
      </div>
    </div>

    <div class="mt-2">
      <label
        :class="[
          'flex h-9 items-center rounded-md border bg-background px-3 py-2 text-sm ring-offset-background transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          operatorNeedsInput(value.operator)
            ? 'border-[#E4E4E7] bg-white'
            : 'cursor-not-allowed border-[#ECECEC] bg-[#F8F8F8] opacity-70',
        ]"
      >
        <input
          :value="value.query"
          type="text"
          inputmode="numeric"
          :disabled="!operatorNeedsInput(value.operator)"
          :placeholder="operatorNeedsInput(value.operator) ? (value.placeholder ?? `输入${title}`) : '当前条件无需输入内容'"
          :class="[
            'w-full border-0 bg-transparent p-0 text-[12px] outline-none placeholder:text-[#B4B4B4] focus-visible:outline-none',
            operatorNeedsInput(value.operator) ? 'text-[#303030]' : 'cursor-not-allowed text-[#B4B4B4]',
          ]"
          @input="handleQueryInput(($event.target as HTMLInputElement).value)"
        >

        <button
          v-if="operatorNeedsInput(value.operator) && value.query"
          type="button"
          class="ml-2 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[#A1A1AA] transition hover:bg-[#F4F4F5] hover:text-[#52525B]"
          aria-label="清空输入内容"
          @click="handleClearQuery"
        >
          <i class="ri-close-line text-[12px]" />
        </button>
      </label>
    </div>
  </div>
</template>
