<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"
</script>

<template>
  <div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]">
    <div class="space-y-0">
      <section
        v-for="section in 6"
        :key="`form-body-skeleton-${section}`"
        class="border-b border-border/60 py-5 first:pt-0"
      >
        <div class="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
          <div class="space-y-2">
            <Skeleton class="h-5 w-24" />
            <Skeleton
              v-if="section === 2"
              class="h-4 w-32"
            />
          </div>

          <div class="space-y-3">
            <Skeleton
              :class="section === 2 ? 'h-32 w-full rounded-lg' : 'h-10 w-full'"
            />
            <Skeleton
              v-if="section === 4"
              class="h-10 w-40"
            />
          </div>
        </div>
      </section>
    </div>

    <aside class="hidden lg:block">
      <div class="sticky top-28 p-1">
        <div class="space-y-4">
          <Skeleton class="h-5 w-24" />
          <div class="space-y-3">
            <Skeleton
              v-for="item in 6"
              :key="`form-body-nav-${item}`"
              class="h-8 w-full"
            />
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>
