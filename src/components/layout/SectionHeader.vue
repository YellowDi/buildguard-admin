<script setup lang="ts">
import { computed, useSlots } from "vue"

import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  as?: string
  hasActions?: boolean
  singleLineTitleOnMobile?: boolean
  layoutClass?: string
  titleClass?: string
  titleTextClass?: string
  subtitleClass?: string
  actionsClass?: string
}>(), {
  subtitle: "",
  as: "h1",
  hasActions: undefined,
  singleLineTitleOnMobile: true,
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
    <div
      :class="cn(
        'flex min-w-0 gap-3',
        props.singleLineTitleOnMobile ? 'items-center sm:items-start' : 'items-start',
      )"
    >
      <div v-if="hasLeading" class="shrink-0">
        <slot name="leading" />
      </div>

      <div class="min-w-0">
        <component
          :is="props.as"
          :class="cn(
            'text-[22px] tracking-[-0.04em] text-foreground md:text-[28px]',
            props.singleLineTitleOnMobile
              ? 'flex min-w-0 flex-nowrap items-end gap-x-3 gap-y-2 sm:flex-wrap'
              : 'flex flex-wrap items-end gap-x-3 gap-y-2',
            props.titleClass,
          )"
        >
          <span
            :class="cn(
              'min-w-0 font-semibold leading-none',
              props.singleLineTitleOnMobile
                ? 'truncate sm:overflow-visible sm:whitespace-normal sm:text-clip'
                : '',
              props.titleTextClass,
            )"
          >
            {{ props.title }}
          </span>
          <span
            v-if="props.subtitle"
            :class="cn(
              'hidden text-[20px] font-normal leading-none text-muted-foreground sm:inline md:text-[22px]',
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
        'flex w-full items-center justify-start gap-1 md:w-auto md:justify-end',
        props.actionsClass,
      )"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
