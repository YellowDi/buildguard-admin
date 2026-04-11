<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
</script>

<template>
  <div class="grid min-h-svh bg-background lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div class="flex justify-center md:justify-start">
        <div class="flex items-center gap-2">
          <Skeleton class="size-8 rounded-lg" />
          <Skeleton class="h-4 w-28" />
        </div>
      </div>

      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-xs p-2">
          <div class="grid gap-6">
            <div class="grid justify-items-center gap-3 text-center">
              <Spinner class="size-5 text-muted-foreground" label="页面加载中" />
              <div class="grid justify-items-center gap-2">
                <Skeleton class="h-8 w-28" />
                <Skeleton class="h-4 w-40" />
              </div>
            </div>

            <div class="grid gap-4">
              <div class="grid gap-2">
                <Skeleton class="h-4 w-16" />
                <Skeleton class="h-10 w-full" />
              </div>
              <div class="grid gap-2">
                <Skeleton class="h-4 w-20" />
                <Skeleton class="h-10 w-full" />
              </div>
              <Skeleton class="h-10 w-full" />
              <Skeleton class="h-10 w-full" />
            </div>

            <div class="grid justify-items-center gap-2">
              <Skeleton class="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="relative hidden overflow-hidden bg-muted lg:block">
      <div
        class="absolute inset-0"
        style="background-image: radial-gradient(circle at top left, color-mix(in srgb, var(--background) 65%, transparent), transparent 42%), linear-gradient(135deg, color-mix(in srgb, var(--background) 45%, transparent), color-mix(in srgb, var(--background) 8%, transparent));"
      />
      <div class="absolute inset-10 bg-background/12 backdrop-blur-sm" />
      <Skeleton class="absolute left-10 top-10 h-12 w-40 bg-background/30" />
      <Skeleton class="absolute bottom-16 left-16 h-48 w-48 rounded-full bg-background/20" />
      <Skeleton class="absolute right-16 top-24 h-56 w-56 rounded-full bg-background/20" />
    </div>
  </div>
</template>
