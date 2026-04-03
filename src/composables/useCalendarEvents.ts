import { computed, ref } from "vue"
import { fetchWorkOrders } from "@/lib/work-orders-api"
import { fetchInspectionPlans } from "@/lib/inspection-plans-api"
import { fetchInspectionServices } from "@/lib/inspection-services-api"
import type { AppSidebarCalendarDate, AppSidebarCalendarItem } from "@/components/layout/app-sidebar/types"

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

export function dateValueToKey(date: AppSidebarCalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
}

export type CalendarDataSourceEntry = {
  type: AppSidebarCalendarItem["type"]
  label: string
  /** 日历上使用的日期字段说明（右侧副标题） */
  dateFieldLabel: string
  count: number
}

export function useCalendarEvents() {
  const loading = ref(false)

  const allEvents = ref<AppSidebarCalendarItem[]>([])
  const eventDateKeys = computed(() => new Set(allEvents.value.map(e => e.dateKey)))

  const dataSources = computed((): CalendarDataSourceEntry[] => {
    const list = allEvents.value
    return [
      {
        type: "work-order",
        label: "检测工单",
        dateFieldLabel: "截止日期",
        count: list.filter(e => e.type === "work-order").length,
      },
      {
        type: "inspection-plan",
        label: "检测计划",
        dateFieldLabel: "下次执行",
        count: list.filter(e => e.type === "inspection-plan").length,
      },
      {
        type: "inspection-service",
        label: "检测服务",
        dateFieldLabel: "合同到期",
        count: list.filter(e => e.type === "inspection-service").length,
      },
    ]
  })

  function getEventsForDate(date: AppSidebarCalendarDate): AppSidebarCalendarItem[] {
    const key = dateValueToKey(date)
    return allEvents.value.filter(e => e.dateKey === key)
  }

  function hasEventsOnDate(date: AppSidebarCalendarDate): boolean {
    return eventDateKeys.value.has(dateValueToKey(date))
  }

  async function refresh() {
    loading.value = true
    try {
      const [woResult, planResult, serviceResult] = await Promise.all([
        fetchWorkOrders({ PageNum: 1, PageSize: 200 }).catch(() => ({ list: [], total: 0 })),
        fetchInspectionPlans({ PageNum: 1, PageSize: 200 }).catch(() => ({ list: [], total: 0 })),
        fetchInspectionServices({ PageNum: 1, PageSize: 200 }).catch(() => ({ list: [], total: 0 })),
      ])

      const events: AppSidebarCalendarItem[] = []

      for (const order of woResult.list) {
        const dateKey = toDateKey(order.Deadline)
        if (!dateKey) continue
        events.push({
          dateKey,
          time: formatTime(order.Deadline),
          title: `工单截止: ${order.PlanName || order.PackageName || "检测工单"}`,
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

      for (const service of serviceResult.list) {
        const dateKey = toDateKey(service.ContractEndTime)
        if (!dateKey) continue
        events.push({
          dateKey,
          time: formatTime(service.ContractEndTime),
          title: `合同到期: ${service.Name || "未命名检测服务"}`,
          meta: service.CorpName || service.CustomerName || "",
          type: "inspection-service",
          uuid: service.Uuid || "",
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
    dataSources,
    eventDateKeys,
    getEventsForDate,
    hasEventsOnDate,
    refresh,
  }
}
