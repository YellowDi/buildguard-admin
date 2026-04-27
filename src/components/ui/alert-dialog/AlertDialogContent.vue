<script setup lang="ts">
import type { AlertDialogContentEmits, AlertDialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { FLOATING_OVERLAY_STATE_ANIMATION_CLASS, FLOATING_OVERLAY_SURFACE_CLASS } from "@/components/ui/overlay"
import { preventDismissForMediaLightbox } from "@/lib/media-lightbox-dismiss"
import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<AlertDialogContentProps & {
  class?: HTMLAttributes["class"]
  /** 高于 TablePageTable 吸顶克隆表头 (z-[60])，用于设置浮窗等场景下的嵌套弹窗 */
  stackAboveStickyHeader?: boolean
}>(), {
  stackAboveStickyHeader: false,
})
const emits = defineEmits<AlertDialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class", "stackAboveStickyHeader")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay
      data-slot="alert-dialog-overlay"
      :class="
        cn(
          'fixed inset-0',
          FLOATING_OVERLAY_SURFACE_CLASS,
          FLOATING_OVERLAY_STATE_ANIMATION_CLASS,
          props.stackAboveStickyHeader ? 'z-70' : 'z-50',
        )
      "
    />
    <AlertDialogContent
      data-slot="alert-dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      @pointer-down-outside="preventDismissForMediaLightbox"
      @interact-outside="preventDismissForMediaLightbox"
      :class="
        cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl p-4 shadow-(--shadow-card) outline-none focus:outline-none focus-visible:outline-none duration-200 sm:max-w-lg',
          props.stackAboveStickyHeader ? 'z-70' : 'z-50',
          props.class,
        )
      "
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
