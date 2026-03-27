<script setup lang="ts">
import SettingsPageHeader from "@/components/settings/SettingsPageHeader.vue"
import { Separator } from "@/components/ui/separator"

defineProps<{
  title: string
  description: string
  tone?: "default" | "danger"
  showHeader?: boolean
}>()
</script>

<template>
  <section :class="showHeader === false ? '' : 'space-y-4'">
    <template v-if="showHeader !== false">
      <SettingsPageHeader
        variant="section"
        :title="title"
        :description="description"
        :tone="tone"
      />
      <Separator class="bg-border/80" />
    </template>
    <slot />
  </section>
</template>
