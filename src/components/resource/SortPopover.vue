<script setup lang="ts">
import { computed, ref } from "vue"

export type SortField = string
export type SortFieldOption = {
  value: SortField
  label: string
  kind?: "text" | "metric"
}

export type SortRule = {
  id: string
  field: SortField
  direction: "asc" | "desc"
}

const props = withDefaults(defineProps<{
  enabled: boolean
  rules: SortRule[]
  fieldOptions?: SortFieldOption[]
}>(), {
  fieldOptions: () => [],
})

const emit = defineEmits<{
  close: []
  "set-enabled": [enabled: boolean]
  "update-rules": [rules: SortRule[]]
}>()

const openMenu = ref<{ id: string; kind: "field" | "direction" } | null>(null)
const draggingRuleId = ref<string | null>(null)
const dragOverRuleId = ref<string | null>(null)

const sortFieldOptions = computed(() => props.fieldOptions ?? [])

const visibleRules = computed(() => (props.enabled ? props.rules : []))

function getFieldMeta(field: SortField) {
  return sortFieldOptions.value.find((option) => option.value === field) ?? null
}

function getDirectionOptions(field: SortField) {
  if (getFieldMeta(field)?.kind === "text") {
    return [
      { value: "asc" as const, label: "正序" },
      { value: "desc" as const, label: "倒序" },
    ]
  }

  return [
    { value: "desc" as const, label: "降序" },
    { value: "asc" as const, label: "升序" },
  ]
}

function getDirectionLabel(rule: SortRule) {
  return getDirectionOptions(rule.field).find((option) => option.value === rule.direction)?.label ?? "降序"
}

function toggleMenu(id: string, kind: "field" | "direction") {
  openMenu.value = openMenu.value?.id === id && openMenu.value.kind === kind ? null : { id, kind }
}

