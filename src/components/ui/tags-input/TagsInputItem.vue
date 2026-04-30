<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { TagsInputItemProps } from "reka-ui"
import { reactiveOmit } from "@vueuse/core"
import { TagsInputItem } from "reka-ui"

import { cn } from "@/lib/utils"

const props = defineProps<TagsInputItemProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <TagsInputItem
    v-bind="{ ...delegatedProps, ...$attrs }"
    data-slot="tags-input-item"
    :class="cn(
      'inline-flex h-7 max-w-full items-center gap-1 rounded-md border border-transparent bg-muted px-2 text-sm font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-180 ease-out data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:ring-2 data-[state=active]:ring-ring/35 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      props.class,
    )"
  >
    <slot />
  </TagsInputItem>
</template>
