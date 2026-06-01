<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, useSlots } from "vue"

import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

const slots = useSlots()

const props = withDefaults(defineProps<{
  id: string
  quickNavLabel: string
  label?: string
  labelFor?: string
  required?: boolean
  invalid?: boolean
  description?: string
  layout?: "responsive" | "horizontal" | "vertical"
  align?: "center" | "start"
  last?: boolean
  class?: HTMLAttributes["class"]
}>(), {
  label: "",
  labelFor: undefined,
  required: false,
  invalid: false,
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

const invalidContentClass = [
  "data-[invalid=true]:rounded-md data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive/25 data-[invalid=true]:ring-offset-2 data-[invalid=true]:ring-offset-background",
  "data-[invalid=true]:[&_[data-slot=input]]:border-destructive data-[invalid=true]:[&_[data-slot=input]]:ring-[3px] data-[invalid=true]:[&_[data-slot=input]]:ring-destructive/20 dark:data-[invalid=true]:[&_[data-slot=input]]:ring-destructive/40",
  "data-[invalid=true]:[&_[data-slot=select-trigger]]:border-destructive data-[invalid=true]:[&_[data-slot=select-trigger]]:ring-[3px] data-[invalid=true]:[&_[data-slot=select-trigger]]:ring-destructive/20 dark:data-[invalid=true]:[&_[data-slot=select-trigger]]:ring-destructive/40",
  "data-[invalid=true]:[&_[data-slot=date-picker-trigger]]:border-destructive data-[invalid=true]:[&_[data-slot=date-picker-trigger]]:ring-[3px] data-[invalid=true]:[&_[data-slot=date-picker-trigger]]:ring-destructive/20 dark:data-[invalid=true]:[&_[data-slot=date-picker-trigger]]:ring-destructive/40",
  "data-[invalid=true]:[&_[data-slot=textarea]]:border-destructive data-[invalid=true]:[&_[data-slot=textarea]]:ring-[3px] data-[invalid=true]:[&_[data-slot=textarea]]:ring-destructive/20 dark:data-[invalid=true]:[&_[data-slot=textarea]]:ring-destructive/40",
].join(" ")

const hasLabelColumn = computed(() =>
  Boolean(props.label)
    || Boolean(props.description)
    || Boolean(slots.label)
    || Boolean(slots.description),
)
</script>

<template>
  <div :id="id" :data-quick-nav-label="quickNavLabel" :class="sectionClass">
    <Field :class="layoutClass">
      <div v-if="hasLabelColumn" :class="labelWrapClass">
        <FieldLabel v-if="$slots.label || label" :for="labelFor" class="inline-flex flex-wrap items-baseline gap-x-1">
          <slot v-if="$slots.label" name="label" />
          <template v-else>
            <span>{{ label }}</span>
            <span v-if="!required" class="font-normal text-muted-foreground">(选填)</span>
          </template>
        </FieldLabel>
        <FieldDescription v-if="$slots.description || description">
          <slot name="description">{{ description }}</slot>
        </FieldDescription>
      </div>

      <FieldContent :data-invalid="invalid ? 'true' : undefined" :class="cn(contentClass, invalidContentClass)">
        <slot />
      </FieldContent>
    </Field>
  </div>
</template>
