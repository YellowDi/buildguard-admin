<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  class?: HTMLAttributes["class"]
  orientation?: "horizontal" | "vertical"
}>(), {
  orientation: "horizontal",
})
</script>

<template>
  <div
    data-slot="button-group"
    role="group"
    :data-orientation="props.orientation"
    :class="cn(
      'inline-flex isolate w-fit rounded-md shadow-xs',
      'data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:[&>*:not(:first-child)]:-ml-px data-[orientation=horizontal]:[&>*:not(:first-child)]:rounded-l-none data-[orientation=horizontal]:[&>*:not(:last-child)]:rounded-r-none',
      'data-[orientation=vertical]:flex-col data-[orientation=vertical]:[&>*:not(:first-child)]:-mt-px data-[orientation=vertical]:[&>*:not(:first-child)]:rounded-t-none data-[orientation=vertical]:[&>*:not(:last-child)]:rounded-b-none',
      '[&>*]:relative [&>*]:shadow-none [&>*]:focus-visible:z-10',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
