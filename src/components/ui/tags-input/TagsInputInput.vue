<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { TagsInputInputProps } from "reka-ui"
import { reactiveOmit } from "@vueuse/core"
import { TagsInputInput } from "reka-ui"

import { cn } from "@/lib/utils"

const props = defineProps<TagsInputInputProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <TagsInputInput
    v-bind="{ ...delegatedProps, ...$attrs }"
    data-slot="tags-input-input"
    :class="cn(
      'placeholder:text-muted-foreground min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none disabled:cursor-not-allowed',
      props.class,
    )"
  />
</template>
