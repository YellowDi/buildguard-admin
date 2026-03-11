<script setup lang="ts">
import type { TabsContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TabsContent, useForwardProps } from "reka-ui"

import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<TabsContentProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <TabsContent
    v-bind="{ ...forwarded, ...$attrs }"
    data-slot="tabs-content"
    :class="
      cn(
        'ring-offset-background focus-visible:ring-ring/50 mt-2 outline-none focus-visible:ring-[3px]',
        props.class,
      )
    "
  >
    <slot />
  </TabsContent>
</template>
