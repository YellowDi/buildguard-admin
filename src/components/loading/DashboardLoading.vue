<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"
</script>

<template>
  <div class="flex flex-col gap-4 py-4">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="index in 3"
        :key="`dashboard-stat-${index}`"
        class="space-y-3"
      >
        <Skeleton class="h-5 w-24" />
        <div class="flex min-h-32 flex-col justify-between gap-6 py-2">
          <div class="space-y-2">
            <Skeleton class="h-9 w-28" />
            <Skeleton class="h-4 w-44" />
          </div>
          <Skeleton class="h-4 w-32" />
        </div>
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton class="h-5 w-36" />
        <Skeleton class="h-8 w-full sm:w-33" />
      </div>
      <div class="flex min-h-80 flex-col justify-between gap-5 py-2">
        <Skeleton class="h-60 w-full rounded-xl" />
        <div class="flex flex-wrap gap-3">
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-4 w-20" />
        </div>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="index in 3"
        :key="`dashboard-chart-${index}`"
        class="space-y-3"
      >
        <Skeleton class="h-5 w-32" />
        <div class="flex min-h-72 flex-col justify-between gap-5 py-2">
          <Skeleton class="h-52 w-full rounded-xl" />
          <div class="flex flex-wrap gap-3">
            <Skeleton class="h-4 w-20" />
            <Skeleton class="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
