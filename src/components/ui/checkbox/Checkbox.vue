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
        'peer group border-input bg-transparent dark:border-muted-foreground/50 dark:bg-foreground/[0.06] data-[state=checked]:border-[#2B67F6] data-[state=checked]:bg-[#2B67F6] data-[state=checked]:text-white data-[state=indeterminate]:border-[#2B67F6] data-[state=indeterminate]:bg-[#2B67F6] data-[state=indeterminate]:text-white size-4 shrink-0 rounded-[4px] border shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#2B67F6] focus-visible:ring-[#2B67F6]/20 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50',
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
