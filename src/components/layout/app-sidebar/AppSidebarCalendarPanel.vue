<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { getLocalTimeZone, today } from "@internationalized/date"
import AppSidebarMiniCalendar from "@/components/layout/app-sidebar/AppSidebarMiniCalendar.vue"
import type { AppSidebarCalendarDate } from "@/components/layout/app-sidebar/types"
import { useCalendarEvents } from "@/composables/useCalendarEvents"

const router = useRouter()
const { loading, getEventsForDate, hasEventsOnDate, refresh } = useCalendarEvents()

function getTodayDate(): AppSidebarCalendarDate {
  return today(getLocalTimeZone()) as unknown as AppSidebarCalendarDate
}

const selectedDate = ref<AppSidebarCalendarDate>(getTodayDate())

const eventsForSelectedDate = computed(() => getEventsForDate(selectedDate.value))

const selectedDateLabel = computed(() => {
  const d = selectedDate.value
  const t = getTodayDate()
  if (d.year === t.year && d.month === t.month && d.day === t.day) {
    return "今日安排"
  }
  return `${d.month}月${d.day}日安排`
})

function navigateToDetail(event: { type: string, uuid: string }) {
  if (!event.uuid) return
  if (event.type === "work-order") {
    router.push({ name: "inspection-work-order-detail", params: { id: event.uuid } })
  }
  else if (event.type === "inspection-plan") {
    router.push({ name: "inspection-plan-detail", params: { id: event.uuid } })
  }
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <AppSidebarMiniCalendar
      v-model="selectedDate"
      :has-event-on-date="hasEventsOnDate"
    />

    <div class="mt-3 min-h-0 flex-1 overflow-y-auto">
      <div class="flex items-center justify-between px-3 py-2.5">
        <p class="text-sm font-semibold text-foreground">{{ selectedDateLabel }}</p>
        <span class="text-xs text-muted-foreground">
          <template v-if="loading">加载中...</template>
          <template v-else>{{ eventsForSelectedDate.length }} 项</template>
        </span>
      </div>

      <div v-if="!loading && eventsForSelectedDate.length === 0" class="px-3 py-6 text-center">
        <p class="text-sm text-muted-foreground">暂无安排</p>
      </div>

      <div v-else class="divide-y divide-border">
        <article
          v-for="event in eventsForSelectedDate"
          :key="`${event.type}-${event.uuid}`"
          class="cursor-pointer px-3 py-3 transition-colors hover:bg-accent/50"
          @click="navigateToDetail(event)"
        >
          <div class="flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-foreground">{{ event.title }}</p>
              <p v-if="event.meta" class="mt-0.5 truncate text-xs text-muted-foreground">{{ event.meta }}</p>
            </div>
            <span
              class="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
              :class="event.type === 'work-order'
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'"
            >
              {{ event.type === "work-order" ? "工单" : "计划" }}
            </span>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
