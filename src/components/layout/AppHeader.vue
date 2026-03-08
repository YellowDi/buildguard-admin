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

  return metaItems
    .filter((item): item is { title: string; to?: string } => typeof item === "object" && item !== null && typeof item.title === "string")
    .map((item, index) => ({
      ...item,
      isCurrent: index === metaItems.length - 1,
    }))
})
</script>

<template>
  <header
    :class="
      cn(
        'relative z-30 flex h-16 shrink-0 items-center gap-2 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        props.class,
      )
    "
  >
    <button
      type="button"
      class="-ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
      aria-label="打开侧边栏"
      @click.stop="props.onToggleMobileSidebar?.()"
    >
      <ViewVerticalIcon class="h-4 w-4" />
    </button>
    <button
      type="button"
      class="-ml-1 hidden h-7 w-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:inline-flex"
      aria-label="切换侧边栏"
      @click.stop="props.onToggleDesktopSidebar?.()"
    >
      <ViewVerticalIcon class="h-4 w-4" />
    </button>
    <Separator orientation="vertical" class="mr-2 h-4" />
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>BuildGuard Admin</BreadcrumbItem>
        <template v-for="item in breadcrumbItems" :key="item.title">
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage v-if="item.isCurrent">{{ item.title }}</BreadcrumbPage>
            <BreadcrumbLink v-else-if="item.to" as-child>
              <RouterLink :to="{ name: item.to }">
                {{ item.title }}
              </RouterLink>
            </BreadcrumbLink>
            <BreadcrumbPage v-else>{{ item.title }}</BreadcrumbPage>
          </BreadcrumbItem>
        </template>
      </BreadcrumbList>
    </Breadcrumb>
  </header>
</template>
