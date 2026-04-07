<script setup lang="ts">
import ModuleTitle from "@/components/layout/ModuleTitle.vue"

defineProps<{
  title: string
  description: string
  tone?: "default" | "danger"
  showHeader?: boolean
}>()
</script>

<template>
  <section>
    <template v-if="showHeader !== false">
      <ModuleTitle
        variant="section"
        :title="title"
        :description="description"
        :tone="tone"
        :show-separator="true"
        :sticky="true"
      />
      <div class="mt-4">
        <slot />
      </div>
    </template>
    <template v-else>
      <slot />
    </template>
  </section>
</template>
