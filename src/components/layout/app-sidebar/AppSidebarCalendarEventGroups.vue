<script setup lang="ts">
import type { CalendarEventGroup } from "@/composables/useCalendarEvents"
import type { AppSidebarCalendarItem } from "@/components/layout/app-sidebar/types"

defineProps<{
  loading: boolean
  groups: CalendarEventGroup[]
}>()

const emit = defineEmits<{
  "select-event": [event: AppSidebarCalendarItem]
}>()

const barAccentClass: Record<AppSidebarCalendarItem["type"], string> = {
  "work-order": "bg-orange-500 dark:bg-orange-400",
  "inspection-plan": "bg-blue-500 dark:bg-blue-400",
  "inspection-service": "bg-emerald-500 dark:bg-emerald-400",
}

function getEventTitleText(event: AppSidebarCalendarItem) {
  const parts = event.title.split(/[:：]\s*/, 2)
  return parts[1]?.trim() || event.title
}
</script>

<template>
  <template v-if="loading">
    <p class="py-8 text-center text-sm text-muted-foreground">加载中...</p>
  </template>
  <template v-else-if="groups.length === 0">
    <p class="py-8 text-center text-sm text-muted-foreground">暂无条目</p>
  </template>
  <template v-else>
    <section
      v-for="(block, idx) in groups"
      :key="`${block.sectionLabel}-${idx}`"
      class="mb-5 last:mb-0"
    >
      <div class="mb-2 flex items-center gap-2 py-1">
        <h3 class="text-xs font-medium text-muted-foreground">{{ block.sectionLabel }}</h3>
        <span
          class="tabular-nums rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >{{ block.events.length }}</span>
      </div>
      <ul class="flex flex-col gap-2" role="list">
        <li
          v-for="event in block.events"
          :key="`${event.type}-${event.uuid}-${event.dateKey}`"
          class="cursor-pointer rounded-md bg-background p-[4px] transition-colors hover:bg-muted dark:bg-background dark:hover:bg-muted/50"
          @click="emit('select-event', event)"
        >
          <div class="flex items-center gap-3">
            <span
              class="h-[46px] w-[4px] shrink-0 rounded-full"
              :class="barAccentClass[event.type]"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium leading-snug text-foreground">
                {{ getEventTitleText(event) }}
              </p>
              <p class="mt-0.5 text-xs leading-snug text-muted-foreground">
                <span v-if="event.time">{{ event.time }}</span>
                <span v-if="event.time && event.meta" class="mx-1">·</span>
                <span v-if="event.meta">{{ event.meta }}</span>
              </p>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </template>
</template>
