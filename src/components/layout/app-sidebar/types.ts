export type AppSidebarTopTabId = "home" | "calendar" | "inbox"

export type AppSidebarNavItem = {
  label: string
  icon?: string
  path?: string
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

export type AppSidebarCalendarItem = {
  time: string
  title: string
  meta: string
}
