<script setup lang="ts">
import { computed } from "vue"

import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  title: string
  description?: string | null
  /** 页面级（设置浮窗右侧主标题）或区块级（表单分组标题） */
  variant?: "page" | "section"
  /** 仅 `variant="section"` 时生效，危险区块的说明文案用强调色 */
  tone?: "default" | "danger"
}>(), {
  variant: "page",
  tone: "default",
})

const showDescription = computed(() => {
  const text = props.description
  return typeof text === "string" && text.trim().length > 0
})

const isSection = computed(() => props.variant === "section")

const headingClass = computed(() =>
  isSection.value
    ? "text-[1.375rem] font-semibold tracking-tight"
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
  <header class="flex flex-col gap-1.5">
    <div class="min-w-0">
      <component :is="isSection ? 'h3' : 'h2'" :class="headingClass">
        {{ title }}
      </component>
      <p
        v-if="showDescription"
        :class="cn('mt-1 max-w-2xl', descriptionClass)"
      >
        {{ description }}
      </p>
    </div>
  </header>
</template>
