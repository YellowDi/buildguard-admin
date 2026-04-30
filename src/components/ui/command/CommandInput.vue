<script setup lang="ts">
import type { ListboxFilterProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ListboxFilter, useForwardProps } from "reka-ui"
import { computed, watch } from "vue"
import { cn } from "@/lib/utils"
import { useCommand } from "."

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<ListboxFilterProps & {
  class?: HTMLAttributes["class"]
  modelValue?: string
}>()
const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)

const { filterState } = useCommand()

const searchValue = computed({
  get: () => props.modelValue ?? filterState.search,
  set: (value: string) => {
    filterState.search = value
    emit("update:modelValue", value)
  },
})

watch(() => props.modelValue, (value) => {
  if (typeof value === "string" && value !== filterState.search) {
    filterState.search = value
  }
}, { immediate: true })
</script>

<template>
  <div
    data-slot="command-input-wrapper"
    class="flex h-9 items-center gap-2 border-b px-3"
  >
    <i class="ri-search-line shrink-0 text-base leading-none opacity-50" />
    <ListboxFilter
      v-bind="{ ...forwardedProps, ...$attrs }"
      v-model="searchValue"
      data-slot="command-input"
      auto-focus
      :class="cn('placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50', props.class)"
    />
  </div>
</template>
