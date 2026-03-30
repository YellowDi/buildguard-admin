<script setup lang="ts">
import type { SidebarProps } from "."
import { cn } from "@/lib/utils"
import { SIDEBAR_WIDTH_MOBILE, useSidebar } from "./utils"

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<SidebarProps>(), {
  side: "left",
  variant: "sidebar",
  collapsible: "offcanvas",
})

const { state, openMobile } = useSidebar()
</script>

<template>
  <div
    v-if="collapsible === 'none'"
    :class="cn('flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground', props.class)"
    v-bind="$attrs"
  >
    <slot />
  </div>

  <div
    v-else
    :data-state="openMobile ? 'expanded' : 'collapsed'"
    :data-mobile-open="openMobile ? 'true' : 'false'"
    :data-side="side"
    :class="cn('fixed inset-y-0 left-0 z-30 flex min-[1000px]:hidden', props.class)"
    :style="{
      '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
    }"
    v-bind="$attrs"
  >
    <div
      data-sidebar="sidebar"
      data-mobile="true"
      :class="cn(
        'flex h-full w-[var(--sidebar-width)] max-w-[90vw] flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-sidebar p-0 text-sidebar-foreground shadow-[0_18px_48px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out',
        side === 'left'
          ? (openMobile ? 'translate-x-0' : '-translate-x-full')
          : (openMobile ? 'translate-x-0' : 'translate-x-full'),
      )"
    >
      <slot />
    </div>
  </div>

  <div
    v-if="collapsible !== 'none'"
    class="group peer hidden min-[1000px]:block"
    :data-state="state"
    :data-collapsible="state === 'collapsed' ? collapsible : ''"
    :data-variant="variant"
    :data-side="side"
  >
    <!-- This is what handles the sidebar gap on desktop  -->
    <div
      :class="cn(
        'duration-200 relative h-svh w-[var(--sidebar-width)] bg-transparent transition-[width] ease-linear',
        'group-data-[collapsible=offcanvas]:w-0',
        'group-data-[side=right]:rotate-180',
        variant === 'floating' || variant === 'inset'
          ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]'
          : 'group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]',
      )"
    />
    <div
      :class="cn(
        'duration-200 fixed inset-y-0 z-10 hidden h-svh w-[var(--sidebar-width)] transition-[left,right,width] ease-linear min-[1000px]:flex',
        side === 'left'
          ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
          : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
        // Adjust the padding for floating and inset variants.
        variant === 'floating' || variant === 'inset'
          ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+_2px)]'
          : 'group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l',
        props.class,
      )"
      v-bind="$attrs"
    >
      <div
        data-sidebar="sidebar"
        class="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
