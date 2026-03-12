<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"
</script>

<template>
  <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-8">
    <div class="sticky top-0 z-10 mx-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-4">
      <div class="px-4 py-5">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <Skeleton class="h-9 w-32" />
          <div class="flex flex-wrap gap-2">
            <Skeleton class="h-9 w-24" />
            <Skeleton class="h-9 w-24" />
          </div>
        </div>
      </div>
    </div>

    <div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]">
      <div class="space-y-0">
        <section
          v-for="section in 6"
          :key="`form-section-${section}`"
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
                :key="`form-nav-${item}`"
                class="h-8 w-full"
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
