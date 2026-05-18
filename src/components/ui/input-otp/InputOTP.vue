<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, provide, ref, watch } from "vue"

import { cn } from "@/lib/utils"
import { INPUT_OTP_CONTEXT_KEY } from "./context"

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  autocomplete?: string
  class?: HTMLAttributes["class"]
  disabled?: boolean
  inputmode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search"
  maxLength?: number
  modelValue?: string
  name?: string
}>(), {
  autocomplete: "off",
  disabled: false,
  inputmode: "numeric",
  maxLength: 6,
  modelValue: "",
  name: undefined,
})

const emit = defineEmits<{
  "complete": [value: string]
  "update:modelValue": [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const activeIndex = ref(-1)
const resolvedMaxLength = computed(() => Math.max(1, props.maxLength))
const resolvedDisabled = computed(() => Boolean(props.disabled))
const value = ref(normalizeValue(props.modelValue))

watch(() => props.modelValue, (nextValue) => {
  const normalized = normalizeValue(nextValue)

  if (value.value !== normalized) {
    value.value = normalized
  }
})

provide(INPUT_OTP_CONTEXT_KEY, {
  activeIndex,
  disabled: resolvedDisabled,
  focus: focusInput,
  maxLength: resolvedMaxLength,
  value,
})

function focusInput() {
  if (resolvedDisabled.value) {
    return
  }

  inputRef.value?.focus()
}

function handleFocus() {
  activeIndex.value = Math.min(value.value.length, resolvedMaxLength.value - 1)
}

function handleBlur() {
  activeIndex.value = -1
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  updateValue(target.value)
  target.value = value.value
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault()
  updateValue(event.clipboardData?.getData("text") ?? "")
}

function updateValue(nextValue: string) {
  const normalized = normalizeValue(nextValue)

  value.value = normalized
  activeIndex.value = Math.min(normalized.length, resolvedMaxLength.value - 1)
  emit("update:modelValue", normalized)

  if (normalized.length === resolvedMaxLength.value) {
    emit("complete", normalized)
  }
}

function normalizeValue(nextValue: unknown) {
  return String(nextValue ?? "")
    .replace(/\D/g, "")
    .slice(0, resolvedMaxLength.value)
}
</script>

<template>
  <div
    data-slot="input-otp"
    :class="cn('relative flex items-center gap-2', props.class)"
    @click="focusInput"
  >
    <slot />
    <input
      ref="inputRef"
      v-bind="$attrs"
      :autocomplete="props.autocomplete"
      :disabled="resolvedDisabled"
      :inputmode="props.inputmode"
      :maxlength="resolvedMaxLength"
      :name="props.name"
      :value="value"
      aria-label="一次性访问码"
      class="absolute inset-0 z-10 h-full w-full cursor-text bg-transparent text-transparent opacity-0 outline-none caret-transparent disabled:cursor-not-allowed"
      type="text"
      @blur="handleBlur"
      @focus="handleFocus"
      @input="handleInput"
      @paste="handlePaste"
    >
  </div>
</template>
