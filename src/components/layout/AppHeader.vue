<script setup lang="ts">
import { computed } from "vue"
import type { HTMLAttributes } from "vue"
import { ViewVerticalIcon } from "@radix-icons/vue"
import { useWindowSize } from "@vueuse/core"

import BrandLogo from "@/components/layout/BrandLogo.vue"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TooltipWrap } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { SIDEBAR_MOBILE_BREAKPOINT } from "@/components/ui/sidebar"
import { RouterLink, useRoute } from "vue-router"
import type { RouteLocationRaw } from "vue-router"

import { detailBreadcrumbItems, detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"

type BreadcrumbItemConfig = {
  title: string
  to?: string | RouteLocationRaw
  isCurrent: boolean
}

const props = defineProps<{
  onToggleMobileSidebar?: () => void
  onToggleDesktopSidebar?: () => void
  class?: HTMLAttributes["class"]
}>()

const route = useRoute()
const { width } = useWindowSize()
const isMobile = computed(() => width.value < SIDEBAR_MOBILE_BREAKPOINT)

const breadcrumbItems = computed<BreadcrumbItemConfig[]>(() => {
  const overriddenItems = Array.isArray(detailBreadcrumbItems.value)
    ? detailBreadcrumbItems.value
    : null
  const metaItems = overriddenItems ?? (
    Array.isArray(route.meta.breadcrumb)
    ? route.meta.breadcrumb
    : typeof route.meta.title === "string"
      ? [{ title: route.meta.title }]
      : []
  )
  const overrideTitle = route.meta.useDetailBreadcrumbTitle && detailBreadcrumbTitle.value
    ? detailBreadcrumbTitle.value
    : null

  const list = metaItems
    .filter((item): item is { title: string; to?: string | RouteLocationRaw } => typeof item === "object" && item !== null && typeof item.title === "string")
    .map((item, index) => ({
      ...item,
      title: index === metaItems.length - 1 && overrideTitle
        ? overrideTitle
        : item.title,
      isCurrent: index === metaItems.length - 1,
    }))

  return list
})

function resolveBreadcrumbTo(to: string | RouteLocationRaw) {
  return typeof to === "string" ? { name: to } : to
}

const visibleLeadingItems = computed(() => {
  const items = breadcrumbItems.value

  if (isMobile.value) {
    return items.length <= 1 ? items : []
  }

  return items.length <= 4 ? items.slice(0, -1) : items.slice(0, 1)
})

const collapsedItems = computed(() => {
  const items = breadcrumbItems.value

  if (isMobile.value) {
    return items.length <= 1 ? [] : items.slice(0, -1)
  }

  return items.length <= 4 ? [] : items.slice(1, -1)
})

const visibleTrailingItems = computed(() => {
  const items = breadcrumbItems.value

  if (isMobile.value) {
    return items.length <= 1 ? [] : items.slice(-1)
  }

  return items.length <= 1 ? [] : items.slice(-1)
})
</script>

<template>
  <header
    :class="
      cn(
        'relative z-30 flex h-16 shrink-0 items-center gap-2 overflow-hidden bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80',
        props.class,
      )
    "
  >
    <TooltipWrap content="打开侧边栏">
      <button
        type="button"
        class="-ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground min-[1000px]:hidden"
        aria-label="打开侧边栏"
        @click.stop="props.onToggleMobileSidebar?.()"
      >
        <ViewVerticalIcon class="h-4 w-4" />
      </button>
    </TooltipWrap>
    <TooltipWrap content="切换侧边栏">
      <button
        type="button"
        class="-ml-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground min-[1000px]:inline-flex"
        aria-label="切换侧边栏"
        @click.stop="props.onToggleDesktopSidebar?.()"
      >
        <ViewVerticalIcon class="h-4 w-4" />
      </button>
    </TooltipWrap>
    <Separator orientation="vertical" class="mr-2 !h-4 self-center shrink-0" />
    <Breadcrumb class="min-w-0 flex-1 overflow-hidden">
      <BreadcrumbList class="flex-nowrap overflow-hidden whitespace-nowrap">
        <BreadcrumbItem class="shrink-0">
          <TooltipWrap content="返回首页">
            <BreadcrumbLink as-child>
              <RouterLink
                to="/"
                class="inline-flex rounded-md p-1 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="返回首页"
              >
                <BrandLogo label="" image-class="size-6" />
              </RouterLink>
            </BreadcrumbLink>
          </TooltipWrap>
        </BreadcrumbItem>

        <template v-for="item in visibleLeadingItems" :key="`leading-${item.title}-${item.to ?? 'current'}`">
          <BreadcrumbSeparator class="shrink-0" />
          <BreadcrumbItem
            :class="
              item.isCurrent
                ? 'min-w-0 flex-[1_1_auto] overflow-hidden'
                : 'min-w-0 shrink overflow-hidden'
            "
          >
            <BreadcrumbPage v-if="item.isCurrent" class="block truncate">{{ item.title }}</BreadcrumbPage>
            <BreadcrumbLink v-else-if="item.to" as-child class="block truncate">
              <RouterLink :to="resolveBreadcrumbTo(item.to)">
                {{ item.title }}
              </RouterLink>
            </BreadcrumbLink>
            <BreadcrumbPage v-else class="block truncate">{{ item.title }}</BreadcrumbPage>
          </BreadcrumbItem>
        </template>

        <BreadcrumbSeparator v-if="collapsedItems.length" class="shrink-0" />
        <BreadcrumbItem v-if="collapsedItems.length" class="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <TooltipWrap content="展开面包屑">
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  aria-label="展开面包屑"
                >
                  <BreadcrumbEllipsis class="h-8 w-8" />
                </button>
              </TooltipWrap>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-52 p-1.5">
              <nav class="flex flex-col">
                <template v-for="item in collapsedItems" :key="`collapsed-${item.title}-${item.to ?? 'current'}`">
                  <DropdownMenuItem
                    v-if="item.to"
                    as-child
                  >
                    <RouterLink
                      :to="resolveBreadcrumbTo(item.to)"
                      class="w-full"
                    >
                      {{ item.title }}
                    </RouterLink>
                  </DropdownMenuItem>
                  <span
                    v-else
                    class="rounded-md px-2 py-1.5 text-sm text-muted-foreground"
                  >
                    {{ item.title }}
                  </span>
                </template>
              </nav>
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>

        <template v-for="item in visibleTrailingItems" :key="`trailing-${item.title}-${item.to ?? 'current'}`">
          <BreadcrumbSeparator class="shrink-0" />
          <BreadcrumbItem
            :class="
              item.isCurrent
                ? 'min-w-0 flex-[1_1_auto] overflow-hidden'
                : 'min-w-0 shrink overflow-hidden'
            "
          >
            <BreadcrumbPage v-if="item.isCurrent" class="block truncate">{{ item.title }}</BreadcrumbPage>
            <BreadcrumbLink v-else-if="item.to" as-child class="block truncate">
              <RouterLink :to="resolveBreadcrumbTo(item.to)">
                {{ item.title }}
              </RouterLink>
            </BreadcrumbLink>
            <BreadcrumbPage v-else class="block truncate">{{ item.title }}</BreadcrumbPage>
          </BreadcrumbItem>
        </template>
      </BreadcrumbList>
    </Breadcrumb>
  </header>
</template>
