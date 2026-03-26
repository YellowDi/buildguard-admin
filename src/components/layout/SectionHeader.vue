<script setup lang="ts">
import { computed, useSlots } from "vue"

import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  as?: string
  hasActions?: boolean
  layoutClass?: string
  titleClass?: string
  titleTextClass?: string
  subtitleClass?: string
  actionsClass?: string
}>(), {
  subtitle: "",
  as: "h1",
  hasActions: undefined,
  layoutClass: "",
  titleClass: "",
  titleTextClass: "",
  subtitleClass: "",
  actionsClass: "",
})

const slots = useSlots()
const hasLeading = computed(() => Boolean(slots.leading))
const hasActions = computed(() => props.hasActions ?? Boolean(slots.actions))
</script>

<template>
  <div
    :class="cn(
      'flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-5',
      props.layoutClass,
    )"
  >
    <div class="flex min-w-0 items-start gap-3">
      <div v-if="hasLeading" class="shrink-0">
        <slot name="leading" />
      </div>

      <div class="min-w-0">
        <component
          :is="props.as"
          :class="cn(
            'flex flex-wrap items-end gap-x-3 gap-y-2 text-[24px] tracking-[-0.04em] text-foreground md:text-[28px]',
            props.titleClass,
          )"
        >
          <span :class="cn('font-semibold leading-none', props.titleTextClass)">
            {{ props.title }}
          </span>
          <span
            v-if="props.subtitle"
            :class="cn(
              'text-[20px] font-normal leading-none text-muted-foreground md:text-[22px]',
              props.subtitleClass,
            )"
          >
            {{ props.subtitle }}
          </span>
        </component>
      </div>
    </div>

    <div
      v-if="hasActions"
      :class="cn(
        'flex w-full items-center justify-start md:w-auto md:justify-end',
        props.actionsClass,
      )"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
