<script setup lang="ts">
import type { AccordionItemProps } from "reka-ui"
import { AccordionItem } from "reka-ui"

import { cn } from "@/lib/utils"

const props = defineProps<AccordionItemProps & {
  class?: string
}>()
</script>

<template>
  <AccordionItem
    v-bind="props"
    :class="cn('border-b', props.class)"
  >
    <slot />
  </AccordionItem>
</template>