function buildNextRule(): SortRule {
  const fallbackField = sortFieldOptions.value[0]?.value ?? ""
  const unusedField = sortFieldOptions.value.find((option) => !props.rules.some((rule) => rule.field === option.value))?.value
    ?? fallbackField

  return {
    id: `sort-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    field: unusedField,
    direction: getFieldMeta(unusedField)?.kind === "text" ? "asc" : "desc",
  }
}

function handleAddSort() {
  if (!sortFieldOptions.value.length) {
    return
  }

  const nextRules = props.enabled ? [...props.rules, buildNextRule()] : [buildNextRule()]
  emit("set-enabled", true)
  emit("update-rules", nextRules)
}

function handleRemoveSort(id?: string) {
  if (!id) {
    emit("update-rules", [])
    emit("set-enabled", false)
    openMenu.value = null
    return
  }

  const nextRules = props.rules.filter((rule) => rule.id !== id)
  emit("update-rules", nextRules)
  emit("set-enabled", nextRules.length > 0)

  if (openMenu.value?.id === id) {
    openMenu.value = null
  }
}

function handleFieldSelect(id: string, field: SortField) {
  emit("set-enabled", true)
  emit(
    "update-rules",
    props.rules.map((rule) =>
      rule.id === id
        ? {
            ...rule,
            field,
            direction: getFieldMeta(field)?.kind === "text" ? "asc" : "desc",
          }
        : rule,
    ),
  )
  openMenu.value = null
}

function handleDirectionSelect(id: string, direction: "asc" | "desc") {
  emit("set-enabled", true)
  emit(
    "update-rules",
    props.rules.map((rule) => (rule.id === id ? { ...rule, direction } : rule)),
  )
  openMenu.value = null
}

function handleDragStart(event: DragEvent, id: string) {
  draggingRuleId.value = id
  dragOverRuleId.value = id
  event.dataTransfer?.setData("text/plain", id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move"
  }
}

function handleDragOver(event: DragEvent, id: string) {
  if (!draggingRuleId.value || draggingRuleId.value === id) {
    return
  }

  event.preventDefault()
  dragOverRuleId.value = id
}

function handleDrop(event: DragEvent, targetId: string) {
  event.preventDefault()

  const sourceId = draggingRuleId.value ?? event.dataTransfer?.getData("text/plain")
  if (!sourceId || sourceId === targetId) {
    handleDragEnd()
    return
  }

  const sourceIndex = props.rules.findIndex((rule) => rule.id === sourceId)
  const targetIndex = props.rules.findIndex((rule) => rule.id === targetId)

  if (sourceIndex === -1 || targetIndex === -1) {
    handleDragEnd()
    return
  }

  const nextRules = [...props.rules]
  const [movedRule] = nextRules.splice(sourceIndex, 1)
  nextRules.splice(targetIndex, 0, movedRule)
  emit("update-rules", nextRules)
  handleDragEnd()
}

function handleDragEnd() {
  draggingRuleId.value = null
  dragOverRuleId.value = null
}
</script>

<template>
  <div
    class="w-fit min-w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.10)]"
    data-list-popover
  >
    <div v-if="visibleRules.length" class="space-y-1.5">
      <div
        v-for="rule in visibleRules"
        :key="rule.id"
        :class="[
          'flex items-start gap-1.5 rounded-lg transition-colors',
          dragOverRuleId === rule.id && draggingRuleId !== rule.id ? 'bg-[#F8F8F9]' : '',
          draggingRuleId === rule.id ? 'opacity-60' : '',
        ]"
        @dragover="handleDragOver($event, rule.id)"
        @drop="handleDrop($event, rule.id)"
      >
        <button
          type="button"
          draggable="true"
          class="mt-0.5 inline-flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded-sm text-[#A1A1AA] transition hover:bg-[#F4F4F5] hover:text-[#71717A] active:cursor-grabbing"
          aria-label="拖动排序"
          @dragstart="handleDragStart($event, rule.id)"
          @dragend="handleDragEnd"
        >
          <i class="ri-draggable text-[16px]" />
        </button>

        <div class="relative" data-list-popover>
          <button
            type="button"
            class="inline-flex h-9 min-w-[136px] max-w-[220px] items-center rounded-md border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#3F3F46] ring-offset-background transition hover:bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            @click="toggleMenu(rule.id, 'field')"
          >
            <span class="whitespace-nowrap">{{ getFieldMeta(rule.field)?.label ?? "选择字段" }}</span>
            <i class="ri-arrow-down-s-line ml-auto shrink-0 text-[16px] text-[#A1A1AA]" />
          </button>

          <div
            v-if="openMenu?.id === rule.id && openMenu.kind === 'field'"
            class="absolute left-0 top-[calc(100%+6px)] z-40 min-w-[160px] rounded-md border border-[#E5E7EB] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
            data-list-popover
          >
            <button
              v-for="option in sortFieldOptions"
              :key="option.value"
              type="button"
              :class="[
                'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[12px] transition whitespace-nowrap',
                rule.field === option.value ? 'bg-[#F4F4F5] text-[#18181B]' : 'text-[#52525B] hover:bg-[#F8F8F9]',
              ]"
              @click="handleFieldSelect(rule.id, option.value)"
            >
              <span class="whitespace-nowrap">{{ option.label }}</span>
              <i v-if="rule.field === option.value" class="ri-check-line ml-auto shrink-0 text-[14px] text-[#3559E0]" />
            </button>
          </div>
        </div>

        <div class="relative shrink-0" data-list-popover>
          <button
            type="button"
            class="inline-flex h-9 min-w-[88px] items-center gap-2 rounded-md border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#3F3F46] ring-offset-background transition hover:bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            @click="toggleMenu(rule.id, 'direction')"
          >
            <span class="whitespace-nowrap">{{ getDirectionLabel(rule) }}</span>
            <i class="ri-arrow-down-s-line ml-auto shrink-0 text-[16px] text-[#A1A1AA]" />
          </button>

          <div
            v-if="openMenu?.id === rule.id && openMenu.kind === 'direction'"
            class="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[128px] rounded-md border border-[#E5E7EB] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
            data-list-popover
          >
            <button
              v-for="option in getDirectionOptions(rule.field)"
              :key="option.value"
              type="button"
              :class="[
                'flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-[12px] transition whitespace-nowrap',
                rule.direction === option.value ? 'bg-[#F4F4F5] text-[#18181B]' : 'text-[#52525B] hover:bg-[#F8F8F9]',
              ]"
              @click="handleDirectionSelect(rule.id, option.value)"
            >
              <span>{{ option.label }}</span>
              <i v-if="rule.direction === option.value" class="ri-check-line text-[14px] text-[#3559E0]" />
            </button>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[#A1A1AA] transition hover:bg-[#F4F4F5] hover:text-[#71717A]"
          aria-label="删除当前排序"
          @click="handleRemoveSort(rule.id)"
        >
          <i class="ri-close-line text-[18px]" />
        </button>
      </div>
    </div>

    <button
      type="button"
      class="mt-1 flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] font-medium text-[#3F3F46] transition hover:bg-[#F4F4F5]"
      @click="handleAddSort"
    >
      <i class="ri-add-line text-[18px]" />
      <span>添加排序</span>
    </button>

    <button
      type="button"
      class="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] font-medium transition"
      :class="enabled ? 'text-[#71717A] hover:bg-[#FEF2F2] hover:text-[#DC2626]' : 'cursor-not-allowed text-[#C7C7CC]'"
      :disabled="!enabled"
      @click="handleRemoveSort()"
    >
      <i class="ri-delete-bin-line text-[18px]" />
      <span>删除排序</span>
    </button>
  </div>
</template>
