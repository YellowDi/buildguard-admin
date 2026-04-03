export type AppSidebarTopTabId = "home" | "calendar" | "inbox" | "conversation"

export type AppSidebarNavItem = {
  label: string
  kind?: "item" | "separator"
  icon?: string
  path?: string
  action?: "open-settings"
  badge?: string
  children?: AppSidebarNavItem[]
  open?: boolean
}

export type AppSidebarInboxItem = {
  id: number
  title: string
  source: string
  date: string
  dueLabel: string
  dueAt: string
  summary: string
  severity: "info" | "warning" | "danger"
}

export type AppSidebarInboxGroup = {
  label: string
  items: AppSidebarInboxItem[]
}

export type AppSidebarConversationItem = {
  id: string
  title: string
  project: string
  model: string
  updatedAt: string
  preview: string
  messageCount: number
  pinned?: boolean
}

export type AppSidebarCalendarDate = {
  year: number
  month: number
  day: number
  copy: () => AppSidebarCalendarDate
  cycle: (field: "month", amount: number) => AppSidebarCalendarDate
  toString: () => string
}

export type AppSidebarCalendarItem = {
  time: string
  title: string
  meta: string
  type: "work-order" | "inspection-plan" | "inspection-service"
  uuid: string
  dateKey: string
}
