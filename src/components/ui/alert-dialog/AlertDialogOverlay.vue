<script setup lang="ts">
import type { AlertDialogOverlayProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AlertDialogOverlay, useForwardProps } from "reka-ui"

import { FLOATING_OVERLAY_STATE_ANIMATION_CLASS, FLOATING_OVERLAY_SURFACE_CLASS } from "@/components/ui/overlay"
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
    :class="cn('fixed inset-0 z-50', FLOATING_OVERLAY_SURFACE_CLASS, FLOATING_OVERLAY_STATE_ANIMATION_CLASS, props.class)"
  />
</template>
