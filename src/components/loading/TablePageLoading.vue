<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"
</script>

<template>
  <section
    class="-mx-4 flex min-h-0 min-w-0 flex-1 flex-col bg-background"
    style="--table-page-columns: 3rem minmax(11rem, 1.5fr) minmax(8rem, 1fr) minmax(8rem, 1fr) minmax(10rem, 1.2fr) minmax(8rem, 1fr); --table-page-sticky-top: -1rem;"
  >
    <div class="flex min-h-0 min-w-0 flex-1 flex-col pb-3 pt-3">
      <div class="sticky top-(--table-page-sticky-top) z-10 border-b border-border/70 bg-background/95 px-4 pb-4 pt-1 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div class="flex flex-col gap-5">
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div class="space-y-3">
              <Skeleton class="h-8 w-24" />
              <Skeleton class="h-4 w-40" />
            </div>

            <div class="flex flex-wrap gap-2">
              <Skeleton class="h-9 w-24" />
              <Skeleton class="h-9 w-24" />
              <Skeleton class="h-9 w-28" />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Skeleton class="h-8 w-16 rounded-full" />
            <Skeleton class="h-8 w-20 rounded-full" />
            <Skeleton class="h-8 w-20 rounded-full" />
            <Skeleton class="h-8 w-24 rounded-full" />
          </div>

          <div class="flex flex-wrap gap-2">
            <Skeleton class="h-9 w-40" />
            <Skeleton class="h-9 w-32" />
            <Skeleton class="h-9 w-36" />
          </div>
        </div>
      </div>

      <div class="min-h-0 min-w-0 flex-1 px-4 pt-4">
        <div class="overflow-hidden">
          <div class="grid grid-cols-(--table-page-columns) gap-4 border-b border-border/60 px-4 py-3">
            <Skeleton
              v-for="index in 6"
              :key="`table-header-${index}`"
              class="h-4 w-full"
            />
          </div>

          <div
            v-for="row in 8"
            :key="`table-row-${row}`"
            class="grid grid-cols-(--table-page-columns) gap-4 border-b border-border/50 px-4 py-4 last:border-b-0"
          >
            <Skeleton class="h-4 w-6" />
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
