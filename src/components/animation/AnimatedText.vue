<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue"
import { useRoute } from "vue-router"

import { cn } from "@/lib/utils"

type TextAnimationEffect = "soft-blur-in" | "spring-scale-in" | "focus-blur-resolve" | "fade-through"
type TextSegment = {
  value: string
  animated: boolean
}

const props = withDefaults(defineProps<{
  text: string | number
  effect?: TextAnimationEffect
  as?: string
  class?: HTMLAttributes["class"]
  triggerKey?: string | number
  delay?: number
  stagger?: number
}>(), {
  effect: "spring-scale-in",
  as: "span",
  class: "",
  triggerKey: undefined,
  delay: 0,
  stagger: undefined,
})

const route = useRoute()
const textValue = computed(() => String(props.text ?? ""))
const routeScopedKey = computed(() => `${route.path}:${textValue.value}`)
const animationKey = computed(() => String(props.triggerKey ?? routeScopedKey.value))
const isFocusEffect = computed(() => props.effect === "focus-blur-resolve")
const segments = computed(() => {
  if (props.effect === "soft-blur-in") {
    return splitCharacters(textValue.value)
  }

  if (props.effect === "spring-scale-in") {
    return splitWords(textValue.value)
  }

  return [{ value: textValue.value, animated: true }]
})
const animatedSegmentCount = computed(() => Math.max(1, segments.value.filter(segment => segment.animated).length))
const resolvedStagger = computed(() => {
  if (typeof props.stagger === "number") {
    return props.stagger
  }

  const defaultStagger = props.effect === "soft-blur-in" ? 25 : 95
  const maxTotalDelay = props.effect === "soft-blur-in" ? 700 : 760
  const count = animatedSegmentCount.value

  return count > 1 ? Math.min(defaultStagger, Math.floor(maxTotalDelay / (count - 1))) : 0
})
const rootClass = computed(() =>
  cn(
    "animate-text",
    isFocusEffect.value ? "animate-text--focus" : "animate-text--split",
    props.class,
  ),
)

function splitCharacters(value: string): TextSegment[] {
  return Array.from(value).map(character => ({
    value: normalizeWhitespace(character),
    animated: !isWhitespace(character),
  }))
}

function splitWords(value: string): TextSegment[] {
  const Segmenter = (globalThis.Intl as typeof Intl & {
    Segmenter?: new (locale?: string | string[], options?: { granularity: "word" }) => {
      segment(input: string): Iterable<{ segment: string }>
    }
  }).Segmenter

  if (!Segmenter) {
    return [{ value, animated: true }]
  }

  const parts = Array.from(new Segmenter("zh-CN", { granularity: "word" }).segment(value))
    .map(part => part.segment)
    .filter(Boolean)

  if (parts.length <= 1) {
    return [{ value, animated: true }]
  }

  return parts.map(part => ({
    value: normalizeWhitespace(part),
    animated: !isWhitespace(part),
  }))
}

function normalizeWhitespace(value: string) {
  return value === " " ? "\u00A0" : value
}

function isWhitespace(value: string) {
  return value.trim().length === 0
}

function segmentStyle(index: number) {
  return {
    "--animate-text-delay": `${props.delay + index * resolvedStagger.value}ms`,
  }
}
</script>

<template>
  <component
    v-if="isFocusEffect"
    :is="props.as"
    :class="rootClass"
    :aria-label="textValue"
  >
    <Transition
      name="animate-text-focus"
      appear
    >
      <span
        :key="animationKey"
        class="animate-text__focus-layer"
        aria-hidden="true"
      >
        {{ textValue }}
      </span>
    </Transition>
  </component>

  <component
    :is="props.as"
    v-else
    :key="animationKey"
    :class="rootClass"
    :aria-label="textValue"
  >
    <span aria-hidden="true">
      <span
        v-for="(segment, index) in segments"
        :key="`${index}-${segment.value}`"
        :class="[
          'animate-text__unit',
          segment.animated ? `animate-text__unit--${props.effect}` : 'animate-text__unit--static',
        ]"
        :style="segment.animated ? segmentStyle(index) : undefined"
      >
        {{ segment.value }}
      </span>
    </span>
  </component>
</template>
