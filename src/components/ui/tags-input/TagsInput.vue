<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { TagsInputRootEmits, TagsInputRootProps } from "reka-ui"
import { reactiveOmit } from "@vueuse/core"
import { TagsInputRoot, useForwardPropsEmits } from "reka-ui"

import { cn } from "@/lib/utils"

const props = defineProps<TagsInputRootProps & {
  class?: HTMLAttributes["class"]
}>()
const emits = defineEmits<TagsInputRootEmits>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <TagsInputRoot
    v-bind="{ ...forwarded, ...$attrs }"
    data-slot="tags-input"
    :class="cn(
      'border-input dark:bg-input/30 flex min-h-9 w-full min-w-0 flex-wrap items-center gap-1.5 rounded-md border bg-background/92 px-2 py-1 shadow-xs transition-[border-color,background-color,color,box-shadow] duration-180 ease-out outline-none data-[focused]:border-ring data-[focused]:ring-ring/50 data-[focused]:ring-[3px] data-[invalid]:border-destructive data-[invalid]:ring-destructive/20 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
      props.class,
    )"
  >
    <slot />
  </TagsInputRoot>
</template>
