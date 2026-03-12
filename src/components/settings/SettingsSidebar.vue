<script setup lang="ts">
import { cn } from "@/lib/utils"
import type { SettingsCategory, SettingsCategoryKey } from "@/components/settings/types"

defineProps<{
  categories: SettingsCategory[]
  activeKey: SettingsCategoryKey
}>()

const emit = defineEmits<{
  "update:activeKey": [value: SettingsCategoryKey]
}>()

const activeItemClass = "sidebar-nav-active-surface text-sidebar-accent-foreground"
</script>

<template>
  <aside class="flex min-h-0 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
    <div class="flex items-center pb-4">
      <slot name="top" />
    </div>
    <nav class="flex min-h-0 flex-1 flex-col gap-1">
      <button
        v-for="category in categories"
        :key="category.key"
        type="button"
        :class="
          cn(
            'group flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors',
            activeKey === category.key
              ? activeItemClass
              : 'sidebar-nav-hover-surface hover:text-sidebar-accent-foreground',
          )
        "
        :aria-current="activeKey === category.key ? 'page' : undefined"
        @click="emit('update:activeKey', category.key)"
      >
        <span
          :class="
            cn(
              'inline-flex size-5 shrink-0 items-center justify-center text-lg leading-none transition-colors',
              activeKey === category.key
                ? 'text-link'
                : '',
            )
          "
        >
          <i :class="category.icon" />
        </span>
        <span class="min-w-0 truncate">
          {{ category.label }}
        </span>
      </button>
    </nav>
  </aside>
</template>
