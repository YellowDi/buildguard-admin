<script setup lang="ts">
import { computed } from "vue"

import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import { Skeleton } from "@/components/ui/skeleton"

type CustomerDetailLoadingVariant =
  | "basic-info-primary"
  | "basic-info-secondary"
  | "building-assets"
  | "work-orders"
  | "monitoring"
  | "sub-accounts"

const props = defineProps<{
  variant: CustomerDetailLoadingVariant
}>()

const tableConfig = computed(() => {
  switch (props.variant) {
    case "building-assets":
      return {
        columnsTemplate: "3rem minmax(14rem,1.3fr) minmax(12rem,1.05fr) minmax(16rem,1.6fr) minmax(10rem,0.9fr) minmax(10rem,0.9fr) minmax(8rem,0.75fr) minmax(10rem,0.9fr)",
        columnCount: 8,
      }
    case "work-orders":
      return {
        columnsTemplate: "3rem minmax(12rem,1.1fr) minmax(12rem,1fr) minmax(11rem,1fr) minmax(10rem,0.9fr) minmax(8rem,0.8fr) minmax(7rem,0.7fr) minmax(7rem,0.7fr) minmax(7rem,0.7fr) minmax(10rem,0.85fr) minmax(14rem,1.2fr)",
        columnCount: 11,
      }
    case "monitoring":
      return {
        columnsTemplate: "3rem minmax(12rem,1.15fr) minmax(8rem,0.75fr) minmax(11rem,1fr) minmax(12rem,1fr) minmax(10rem,0.9fr) minmax(10rem,0.9fr)",
        columnCount: 7,
      }
    default:
      return null
  }
})
</script>

