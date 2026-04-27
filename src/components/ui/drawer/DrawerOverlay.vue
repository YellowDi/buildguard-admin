<script lang="ts" setup>
import type { DialogOverlayProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { DrawerOverlay } from "vaul-vue"
import { FLOATING_OVERLAY_STATE_ANIMATION_CLASS, FLOATING_OVERLAY_SURFACE_CLASS } from "@/components/ui/overlay"
import { cn } from "@/lib/utils"

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <DrawerOverlay
    data-slot="drawer-overlay"
    v-bind="delegatedProps"
    :class="cn(
      'fixed inset-0 z-50',
      FLOATING_OVERLAY_SURFACE_CLASS,
      FLOATING_OVERLAY_STATE_ANIMATION_CLASS,
      props.class,
    )"
  />
</template>
