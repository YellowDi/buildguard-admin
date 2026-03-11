<script setup lang="ts">
import logo from "@/assets/logo.svg"

withDefaults(defineProps<{
  label?: string
  alt?: string
  imageClass?: string
  textClass?: string
}>(), {
  label: "Workspace",
  alt: "Application logo",
  imageClass: "size-8",
  textClass: "truncate text-sm font-semibold",
})
</script>

<template>
  <span class="flex min-w-0 items-center gap-3">
    <img
      :src="logo"
      :alt="alt"
      :class="[imageClass, 'shrink-0 object-contain']"
    >
    <span v-if="label" :class="textClass">{{ label }}</span>
  </span>
</template>
