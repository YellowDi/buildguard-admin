<script setup lang="ts">
import { computed } from "vue"

import { toRemixFillIcon } from "@/lib/remix-icon"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  icon: string
  active: boolean
}>()

const fillIcon = computed(() => toRemixFillIcon(props.icon))

const shownIconClass = "opacity-100 scale-100 blur-0"
const hiddenIconClass = "opacity-0 scale-[0.86] blur-[2px]"
const iconLayerClass = "transition-[opacity,scale,filter] duration-180 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none motion-reduce:scale-100 motion-reduce:blur-0"
</script>

<template>
  <span
    v-bind="$attrs"
    class="relative inline-flex shrink-0 items-center justify-center"
    aria-hidden="true"
  >
    <i
      :class="[
        props.icon,
        iconLayerClass,
        props.active ? hiddenIconClass : shownIconClass,
      ]"
    />
    <i
      :class="[
        fillIcon,
        iconLayerClass,
        'absolute inset-0 flex items-center justify-center',
        props.active ? shownIconClass : hiddenIconClass,
      ]"
    />
  </span>
</template>
