<script setup lang="ts">
import type { DialogRootEmits, DialogRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { useForwardPropsEmits } from "reka-ui"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Command from "./Command.vue"

const props = withDefaults(defineProps<DialogRootProps & {
  title?: string
  description?: string
  contentClass?: HTMLAttributes["class"]
  preventCloseAutoFocus?: boolean
}>(), {
  title: "Command Palette",
  description: "Search for a command to run...",
  preventCloseAutoFocus: false,
})
const emits = defineEmits<DialogRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)

function handleCloseAutoFocus(event: Event) {
  if (!props.preventCloseAutoFocus) {
    return
  }

  event.preventDefault()
}
</script>

<template>
  <Dialog v-slot="slotProps" v-bind="forwarded">
    <DialogContent :class="cn('overflow-hidden p-0', props.contentClass)" @close-auto-focus="handleCloseAutoFocus">
      <DialogHeader class="sr-only">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <Command>
        <slot v-bind="slotProps" />
      </Command>
    </DialogContent>
  </Dialog>
</template>
