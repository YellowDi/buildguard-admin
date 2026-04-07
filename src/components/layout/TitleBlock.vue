<script setup lang="ts">
import { computed, useSlots } from "vue"

import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  title: string
  description?: string | null
  /** 页面级主标题或模块级分组标题 */
  variant?: "page" | "section"
  /** 仅 `variant="section"` 时生效，危险区块说明使用强调色 */
  tone?: "default" | "danger"
  showSeparator?: boolean
  separatorClass?: string
  sticky?: boolean
  stickyClass?: string
}>(), {
  variant: "page",
  tone: "default",
  showSeparator: false,
  separatorClass: "",
  sticky: false,
  stickyClass: "",
})

const slots = useSlots()
const showDescription = computed(() => {
  const text = props.description
  return typeof text === "string" && text.trim().length > 0
})

const isSection = computed(() => props.variant === "section")
const hasAppend = computed(() => Boolean(slots.append))

const headingClass = computed(() =>
  isSection.value
    ? "text-base font-semibold tracking-tight text-foreground"
    : "text-[1.625rem] font-semibold tracking-tight",
)

const descriptionClass = computed(() => {
  if (isSection.value && props.tone === "danger") {
    return "text-sm leading-6 text-destructive/80"
  }
  return "text-sm leading-6 text-muted-foreground"
})
</script>

<template>
  <div
    :class="cn(
      'flex flex-col',
      props.sticky && 'sticky top-0 z-10 bg-background',
      props.stickyClass,
    )"
  >
    <header class="flex flex-col gap-1.5">
      <div class="min-w-0">
        <component :is="isSection ? 'h3' : 'h2'" :class="['flex min-w-0 items-center gap-2', headingClass]">
          {{ title }}
          <slot v-if="hasAppend" name="append" />
        </component>
        <p
          v-if="showDescription"
          :class="cn('mt-1 max-w-2xl', descriptionClass)"
        >
          {{ description }}
        </p>
      </div>
    </header>
    <Separator
      v-if="props.showSeparator"
      :class="cn('mt-2 bg-border/80', props.separatorClass)"
    />
  </div>
</template>
