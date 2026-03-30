<script setup lang="ts">
import FormBodyLoading from "@/components/loading/FormBodyLoading.vue"
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

    <FormBodyLoading />
  </section>
</template>
