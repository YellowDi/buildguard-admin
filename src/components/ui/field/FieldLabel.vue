<script setup lang="ts">
import type { LabelProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const props = defineProps<LabelProps & { class?: HTMLAttributes["class"] }>()
const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <Label
    data-slot="field-label"
    v-bind="delegatedProps"
    :class="cn('text-sm font-medium text-foreground', props.class)"
  >
    <slot />
  </Label>
</template>
