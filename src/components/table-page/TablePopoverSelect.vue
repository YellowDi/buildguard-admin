<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

import { cn } from "@/lib/utils"

type PopoverSelectOption = {
  value: string
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: PopoverSelectOption[]
  triggerLabel: string
  placeholder?: string
  disabled?: boolean
  variant?: "inline" | "field"
  align?: "left" | "right"
  triggerClass?: string
  contentClass?: string
}>(), {
  placeholder: "",
  disabled: false,
  variant: "inline",
  align: "left",
  triggerClass: "",
  contentClass: "",
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const rootRef = ref<HTMLElement>()
const open = ref(false)

const selectedLabel = computed(() => {
  return props.options.find(option => option.value === props.modelValue)?.label ?? props.placeholder
})

const triggerClasses = computed(() => {
  if (props.variant === "field") {
    return cn(
      "border-input dark:bg-input/30 flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
      props.triggerClass,
    )
  }

  return cn(
    "inline-flex h-auto w-auto min-h-0 min-w-0 shrink-0 items-center justify-start gap-1 bg-transparent px-0 py-0 text-[12px] font-semibold leading-none text-muted-foreground outline-none transition hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
    props.triggerClass,
  )
})

const contentClasses = computed(() => {
  return cn(
    "absolute top-[calc(100%+6px)] z-50 min-w-[8rem] overflow-hidden rounded-md bg-popover p-1 text-popover-foreground shadow-[var(--shadow-card)]",
    props.align === "right" ? "right-0" : "left-0",
    props.contentClass,
  )
})

function toggleOpen() {
  if (props.disabled) {
    return
  }

  open.value = !open.value
}

function close() {
  open.value = false
}

function selectValue(nextValue: string) {
  emit("update:modelValue", nextValue)
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
      :class="triggerClasses"
      :aria-label="triggerLabel"
      :aria-expanded="open"
      :disabled="disabled"
      @click="toggleOpen"
    >
      <span :class="variant === 'field' ? 'truncate' : 'whitespace-nowrap leading-none'">{{ selectedLabel }}</span>
      <i :class="variant === 'field' ? 'ri-arrow-down-s-line shrink-0 text-base leading-none opacity-50' : 'ri-arrow-down-s-line shrink-0 text-sm leading-none opacity-60'" />
    </button>

    <div
      v-if="open"
      :class="contentClasses"
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
            'relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition',
            props.modelValue === option.value ? 'bg-accent text-accent-foreground' : 'text-popover-foreground hover:bg-interactive-hover hover:text-popover-foreground',
          )
        "
        @click="selectValue(option.value)"
      >
        <span class="truncate">{{ option.label }}</span>
        <span class="absolute right-2 flex size-3.5 items-center justify-center">
          <i v-if="props.modelValue === option.value" class="ri-check-line text-base leading-none" />
        </span>
      </button>
    </div>
  </div>
</template>
