<script setup lang="ts">
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { computed } from "vue"
import type { HTMLAttributes } from "vue"
import { ViewVerticalIcon } from "@radix-icons/vue"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { RouterLink, useRoute } from "vue-router"

import { detailBreadcrumbTitle } from "@/composables/useDetailBreadcrumbTitle"

type BreadcrumbItemConfig = {
  title: string
  to?: string
  isCurrent: boolean
}

const props = defineProps<{
  onToggleMobileSidebar?: () => void
  onToggleDesktopSidebar?: () => void
  class?: HTMLAttributes["class"]
}>()

const route = useRoute()

const breadcrumbItems = computed<BreadcrumbItemConfig[]>(() => {
  const metaItems = Array.isArray(route.meta.breadcrumb)
    ? route.meta.breadcrumb
    : typeof route.meta.title === "string"
      ? [{ title: route.meta.title }]
      : []

  const list = metaItems
    .filter((item): item is { title: string; to?: string } => typeof item === "object" && item !== null && typeof item.title === "string")
    .map((item, index) => ({
      ...item,
      title: index === metaItems.length - 1 && route.name === "company-detail" && detailBreadcrumbTitle.value
        ? detailBreadcrumbTitle.value
        : item.title,
      isCurrent: index === metaItems.length - 1,
    }))

  return list
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
    <button
      type="button"
      class="-ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
      aria-label="打开侧边栏"
      @click.stop="props.onToggleMobileSidebar?.()"
    >
      <ViewVerticalIcon class="h-4 w-4" />
    </button>
    <button
      type="button"
      class="-ml-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:inline-flex"
      aria-label="切换侧边栏"
      @click.stop="props.onToggleDesktopSidebar?.()"
    >
      <ViewVerticalIcon class="h-4 w-4" />
    </button>
    <Separator orientation="vertical" class="mr-2 h-4 shrink-0" />
    <Breadcrumb class="min-w-0 flex-1 overflow-hidden">
      <BreadcrumbList class="flex-nowrap overflow-hidden whitespace-nowrap">
        <BreadcrumbItem class="min-w-0 shrink overflow-hidden">
          <span class="block truncate">BuildGuard Admin</span>
        </BreadcrumbItem>
        <template v-for="item in breadcrumbItems" :key="item.title">
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
              <RouterLink :to="{ name: item.to }">
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
