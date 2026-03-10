<script setup lang="ts">
import type { DropdownMenuItemEmits, DropdownMenuItemProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { DropdownMenuItem, useForwardPropsEmits } from "reka-ui"

import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<DropdownMenuItemProps & {
  class?: HTMLAttributes["class"]
  inset?: boolean
}>()
const emits = defineEmits<DropdownMenuItemEmits>()

const delegatedProps = reactiveOmit(props, "class", "inset")
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DropdownMenuItem
    v-bind="{ ...forwarded, ...$attrs }"
    :class="
      cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        props.inset && 'pl-8',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
