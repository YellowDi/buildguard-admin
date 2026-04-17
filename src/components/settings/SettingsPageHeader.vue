<script setup lang="ts">
import TitleBlock from "@/components/layout/TitleBlock.vue"

const props = withDefaults(defineProps<{
  title: string
  description?: string | null
}>(), {
  description: null,
})
</script>

<template>
  <div class="sticky top-0 z-[6] shrink-0 bg-background px-3 pt-4 pb-3 sm:px-4">
    <div class="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <TitleBlock
        :title="props.title"
        :description="props.description ?? undefined"
      />

      <slot />
    </div>
  </div>
</template>
