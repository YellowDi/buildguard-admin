<script setup lang="ts">
import type { AlertDialogOverlayProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AlertDialogOverlay, useForwardProps } from "reka-ui"

import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<AlertDialogOverlayProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AlertDialogOverlay
    v-bind="{ ...forwarded, ...$attrs }"
    :class="cn('fixed inset-0 z-50 bg-background/80 backdrop-blur-[3px] supports-backdrop-filter:bg-background/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', props.class)"
  />
</template>
