<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { Cross2Icon } from '@radix-icons/vue'
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"
import DialogOverlay from "./DialogOverlay.vue"
import { preventDismissForMediaLightbox } from "@/lib/media-lightbox-dismiss"

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DialogContentProps & {
  class?: HTMLAttributes["class"]
  showCloseButton?: boolean
  /** 高于 TablePageTable 吸顶克隆表头 (z-[60])，用于设置浮窗等场景下的嵌套弹窗 */
  stackAboveStickyHeader?: boolean
}>(), {
  showCloseButton: true,
  stackAboveStickyHeader: false,
})
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class", "stackAboveStickyHeader")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay :class="props.stackAboveStickyHeader ? 'z-70' : undefined" />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      @pointer-down-outside="preventDismissForMediaLightbox"
      @interact-outside="preventDismissForMediaLightbox"
      :class="
        cn(
          'dialog-panel-float fixed top-[50%] left-[50%] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl bg-background p-4 shadow-(--shadow-card) outline-none focus:outline-none focus-visible:outline-none sm:max-w-lg',
          props.stackAboveStickyHeader ? 'z-70' : 'z-50',
          props.class,
        )"
    >
      <slot />

      <DialogClose
        v-if="showCloseButton"
        data-slot="dialog-close"
        aria-label="关闭弹窗"
        title="关闭弹窗"
        type="button"
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        <Cross2Icon />
        <span class="sr-only">关闭弹窗</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
