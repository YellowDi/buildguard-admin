<script setup lang="ts">
import {
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import type { AppSidebarNavItem } from "@/components/layout/app-sidebar/types"

const props = defineProps<{
  items: AppSidebarNavItem[]
  activePath: string
}>()

const emit = defineEmits<{
  "toggle-item": [item: AppSidebarNavItem]
}>()

const activeItemClass = "sidebar-nav-active-surface text-sidebar-accent-foreground"

function isActive(item: AppSidebarNavItem): boolean {
  if (!item.path) {
    return false
  }

  if (item.path === "/") {
    return props.activePath === item.path
  }

  return props.activePath === item.path || props.activePath.startsWith(`${item.path}/`)
}
</script>

<template>
  <nav class="min-w-0 overflow-x-visible">
    <div v-for="item in props.items" :key="item.label">
      <div
        v-if="item.kind === 'separator'"
        class="flex items-center gap-3 px-3 py-3"
      >
        <div class="h-px flex-1 bg-sidebar-border/80" />
        <span class="shrink-0 text-[11px] font-medium tracking-[0.12em] text-sidebar-foreground/55">
          {{ item.label }}
        </span>
        <div class="h-px flex-1 bg-sidebar-border/80" />
      </div>

      <component
        v-else
        :is="item.path && !item.children?.length ? 'RouterLink' : 'button'"
        :to="item.path"
        type="button"
        :class="[
          'group flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-180 ease-out outline-none focus:outline-none focus-visible:outline-none active:scale-[0.98] motion-reduce:active:scale-100',
          isActive(item)
            ? activeItemClass
            : 'sidebar-nav-hover-surface hover:text-sidebar-accent-foreground',
        ]"
        @click="emit('toggle-item', item)"
      >
        <i
          v-if="item.icon"
          :class="[item.icon, 'text-lg leading-none transition-colors', isActive(item) ? 'text-link' : '']"
        />
        <span class="flex-1 truncate">{{ item.label }}</span>
        <i
          v-if="item.children?.length"
          :class="[
            'ri-arrow-down-s-line text-base transition-transform',
            item.open ? 'rotate-0' : '-rotate-90',
          ]"
        />
      </component>

      <SidebarMenuSub
        v-if="item.children?.length && item.open"
        class="mx-0 mr-0 ml-5.25 gap-0 px-0 py-0 pl-5.25"
      >
        <SidebarMenuSubItem
          v-for="child in item.children"
          :key="`${item.label}-${child.label}`"
          class="group/sub-item relative"
        >
          <div
            class="pointer-events-none absolute inset-y-0 -left-8 right-0 rounded-lg bg-sidebar opacity-0 transition-opacity group-hover/sub-item:opacity-100 group-has-data-[active=true]/sub-item:opacity-100"
            :class="{ 'opacity-100': isActive(child) }"
          />
          <div
            class="pointer-events-none absolute inset-y-0 -left-8 right-0 rounded-lg opacity-0 transition-opacity group-has-data-[active=true]/sub-item:opacity-100"
            :class="isActive(child)
              ? 'sidebar-nav-active-surface opacity-100'
              : 'sidebar-nav-hover-fill group-hover/sub-item:opacity-100'"
          />
          <div
            class="hidden"
            :class="{ 'hidden': isActive(child) }"
          />
          <div
            class="pointer-events-none absolute -left-5.25 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-[opacity,background-color] group-hover/sub-item:opacity-100 group-has-data-[active=true]/sub-item:opacity-100"
            :class="isActive(child) ? 'bg-link' : 'bg-sidebar-foreground/40'"
          />
          <SidebarMenuSubButton
            as-child
            :is-active="isActive(child)"
            class="relative z-10 h-9 -ml-5.25 rounded-lg bg-transparent pl-5.25 pr-3 hover:bg-transparent focus-visible:ring-0 active:bg-transparent data-[active=true]:bg-transparent"
          >
            <component
              :is="child.path ? 'RouterLink' : 'button'"
              :to="child.path"
              type="button"
              class="w-full text-left"
            >
              <span>{{ child.label }}</span>
            </component>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    </div>
  </nav>
</template>
