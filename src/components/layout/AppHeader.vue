<script setup lang="ts">
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import type { HTMLAttributes } from "vue"
import { ViewVerticalIcon } from "@radix-icons/vue"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { useRoute } from "vue-router"

const props = defineProps<{
  onToggleMobileSidebar?: () => void
  onToggleDesktopSidebar?: () => void
  class?: HTMLAttributes["class"]
}>()

const route = useRoute()
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
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{{ route.meta.title }}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  </header>
</template>
