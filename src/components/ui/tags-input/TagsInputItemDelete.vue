<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { TagsInputItemDeleteProps } from "reka-ui"
import { reactiveOmit } from "@vueuse/core"
import { TagsInputItemDelete } from "reka-ui"

import { cn } from "@/lib/utils"

const props = defineProps<TagsInputItemDeleteProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <TagsInputItemDelete
    v-bind="{ ...delegatedProps, ...$attrs }"
    data-slot="tags-input-item-delete"
    :class="cn(
      'ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      props.class,
    )"
  >
    <slot>
      <i class="ri-close-line text-[13px] leading-none" />
    </slot>
  </TagsInputItemDelete>
</template>
