<script setup lang="ts">
import type { TabsTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TabsTrigger, useForwardProps } from "reka-ui"

import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<TabsTriggerProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <TabsTrigger
    v-bind="{ ...forwarded, ...$attrs }"
    data-slot="tabs-trigger"
    :class="
      cn(
        'relative z-10 inline-flex h-7 items-center justify-center gap-1.5 rounded-full border border-transparent px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors duration-180 ease-out focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=inactive]:hover:text-foreground',
        props.class,
      )
    "
  >
    <slot />
  </TabsTrigger>
</template>
