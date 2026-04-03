<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { getLocalTimeZone, today } from "@internationalized/date"
import AppSidebarMiniCalendar from "@/components/layout/app-sidebar/AppSidebarMiniCalendar.vue"
import type { AppSidebarCalendarDate, AppSidebarCalendarItem } from "@/components/layout/app-sidebar/types"
import { useCalendarEvents } from "@/composables/useCalendarEvents"

/**
 * 与下方日程条目右上角徽章同一套色板。
 * 色块用同色相的 500/400（与徽章上偏亮的橙/绿/蓝观感一致）；勿用 700 作实心填充，易偏褐红、与标签不一致。
 */
const calendarItemTypePresentation: Record<
  AppSidebarCalendarItem["type"],
  { swatch: string, badge: string }
> = {
  "work-order": {
    swatch: "bg-orange-500 dark:bg-orange-400",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  },
  "inspection-service": {
    swatch: "bg-emerald-500 dark:bg-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  "inspection-plan": {
    swatch: "bg-blue-500 dark:bg-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  },
}

const router = useRouter()
const { loading, dataSources, getEventsForDate, hasEventsOnDate, refresh } = useCalendarEvents()

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

function getEventTypeText(event: { type: string, title: string }) {
  const [prefix] = event.title.split(/[:：]/, 1)
  if (prefix?.trim()) return prefix.trim()
  if (event.type === "work-order") return "工单截止"
  if (event.type === "inspection-service") return "合同到期"
  return "计划执行"
}

function getEventTitleText(event: { title: string }) {
  const parts = event.title.split(/[:：]\s*/, 2)
  return parts[1]?.trim() || event.title
}

function navigateToDetail(event: { type: string, uuid: string }) {
  if (!event.uuid) return
  if (event.type === "work-order") {
    router.push({ name: "inspection-work-order-detail", params: { id: event.uuid } })
  }
  else if (event.type === "inspection-plan") {
    router.push({ name: "inspection-plan-detail", params: { id: event.uuid } })
  }
  else if (event.type === "inspection-service") {
    router.push({ name: "inspection-service-detail", params: { id: event.uuid } })
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

    <div class="mt-2 shrink-0 border-t border-sidebar-border/80 pt-2.5">
      <ul class="space-y-0.5" role="list">
        <li
          v-for="src in dataSources"
          :key="src.type"
          class="flex cursor-default items-center gap-2 rounded-sm px-1.5 py-1.5 transition-colors hover:bg-sidebar-hover"
        >
          <span
            class="size-3 shrink-0 rounded-[3px]"
            :class="calendarItemTypePresentation[src.type].swatch"
            aria-hidden="true"
          />

          <span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ src.label }}</span>
          <span class="shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground">{{ src.dateFieldLabel }}</span>
        </li>
      </ul>
    </div>

    <div class="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-sidebar-border pt-3">
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

      <div v-else class="space-y-1">
        <article
          v-for="event in eventsForSelectedDate"
          :key="`${event.type}-${event.uuid}`"
          class="cursor-pointer rounded-xl px-3 py-3 transition-colors hover:bg-sidebar-hover"
          @click="navigateToDetail(event)"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="truncate text-xs font-medium text-muted-foreground">{{ getEventTypeText(event) }}</p>
            <span
              class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
              :class="calendarItemTypePresentation[event.type as AppSidebarCalendarItem['type']].badge"
            >
              {{ event.type === "work-order" ? "工单" : event.type === "inspection-service" ? "服务" : "计划" }}
            </span>
          </div>
          <div class="mt-1.5 min-w-0">
            <p class="truncate text-sm font-medium text-foreground">{{ getEventTitleText(event) }}</p>
            <p v-if="event.meta || event.time" class="mt-0.5 truncate text-xs text-muted-foreground">
              <span v-if="event.time">{{ event.time }}</span>
              <span v-if="event.time && event.meta" class="mx-1">·</span>
              <span v-if="event.meta">{{ event.meta }}</span>
            </p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
