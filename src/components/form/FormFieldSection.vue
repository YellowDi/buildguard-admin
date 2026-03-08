<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed } from "vue"

import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  id: string
  quickNavLabel: string
  label?: string
  labelFor?: string
  description?: string
  layout?: "responsive" | "horizontal" | "vertical"
  align?: "center" | "start"
  last?: boolean
  class?: HTMLAttributes["class"]
}>(), {
  label: "",
  labelFor: undefined,
  description: "",
  layout: "responsive",
  align: "center",
  last: false,
  class: undefined,
})

const sectionClass = computed(() =>
  cn(
    "scroll-mt-28 py-5",
    props.last ? "border-b-0" : "border-b border-dashed border-border",
    props.class,
  ),
)

const layoutClass = computed(() => {
  if (props.layout === "vertical") return "flex flex-col gap-3"
  if (props.layout === "horizontal") return "grid grid-cols-[minmax(0,1fr)_360px] gap-6"
  return "grid gap-3 md:grid-cols-[minmax(0,1fr)_360px] md:gap-6"
})

const labelWrapClass = computed(() => {
  if (props.layout === "vertical") return "min-w-0 space-y-1"
  if (props.layout === "horizontal") return cn("min-w-0 flex-1 space-y-1", props.align === "start" ? "self-start" : "self-center")
  return cn(
    "min-w-0 flex-1 space-y-1",
    props.align === "start" ? "md:self-start" : "md:self-center",
  )
})

const contentClass = computed(() => {
  if (props.layout === "vertical") return "w-full min-w-0"
  if (props.layout === "horizontal") return "w-full min-w-0 shrink-0"
  return "w-full min-w-0 md:w-[360px] md:shrink-0"
})
</script>

<template>
  <div :id="id" :data-quick-nav-label="quickNavLabel" :class="sectionClass">
    <Field :class="layoutClass">
      <div :class="labelWrapClass">
        <FieldLabel v-if="$slots.label || label" :for="labelFor">
          <slot name="label">{{ label }}</slot>
        </FieldLabel>
        <FieldDescription v-if="$slots.description || description">
          <slot name="description">{{ description }}</slot>
        </FieldDescription>
      </div>

      <FieldContent :class="contentClass">
        <slot />
      </FieldContent>
    </Field>
  </div>
</template>
