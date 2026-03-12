<script setup lang="ts">
import { computed } from "vue"
import type { HTMLAttributes } from "vue"
import type { StatusBadgeIcon, StatusBadgeTone } from "."
import { notionColorTokens } from "."
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  label: string
  tone?: StatusBadgeTone
  icon?: StatusBadgeIcon
  class?: HTMLAttributes["class"]
}>(), {
  tone: "gray",
  icon: "dot",
})

const iconClassMap: Record<Exclude<StatusBadgeIcon, "dot">, string> = {
  check: "ri-checkbox-circle-fill",
  clock: "ri-time-fill",
  alert: "ri-error-warning-fill",
  minus: "ri-indeterminate-circle-fill",
}

const badgeVars = computed(() => {
  const palette = notionColorTokens[props.tone]

  return {
    "--status-badge-text-light": palette.light.text,
    "--status-badge-bg-light": palette.light.background,
    "--status-badge-icon-light": palette.light.icon,
    "--status-badge-text-dark": palette.dark.text,
    "--status-badge-bg-dark": palette.dark.background,
    "--status-badge-icon-dark": palette.dark.icon,
  }
})

function getIconClass(icon: StatusBadgeIcon) {
  if (icon === "dot") {
    return ""
  }

  return iconClassMap[icon]
}
</script>

<template>
  <div
    :style="badgeVars"
    :class="cn(
      'inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-transparent pl-1 pr-2 text-[12px] font-medium leading-none',
      'bg-(--status-badge-bg-light) text-(--status-badge-text-light) dark:bg-(--status-badge-bg-dark) dark:text-(--status-badge-text-dark)',
      props.class,
    )"
  >
    <span
      :class="cn(
        'flex size-[18px] shrink-0 items-center justify-center',
        'text-(--status-badge-icon-light) dark:text-(--status-badge-icon-dark)',
      )"
    >
      <span v-if="icon === 'dot'" class="size-1.5 rounded-full bg-current" />
      <i v-else :class="cn('text-[14px] leading-none', getIconClass(icon))" />
    </span>
    <span class="truncate">
      {{ label }}
    </span>
  </div>
</template>