<template>
  <div v-if="props.variant === 'basic-info-primary'" class="space-y-5 pb-5">
    <section class="border-b border-border/60 pb-5">
      <div class="px-1 sm:px-3">
        <Skeleton class="h-5 w-20" />
      </div>
      <div class="mt-4 space-y-3 px-1 sm:px-3">
        <div class="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-4 w-56 max-w-full" />
        </div>
        <div class="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
          <Skeleton class="h-4 w-16" />
          <Skeleton class="h-4 w-36 max-w-full" />
        </div>
        <div class="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
          <Skeleton class="mt-2 h-4 w-24" />
          <Skeleton class="h-28 w-44 max-w-full rounded-md" />
        </div>
        <div class="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-4 w-48 max-w-full" />
        </div>
        <div class="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
          <Skeleton class="mt-2 h-4 w-20" />
          <Skeleton class="h-12 w-full max-w-xl rounded-md" />
        </div>
        <div class="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
          <Skeleton class="mt-2 h-4 w-20" />
          <Skeleton class="h-14 w-full max-w-xl rounded-md" />
        </div>
      </div>
    </section>

    <section class="border-b border-border/60 pb-5">
      <div class="px-1 sm:px-3">
        <Skeleton class="h-5 w-24" />
      </div>
      <div class="mt-4 space-y-3 px-1 sm:px-3">
        <div
          v-for="index in 3"
          :key="`contact-skeleton-${index}`"
          class="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center"
        >
          <Skeleton class="h-4 w-20" />
          <div class="flex flex-wrap items-center gap-3">
            <Skeleton class="h-4 w-24" />
            <Skeleton class="h-4 w-28" />
          </div>
        </div>
      </div>
    </section>

    <section class="pb-5">
      <div class="px-1 sm:px-3">
        <Skeleton class="h-5 w-24" />
      </div>
      <div class="mt-4 space-y-3 px-1 sm:px-3">
        <div
          v-for="index in 4"
          :key="`package-skeleton-${index}`"
          class="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center"
        >
          <Skeleton class="h-4 w-24" />
          <Skeleton :class="['h-4 max-w-full', index === 1 ? 'w-48' : index === 2 ? 'w-40' : index === 3 ? 'w-36' : 'w-44']" />
        </div>
      </div>
    </section>
  </div>

  <div v-else-if="props.variant === 'basic-info-secondary'" class="pb-5">
    <section class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <Skeleton class="h-5 w-36" />
        <Skeleton class="h-4 w-14" />
      </div>

      <div
        v-for="index in 2"
        :key="`park-building-skeleton-${index}`"
        class="rounded-xl border border-border/70 bg-background p-4"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-2">
            <Skeleton class="h-5 w-32" />
            <Skeleton class="h-4 w-24" />
          </div>
          <div class="flex gap-2">
            <Skeleton class="h-8 w-20 rounded-md" />
            <Skeleton class="h-8 w-20 rounded-md" />
          </div>
        </div>

        <div class="mt-4 space-y-3">
          <div
            v-for="row in 3"
            :key="`park-building-skeleton-${index}-row-${row}`"
            class="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center"
          >
            <Skeleton class="h-4 w-20" />
            <Skeleton :class="['h-4 max-w-full', row === 1 ? 'w-40' : row === 2 ? 'w-32' : 'w-full']" />
          </div>
        </div>

        <div class="mt-5 border-t border-border/60 pt-4">
          <div class="grid gap-3 rounded-lg border border-border/60 px-4 py-3">
            <div class="grid grid-cols-[minmax(10rem,1.1fr)_minmax(10rem,1fr)_2rem] gap-3">
              <Skeleton class="h-4 w-5/6" />
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-4 w-4" />
            </div>
            <div class="grid grid-cols-[minmax(10rem,1.1fr)_minmax(10rem,1fr)_2rem] gap-3">
              <Skeleton class="h-4 w-4/5" />
              <Skeleton class="h-4 w-2/3" />
              <Skeleton class="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="my-5 h-px bg-border/80" />

    <section class="space-y-4">
      <Skeleton class="h-5 w-32" />

      <div class="rounded-xl border border-border/70 bg-background px-4 py-3">
        <div class="grid gap-4 border-b border-border/60 pb-3 sm:grid-cols-[minmax(10rem,1.15fr)_minmax(9rem,1fr)_minmax(7rem,0.8fr)_minmax(8rem,0.85fr)_2.5rem]">
          <Skeleton
            v-for="index in 5"
            :key="`maintenance-header-${index}`"
            class="h-4 w-full"
          />
        </div>
        <div class="space-y-4 pt-4">
          <div
            v-for="row in 4"
            :key="`maintenance-row-${row}`"
            class="grid gap-4 sm:grid-cols-[minmax(10rem,1.15fr)_minmax(9rem,1fr)_minmax(7rem,0.8fr)_minmax(8rem,0.85fr)_2.5rem]"
          >
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-4 w-4" />
          </div>
        </div>
      </div>
    </section>
  </div>

  <div v-else-if="props.variant === 'sub-accounts'" class="space-y-4 pb-5">
    <div class="rounded-xl border border-border/70 bg-background px-4 py-4">
      <Skeleton class="h-5 w-28" />
      <Skeleton class="mt-3 h-4 w-full max-w-lg" />
      <Skeleton class="mt-2 h-4 w-5/6 max-w-xl" />
    </div>

    <div class="rounded-xl border border-border/60 bg-background px-4 py-3">
      <div class="grid gap-4 border-b border-border/60 pb-3 sm:grid-cols-[minmax(10rem,1.1fr)_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)_2.5rem]">
        <Skeleton
          v-for="index in 4"
          :key="`sub-account-header-${index}`"
          class="h-4 w-full"
        />
      </div>
      <div class="space-y-4 pt-4">
        <div
          v-for="row in 4"
          :key="`sub-account-row-${row}`"
          class="grid gap-4 sm:grid-cols-[minmax(10rem,1.1fr)_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)_2.5rem]"
        >
          <Skeleton class="h-4 w-5/6" />
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-4 w-4" />
        </div>
      </div>
    </div>
  </div>

  <div
    v-else-if="tableConfig"
    class="flex min-h-0 flex-1 flex-col pb-5"
  >
    <TablePageLoading
      class="-mt-3 sm:-mx-4 xl:-mx-8"
      :columns-template="tableConfig.columnsTemplate"
      :column-count="tableConfig.columnCount"
    />

    <div
      v-if="props.variant === 'work-orders'"
      class="mt-auto flex items-center justify-end gap-3 px-4 pt-4 sm:px-0"
    >
      <Skeleton class="h-4 w-48" />
      <Skeleton class="h-9 w-20 rounded-md" />
      <Skeleton class="h-9 w-20 rounded-md" />
    </div>
  </div>
</template>
