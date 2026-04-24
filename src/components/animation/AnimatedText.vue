<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue"
import { useRoute } from "vue-router"

import { cn } from "@/lib/utils"

type TextAnimationEffect = "fade-through"

const props = withDefaults(defineProps<{
  text: string | number
  effect?: TextAnimationEffect
  as?: string
  class?: HTMLAttributes["class"]
  triggerKey?: string | number
  delay?: number
}>(), {
  effect: "fade-through",
  as: "span",
  class: "",
  triggerKey: undefined,
  delay: 0,
})

const route = useRoute()
const textValue = computed(() => String(props.text ?? ""))
const routeScopedKey = computed(() => `${route.path}:${textValue.value}`)
const animationKey = computed(() => String(props.triggerKey ?? routeScopedKey.value))
const rootClass = computed(() =>
  cn(
    "animate-text",
    props.class,
  ),
)

function unitStyle() {
  return {
    "--animate-text-delay": `${props.delay}ms`,
  }
}
</script>

<template>
  <component
    :is="props.as"
    :key="animationKey"
    :class="rootClass"
    :aria-label="textValue"
  >
    <span
      class="animate-text__unit animate-text__unit--fade-through"
      :style="unitStyle()"
      aria-hidden="true"
    >
      {{ textValue }}
    </span>
  </component>
</template>
