<script setup lang="ts">
import { cn } from "@/lib/utils"

defineProps<{
  class?: string
}>()
</script>

<template>
  <div
    :class="
      cn(
        'rounded-xl border border-border/70 bg-card text-card-foreground shadow-panel',
        $props.class,
      )
    "
  >
    <slot />
  </div>
</template>
