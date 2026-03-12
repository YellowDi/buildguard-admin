<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"
</script>

<template>
  <section class="detail-layout mx-auto flex w-full max-w-[1440px] min-w-0 flex-1 flex-col px-0 pb-8 sm:px-4 sm:pb-10 xl:px-8">
    <div class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-4">
      <div class="px-4 py-5">
        <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div class="space-y-3">
            <Skeleton class="h-9 w-40" />
            <Skeleton class="h-5 w-28" />
          </div>
          <Skeleton class="h-9 w-28" />
        </div>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 gap-8 px-0 py-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <div class="min-w-0">
        <div
          v-for="section in 2"
          :key="`detail-section-${section}`"
          class="border-b border-border/60 px-5 py-5 last:border-b-0"
        >
          <Skeleton class="mb-5 h-5 w-32" />
          <div class="grid gap-4">
            <div
              v-for="row in 4"
              :key="`detail-row-${section}-${row}`"
              class="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-center"
            >
              <Skeleton class="h-4 w-24" />
              <Skeleton class="h-4 w-full max-w-md" />
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-5">
        <div
          v-for="module in 2"
          :key="`detail-module-${module}`"
          class="px-2 py-1"
        >
          <Skeleton class="mb-5 h-5 w-28" />
          <div class="space-y-4">
            <div
              v-for="group in 2"
              :key="`detail-group-${module}-${group}`"
              class="space-y-3"
            >
              <Skeleton class="h-4 w-24" />
              <div class="space-y-3 p-1">
                <div
                  v-for="row in 3"
                  :key="`detail-group-row-${module}-${group}-${row}`"
                  class="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_2rem] gap-3"
                >
                  <Skeleton class="h-4 w-5/6" />
                  <Skeleton class="h-4 w-4/5" />
                  <Skeleton class="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
