<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue"
import { Check, ChevronDown } from "lucide-vue-next"

import { cn } from "@/lib/utils"

type CalendarSelectOption = {
  value: number
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: number
  options: CalendarSelectOption[]
  triggerLabel: string
  class?: string
  contentClass?: string
}>(), {
  class: "",
  contentClass: "",
})

const emit = defineEmits<{
  "update:modelValue": [value: number]
}>()

const rootRef = ref<HTMLElement>()
const open = ref(false)

function toggleOpen() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function selectValue(value: number) {
  emit("update:modelValue", value)
  close()
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!open.value) {
    return
  }

  const target = event.target
  if (target instanceof Node && rootRef.value?.contains(target)) {
    return
  }

  close()
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown)
})
</script>

<template>
  <div ref="rootRef" class="relative" data-list-popover @click.stop @pointerdown.stop>
    <button
      type="button"
      :aria-label="triggerLabel"
      :aria-expanded="open"
      :class="
        cn(
          'border-input dark:bg-input/30 inline-flex h-8 items-center gap-1 rounded-md border bg-transparent px-2 pr-7 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          props.class,
        )
      "
      @click="toggleOpen"
    >
      <span class="whitespace-nowrap">{{ options.find(option => option.value === modelValue)?.label }}</span>
      <ChevronDown class="pointer-events-none absolute right-2 size-4 shrink-0 opacity-50" />
    </button>

    <div
      v-if="open"
      :class="
        cn(
          'absolute left-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-card)]',
          props.contentClass,
        )
      "
      data-list-popover
      @click.stop
      @pointerdown.stop
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="
          cn(
            'relative flex w-full items-center rounded-sm py-1.5 pl-2 pr-8 text-left text-sm transition',
            modelValue === option.value ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground',
          )
        "
        @click="selectValue(option.value)"
      >
        <span class="whitespace-nowrap">{{ option.label }}</span>
        <span class="absolute right-2 flex size-3.5 items-center justify-center">
          <Check v-if="modelValue === option.value" class="size-4" />
        </span>
      </button>
    </div>
  </div>
</template>
