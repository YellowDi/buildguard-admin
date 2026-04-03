<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { ViewVerticalIcon } from '@radix-icons/vue'
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
      :class="cn('h-7 w-7', props.class)"
      @click="toggleSidebar"
    >
      <ViewVerticalIcon />
      <span class="sr-only">切换侧边栏</span>
    </Button>
  </TooltipWrap>
</template>
