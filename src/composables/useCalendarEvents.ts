import { computed, ref } from "vue"
import type { DateValue } from "reka-ui"
import { fetchWorkOrders } from "@/lib/work-orders-api"
import { fetchInspectionPlans } from "@/lib/inspection-plans-api"
import type { AppSidebarCalendarItem } from "@/components/layout/app-sidebar/types"

function toDateKey(dateStr: string | undefined): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return "--:--"
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return "--:--"
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function dateValueToKey(date: DateValue): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
}

export function useCalendarEvents() {
  const loading = ref(false)

  const allEvents = ref<AppSidebarCalendarItem[]>([])
  const eventDateKeys = computed(() => new Set(allEvents.value.map(e => e.dateKey)))

  function getEventsForDate(date: DateValue): AppSidebarCalendarItem[] {
    const key = dateValueToKey(date)
    return allEvents.value.filter(e => e.dateKey === key)
  }

  function hasEventsOnDate(date: DateValue): boolean {
    return eventDateKeys.value.has(dateValueToKey(date))
  }

  async function refresh() {
    loading.value = true
    try {
      const [woResult, planResult] = await Promise.all([
        fetchWorkOrders({ PageNum: 1, PageSize: 200 }).catch(() => ({ list: [], total: 0 })),
        fetchInspectionPlans({ PageNum: 1, PageSize: 200 }).catch(() => ({ list: [], total: 0 })),
      ])

      const events: AppSidebarCalendarItem[] = []

      for (const order of woResult.list) {
        const dateKey = toDateKey(order.Deadline)
        if (!dateKey) continue
        events.push({
          dateKey,
          time: formatTime(order.Deadline),
          title: `工单截止: ${order.OrderNo || order.PlanName || "未命名"}`,
          meta: order.CorpName || order.CustomerName || "",
          type: "work-order",
          uuid: order.Uuid || "",
        })
      }

      for (const plan of planResult.list) {
        const dateKey = toDateKey(plan.NextTime)
        if (!dateKey) continue
        events.push({
          dateKey,
          time: formatTime(plan.NextTime),
          title: `计划执行: ${plan.Name || "未命名"}`,
          meta: plan.CorpName || "",
          type: "inspection-plan",
          uuid: plan.Uuid || "",
        })
      }

      events.sort((a, b) => a.time.localeCompare(b.time))
      allEvents.value = events
    }
    finally {
      loading.value = false
    }
  }

  return {
    loading,
    allEvents,
    eventDateKeys,
    getEventsForDate,
    hasEventsOnDate,
    refresh,
  }
}
