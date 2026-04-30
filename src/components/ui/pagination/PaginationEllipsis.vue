<script setup lang="ts">
import type { PaginationEllipsisProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { PaginationEllipsis } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<PaginationEllipsisProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <PaginationEllipsis
    data-slot="pagination-ellipsis"
    v-bind="delegatedProps"
    :class="cn('flex size-8 items-center justify-center', props.class)"
  >
    <slot>
      <i class="ri-more-line text-base leading-none" />
      <span class="sr-only">更多页</span>
    </slot>
  </PaginationEllipsis>
</template>
