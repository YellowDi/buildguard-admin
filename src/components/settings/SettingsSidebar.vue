<script setup lang="ts">
import { computed } from "vue"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type {
  SettingsCategory,
  SettingsCategoryGroupKey,
  SettingsCategoryKey,
} from "@/components/settings/types"

const props = defineProps<{
  categories: SettingsCategory[]
  activeKey: SettingsCategoryKey
}>()

const emit = defineEmits<{
  "update:activeKey": [value: SettingsCategoryKey]
}>()

const activeItemClass = "sidebar-nav-active-surface text-sidebar-accent-foreground"

const groupOrder: SettingsCategoryGroupKey[] = ["account", "workspace", "feature", "admin"]

const groupLabels: Record<SettingsCategoryGroupKey, string> = {
  account: "账号",
  workspace: "工作空间",
  feature: "功能",
  admin: "管理员",
}

const groupedCategories = computed(() =>
  groupOrder
    .map(group => ({
      key: group,
      label: groupLabels[group],
      categories: props.categories.filter(category => category.group === group),
    }))
    .filter(group => group.categories.length > 0),
)
</script>

<template>
  <aside class="flex min-h-0 flex-col border-r border-sidebar-border bg-sidebar p-2 text-sidebar-foreground">
    <div class="flex items-center pb-4">
      <slot name="top" />
    </div>
    <nav class="flex min-h-0 flex-1 flex-col gap-4">
      <section
        v-for="group in groupedCategories"
        :key="group.key"
        class="space-y-1"
      >
        <p class="px-3 pb-1 text-xs font-medium text-sidebar-foreground/55">
          {{ group.label }}
        </p>

        <div class="flex flex-col gap-1">
          <button
            v-for="category in group.categories"
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
            <Avatar
              v-if="category.avatarFallback !== undefined"
              class="size-5 shrink-0 rounded-sm"
            >
              <AvatarImage
                v-if="category.avatarSrc"
                :src="category.avatarSrc"
                :alt="`${category.label} avatar`"
                class="object-cover"
              />
              <AvatarFallback class="rounded-sm bg-avatar-placeholder text-sidebar-primary">
                <span class="text-[9px] font-semibold">{{ category.avatarFallback }}</span>
              </AvatarFallback>
            </Avatar>
            <span
              v-else
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
        </div>
      </section>
    </nav>
  </aside>
</template>
