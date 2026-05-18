<script setup lang="ts">
import type { HTMLAttributes } from "vue"

import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="input-otp-separator"
    role="separator"
    :class="cn('px-1 text-muted-foreground', props.class)"
  >
    <slot>
      <i class="ri-subtract-line text-base" />
    </slot>
  </div>
</template>
