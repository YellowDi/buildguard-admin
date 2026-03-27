<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import type { ButtonVariants } from "."
import { Primitive } from "reka-ui"
import { computed, useAttrs } from "vue"
import { cn } from "@/lib/utils"
import { buttonVariants } from "."

defineOptions({
  inheritAttrs: false,
})

interface Props extends PrimitiveProps {
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
  class?: HTMLAttributes["class"]
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
})

const attrs = useAttrs()

const resolvedType = computed(() => {
  if (props.asChild || props.as !== "button") {
    return undefined
  }

  return typeof attrs.type === "string" && attrs.type.trim()
    ? attrs.type
    : "button"
})
</script>

<template>
  <Primitive
    v-bind="attrs"
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :type="resolvedType"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
