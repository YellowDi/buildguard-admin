<script setup lang="ts">
import { computed, ref, useSlots } from "vue"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  accept?: string
  multiple?: boolean
  disabled?: boolean
  loading?: boolean
  dragDisabled?: boolean
  title: string
  description?: string
  selectedLabel?: string
  buttonLabel?: string
  loadingLabel?: string
  icon?: string
  loadingIcon?: string
  disabledIcon?: string
  compact?: boolean
  showSupplement?: boolean
  class?: string
}>(), {
  accept: undefined,
  multiple: false,
  disabled: false,
  loading: false,
  dragDisabled: false,
  description: "",
  selectedLabel: "",
  buttonLabel: "选择文件",
  loadingLabel: "处理中...",
  icon: "ri-upload-2-line",
  loadingIcon: "ri-loader-4-line animate-spin",
  disabledIcon: "ri-lock-line",
  compact: false,
  showSupplement: false,
  class: "",
})

const emit = defineEmits<{
  filesSelected: [files: File[], source: "input" | "drop"]
}>()

const slots = useSlots()
const inputRef = ref<HTMLInputElement | null>(null)

const isInteractive = computed(() => !props.disabled && !props.loading)
const resolvedIcon = computed(() => {
  if (props.loading) return props.loadingIcon
  if (props.disabled) return props.disabledIcon
  return props.icon
})
const resolvedButtonLabel = computed(() => props.loading ? props.loadingLabel : props.buttonLabel)
const hasPreview = computed(() => Boolean(slots.preview))
const hasActions = computed(() => Boolean(slots.actions))
const hasSupplement = computed(() => props.showSupplement && Boolean(slots.preview || slots.default))

function openFileDialog() {
  if (!isInteractive.value) {
    return
  }

  inputRef.value?.click()
}

function handleInputChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])

  if (files.length) {
    emit("filesSelected", files, "input")
  }

  if (input) {
    input.value = ""
  }
}

function handleDrop(event: DragEvent) {
  if (!isInteractive.value || props.dragDisabled) {
    return
  }

  const files = Array.from(event.dataTransfer?.files ?? [])

  if (files.length) {
    emit("filesSelected", files, "drop")
  }
}
</script>

<template>
  <div
    :class="cn(
      'relative flex w-full min-w-0 flex-col gap-3 rounded-lg border border-dashed border-input bg-background/92 transition-[background-color,border-color,color] duration-180 ease-out',
      compact ? 'px-3 py-3' : 'px-4 py-4',
      isInteractive ? 'hover:border-ring/55 hover:bg-[var(--form-control-hover-background)]' : 'cursor-not-allowed opacity-75',
      props.class,
    )"
    :aria-disabled="!isInteractive"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <input
      ref="inputRef"
      class="hidden"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :disabled="!isInteractive"
      @change="handleInputChange"
    >

    <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex min-w-0 gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/35 text-muted-foreground">
          <i :class="cn(resolvedIcon, 'text-[20px]')" />
        </div>
        <div class="min-w-0 pt-0.5">
          <p class="text-sm font-medium text-foreground">
            {{ title }}
          </p>
          <p v-if="description" class="mt-1 text-xs leading-5 text-muted-foreground">
            {{ description }}
          </p>
          <p
            v-if="selectedLabel"
            class="mt-1 min-w-0 truncate text-xs leading-5 text-muted-foreground"
            :title="selectedLabel"
          >
            {{ selectedLabel }}
          </p>
        </div>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          type="button"
          class="h-9 shrink-0 gap-2 rounded-md"
          :disabled="!isInteractive"
          @click="openFileDialog"
        >
          <i :class="cn(resolvedIcon, 'text-sm')" />
          {{ resolvedButtonLabel }}
        </Button>
        <slot v-if="hasActions" name="actions" />
      </div>
    </div>

    <div v-if="hasSupplement" class="min-w-0 border-t border-dashed border-border pt-3">
      <div v-if="hasPreview" class="min-w-0">
        <slot name="preview" :open="openFileDialog" />
      </div>
      <slot :open="openFileDialog" />
    </div>
  </div>
</template>
