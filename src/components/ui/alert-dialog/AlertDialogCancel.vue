<script setup lang="ts">
import type { AlertDialogCancelProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AlertDialogCancel, useForwardProps } from "reka-ui"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<AlertDialogCancelProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AlertDialogCancel
    v-bind="{ ...forwarded, ...$attrs }"
    :class="cn(buttonVariants({ variant: 'outline' }), 'mt-0 sm:mt-0', props.class)"
  >
    <slot />
  </AlertDialogCancel>
</template>
