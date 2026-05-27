<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'
import { TooltipWrap } from "@/components/ui/tooltip"
import { useSidebar } from "./utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const { toggleSidebar } = useSidebar()
</script>

<template>
  <TooltipWrap content="切换侧边栏">
    <Button
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      aria-label="切换侧边栏"
      :class="cn('size-7', props.class)"
      @click="toggleSidebar"
    >
      <i class="ri-layout-column-fill text-lg leading-none text-muted-foreground" />
      <span class="sr-only">切换侧边栏</span>
    </Button>
  </TooltipWrap>
</template>
