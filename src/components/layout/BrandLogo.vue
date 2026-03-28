<script setup lang="ts">
import { computed } from "vue"

import { useGlobalBranding } from "@/composables/useGlobalBranding"

const { siteName, logoSrc } = useGlobalBranding()

const props = withDefaults(defineProps<{
  /** 不传则使用全局站点名称；传空字符串则不显示文案 */
  label?: string
  alt?: string
  imageClass?: string
  textClass?: string
}>(), {
  label: undefined,
  alt: "Application logo",
  imageClass: "size-8",
  textClass: "truncate text-sm font-semibold",
})

const resolvedLabel = computed(() => {
  if (props.label === "") {
    return null
  }
  if (props.label !== undefined) {
    return props.label
  }
  return siteName.value
})
</script>

<template>
  <span class="flex min-w-0 items-center gap-3">
    <img
      :src="logoSrc"
      :alt="alt"
      :class="[imageClass, 'shrink-0 object-contain']"
    >
    <span v-if="resolvedLabel" :class="textClass">{{ resolvedLabel }}</span>
  </span>
</template>
