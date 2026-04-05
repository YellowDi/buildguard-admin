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
  <section>
    <template v-if="showHeader !== false">
      <SettingsPageHeader
        variant="section"
        :title="title"
        :description="description"
        :tone="tone"
      />
      <Separator class="mt-2 bg-border/80" />
      <div class="mt-4">
        <slot />
      </div>
    </template>
    <template v-else>
      <slot />
    </template>
  </section>
</template>
