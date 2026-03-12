<script setup lang="ts">
import { Calendar } from "@/components/ui/calendar"
import type { AppSidebarCalendarItem } from "@/components/layout/app-sidebar/types"

const props = defineProps<{
  items: AppSidebarCalendarItem[]
}>()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <Calendar
      locale="zh-CN"
      layout="month-and-year"
      class="w-full max-w-full p-0"
    />

    <div class="mt-3 overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2.5">
        <p class="text-sm font-semibold text-foreground">今日安排</p>
        <span class="text-xs text-muted-foreground">{{ props.items.length }} 项</span>
      </div>

      <div class="divide-y divide-border">
        <article
          v-for="item in props.items"
          :key="`${item.time}-${item.title}`"
          class="px-3 py-3"
        >
          <div class="flex items-start gap-3">
            <span class="w-11 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{{ item.time }}</span>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-foreground">{{ item.title }}</p>
              <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.meta }}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
