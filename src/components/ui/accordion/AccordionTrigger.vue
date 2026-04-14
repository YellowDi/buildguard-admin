<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next"
import type { AccordionHeaderProps, AccordionTriggerProps } from "reka-ui"
import { AccordionHeader, AccordionTrigger } from "reka-ui"

import { cn } from "@/lib/utils"

const props = defineProps<AccordionTriggerProps & {
  headerProps?: AccordionHeaderProps
  class?: string
}>()
</script>

<template>
  <AccordionHeader v-bind="props.headerProps" class="flex">
    <AccordionTrigger
      v-bind="props"
      :class="cn('flex flex-1 items-center justify-between py-4 text-sm font-medium transition-[color,text-decoration-color] duration-180 ease-out hover:underline [&[data-state=open]>svg]:rotate-180', props.class)"
    >
      <slot />
      <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionTrigger>
  </AccordionHeader>
</template>
