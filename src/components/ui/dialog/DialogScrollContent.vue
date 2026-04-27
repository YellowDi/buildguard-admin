<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { Cross2Icon } from '@radix-icons/vue'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { TooltipWrap } from "@/components/ui/tooltip"
import { FLOATING_OVERLAY_STATE_ANIMATION_CLASS, FLOATING_OVERLAY_SURFACE_CLASS } from "@/components/ui/overlay"
import { preventDismissForMediaLightbox } from "@/lib/media-lightbox-dismiss"
import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<DialogContentProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      :class="cn(
        'fixed inset-0 z-50 grid place-items-center overflow-y-auto',
        FLOATING_OVERLAY_SURFACE_CLASS,
        FLOATING_OVERLAY_STATE_ANIMATION_CLASS,
      )"
    >
      <DialogContent
        :class="
          cn(
            'dialog-panel-float relative z-50 grid w-full max-w-lg my-8 gap-4 bg-background p-4 shadow-(--shadow-card) sm:rounded-2xl md:w-full',
            props.class,
          )
        "
        v-bind="{ ...$attrs, ...forwarded }"
        @pointer-down-outside="(event) => {
          preventDismissForMediaLightbox(event);
          if (event.defaultPrevented) {
            return;
          }
          const originalEvent = event.detail.originalEvent;
          const target = originalEvent.target as HTMLElement;
          if (originalEvent.offsetX > target.clientWidth || originalEvent.offsetY > target.clientHeight) {
            event.preventDefault();
          }
        }"
        @interact-outside="preventDismissForMediaLightbox"
      >
        <slot />

        <TooltipWrap content="关闭弹窗">
          <DialogClose
            aria-label="关闭弹窗"
            type="button"
            class="absolute top-4 right-4 rounded-md p-0.5 transition-colors hover:bg-secondary"
          >
            <Cross2Icon class="w-4 h-4" />
            <span class="sr-only">关闭弹窗</span>
          </DialogClose>
        </TooltipWrap>
      </DialogContent>
    </DialogOverlay>
  </DialogPortal>
</template>
