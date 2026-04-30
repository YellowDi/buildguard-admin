<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { TagsInputItemTextProps } from "reka-ui"
import { reactiveOmit } from "@vueuse/core"
import { TagsInputItemText } from "reka-ui"

import { cn } from "@/lib/utils"

const props = defineProps<TagsInputItemTextProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <TagsInputItemText
    v-bind="{ ...delegatedProps, ...$attrs }"
    data-slot="tags-input-item-text"
    :class="cn('min-w-0 truncate', props.class)"
  >
    <slot />
  </TagsInputItemText>
</template>
