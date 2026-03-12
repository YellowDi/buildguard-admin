<script setup lang="ts">
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
      <div class="space-y-1">
        <h3 class="text-[1.375rem] font-semibold tracking-tight">{{ title }}</h3>
        <p
          :class="tone === 'danger' ? 'text-sm leading-6 text-destructive/80' : 'text-sm leading-6 text-muted-foreground'"
        >
          {{ description }}
        </p>
      </div>
      <Separator class="bg-border/80" />
    </template>
    <slot />
  </section>
</template>
