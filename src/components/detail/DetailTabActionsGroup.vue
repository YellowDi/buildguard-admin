<script setup lang="ts">
import { computed, useSlots } from "vue"

import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  class?: string
  leadingClass?: string
  trailingClass?: string
}>(), {
  class: "",
  leadingClass: "",
  trailingClass: "",
})

const slots = useSlots()
const hasLeading = computed(() => Boolean(slots.leading))
const hasTrailing = computed(() => Boolean(slots.trailing))
</script>

<template>
  <div
    v-if="hasLeading || hasTrailing"
    :class="cn('flex min-w-0 flex-wrap items-center justify-end gap-2', props.class)"
  >
    <div
      v-if="hasLeading"
      :class="cn('flex min-w-0 flex-wrap items-center justify-end gap-2', props.leadingClass)"
    >
      <slot name="leading" />
    </div>

    <div
      v-if="hasTrailing"
      :class="cn('flex min-w-0 flex-wrap items-center justify-end gap-2', props.trailingClass)"
    >
      <slot name="trailing" />
    </div>
  </div>
</template>
