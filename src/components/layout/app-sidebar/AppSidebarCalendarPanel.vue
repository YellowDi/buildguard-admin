<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { getLocalTimeZone, today } from "@internationalized/date"
import AppSidebarMiniCalendar from "@/components/layout/app-sidebar/AppSidebarMiniCalendar.vue"
import AppSidebarCalendarSourceSheet from "@/components/layout/app-sidebar/AppSidebarCalendarSourceSheet.vue"
import type { AppSidebarCalendarDate, AppSidebarCalendarItem } from "@/components/layout/app-sidebar/types"
import { dateValueToKey, useCalendarEvents, type CalendarDataSourceEntry } from "@/composables/useCalendarEvents"

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
const { loading, dataSources, allEvents, getEventsForDate, hasEventsOnDate, refresh } = useCalendarEvents()

const sourceSheetOpen = ref(false)
const selectedSourceType = ref<AppSidebarCalendarItem["type"] | null>(null)

watch(
  sourceSheetOpen,
  (open) => {
    document.documentElement.classList.toggle("calendar-source-sheet-open", open)
  },
  { flush: "post" },
)

onUnmounted(() => {
  document.documentElement.classList.remove("calendar-source-sheet-open")
})

function addDaysToDateKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

function sectionLabelForDateKey(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey)
    return "今天"
  if (dateKey === addDaysToDateKey(todayKey, 1))
    return "明天"
  const [y, m, d] = dateKey.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  const w = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][dt.getDay()]!
  return `${m}月${d}日 ${w}`
}

const sourceSheetGroups = computed(() => {
  if (!selectedSourceType.value)
    return [] as Array<{ sectionLabel: string, events: AppSidebarCalendarItem[] }>
  const list = allEvents.value
    .filter(e => e.type === selectedSourceType.value)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.time.localeCompare(b.time))
  const todayKey = dateValueToKey(getTodayDate())
  const map = new Map<string, AppSidebarCalendarItem[]>()
  for (const e of list) {
    const arr = map.get(e.dateKey) ?? []
    arr.push(e)
    map.set(e.dateKey, arr)
  }
  const keys = [...map.keys()].sort()
  return keys.map(k => ({
    sectionLabel: sectionLabelForDateKey(k, todayKey),
    events: map.get(k)!,
  }))
})

const selectedSourceMeta = computed(() => {
  if (!selectedSourceType.value)
    return { label: "", subtitle: "", swatch: "" }
  const src = dataSources.value.find(s => s.type === selectedSourceType.value)
  const pres = calendarItemTypePresentation[selectedSourceType.value]
  return {
    label: src?.label ?? "",
    subtitle: src?.dateFieldLabel ?? "",
    swatch: pres.swatch,
  }
})

function toggleSourceSheet(src: CalendarDataSourceEntry) {
  if (sourceSheetOpen.value && selectedSourceType.value === src.type) {
    sourceSheetOpen.value = false
    selectedSourceType.value = null
  }
  else {
    selectedSourceType.value = src.type
    sourceSheetOpen.value = true
  }
}

function onSourceSheetOpenChange(open: boolean) {
  if (!open)
    selectedSourceType.value = null
}

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

function onSheetSelectEvent(event: AppSidebarCalendarItem) {
  sourceSheetOpen.value = false
  selectedSourceType.value = null
  navigateToDetail(event)
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
          role="button"
          tabindex="0"
          class="flex w-full cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1.5 text-left transition-colors hover:bg-sidebar-hover"
          :class="sourceSheetOpen && selectedSourceType === src.type ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''"
          @click="toggleSourceSheet(src)"
          @keydown.enter.prevent="toggleSourceSheet(src)"
          @keydown.space.prevent="toggleSourceSheet(src)"
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

    <AppSidebarCalendarSourceSheet
      v-model:open="sourceSheetOpen"
      @update:open="onSourceSheetOpenChange"
      :source-type="selectedSourceType"
      :title="selectedSourceMeta.label"
      :subtitle="selectedSourceMeta.subtitle"
      :loading="loading"
      :groups="sourceSheetGroups"
      :swatch-class="selectedSourceMeta.swatch"
      @select-event="onSheetSelectEvent"
    />
  </div>
</template>
