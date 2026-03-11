<script setup lang="ts">
import type { AvatarFallbackProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AvatarFallback, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<AvatarFallbackProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AvatarFallback
    v-bind="{ ...forwarded, ...$attrs }"
    data-slot="avatar-fallback"
    :class="
      cn(
        'flex size-full items-center justify-center rounded-full bg-muted',
        props.class,
      )
    "
  >
    <slot />
  </AvatarFallback>
</template>
