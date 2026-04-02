<script setup lang="ts">
import { computed, ref } from "vue"

import PopoverSelect from "@/components/table-page/TablePopoverSelect.vue"

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
    return
  }

  const nextRules = props.rules.filter((rule) => rule.id !== id)
  emit("update-rules", nextRules)
  emit("set-enabled", nextRules.length > 0)
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
}

function handleDirectionSelect(id: string, direction: "asc" | "desc") {
  emit("set-enabled", true)
  emit(
    "update-rules",
    props.rules.map((rule) => (rule.id === id ? { ...rule, direction } : rule)),
  )
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
    class="w-fit min-w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-1.5 shadow-[var(--shadow-card)]"
    data-list-popover
  >
    <div v-if="visibleRules.length" class="space-y-1.5">
      <div
        v-for="rule in visibleRules"
        :key="rule.id"
        :class="[
          'flex items-start gap-1.5 rounded-lg transition-colors',
          dragOverRuleId === rule.id && draggingRuleId !== rule.id ? 'bg-surface-tertiary' : '',
          draggingRuleId === rule.id ? 'opacity-60' : '',
        ]"
        @dragover="handleDragOver($event, rule.id)"
        @drop="handleDrop($event, rule.id)"
      >
        <button
          type="button"
          draggable="true"
          class="mt-0.5 inline-flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground transition hover:bg-surface-tertiary hover:text-foreground active:cursor-grabbing"
          aria-label="拖动排序"
          @dragstart="handleDragStart($event, rule.id)"
          @dragend="handleDragEnd"
        >
          <i class="ri-draggable text-[16px]" />
        </button>

        <PopoverSelect
          :model-value="rule.field"
          :options="sortFieldOptions"
          placeholder="选择字段"
          trigger-label="排序字段"
          variant="field"
          trigger-class="min-w-[136px] max-w-[220px] text-[13px]"
          content-class="min-w-[160px]"
          @update:model-value="(field) => handleFieldSelect(rule.id, String(field))"
        />

        <PopoverSelect
          :model-value="rule.direction"
          :options="getDirectionOptions(rule.field)"
          :placeholder="getDirectionLabel(rule)"
          trigger-label="排序方向"
          variant="field"
          trigger-class="min-w-[88px] text-[13px]"
          content-class="min-w-[128px]"
          @update:model-value="(direction) => handleDirectionSelect(rule.id, direction as 'asc' | 'desc')"
        />

        <button
          type="button"
          class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-tertiary hover:text-foreground"
          aria-label="删除当前排序"
          @click="handleRemoveSort(rule.id)"
        >
          <i class="ri-close-line text-[18px]" />
        </button>
      </div>
    </div>

    <button
      type="button"
      class="mt-1 flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] font-medium text-foreground transition hover:bg-surface-tertiary"
      @click="handleAddSort"
    >
      <i class="ri-add-line text-[18px]" />
      <span>添加排序</span>
    </button>

    <button
      type="button"
      class="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] font-medium transition"
      :class="enabled ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive' : 'cursor-not-allowed text-muted-foreground'"
      :disabled="!enabled"
      @click="handleRemoveSort()"
    >
      <i class="ri-delete-bin-line text-[18px]" />
      <span>删除排序</span>
    </button>
  </div>
</template>
