<script setup lang="ts">
import type { CheckboxRootEmits, CheckboxRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { CheckIcon, DividerHorizontalIcon } from "@radix-icons/vue"
import { reactiveOmit } from "@vueuse/core"
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from "reka-ui"

import { cn } from "@/lib/utils"

const props = defineProps<CheckboxRootProps & {
  class?: HTMLAttributes["class"]
}>()
const emits = defineEmits<CheckboxRootEmits>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <CheckboxRoot
    v-bind="{ ...forwarded, ...$attrs }"
    data-slot="checkbox"
    :class="
      cn(
        'peer group border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:data-[state=checked]:bg-primary dark:data-[state=checked]:text-primary-foreground dark:data-[state=indeterminate]:bg-primary dark:data-[state=indeterminate]:text-primary-foreground size-4 shrink-0 rounded-[4px] border shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  >
    <CheckboxIndicator class="flex items-center justify-center text-current transition-none">
      <slot>
        <CheckIcon class="size-3.5 group-data-[state=indeterminate]:hidden" />
        <DividerHorizontalIcon class="hidden size-3.5 group-data-[state=indeterminate]:block" />
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
