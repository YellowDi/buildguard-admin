<script setup lang="ts">
import { computed, ref } from "vue"

import Input from "@/components/ui/input/Input.vue"
import { Switch } from "@/components/ui/switch"
import inboxData from "@/data/inbox.json"

type InboxItem = {
  id: number
  title: string
  source: string
  date: string
  dueLabel: string
  dueAt: string
  summary: string
  severity: "info" | "warning" | "danger"
}

type InboxGroup = {
  label: string
  items: InboxItem[]
}

const groups = inboxData as InboxGroup[]
const search = ref("")
const unreadOnly = ref(false)

const items = computed(() =>
  groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      inboxTime: buildInboxTime(group.label, item.date),
      unread: item.severity !== "info",
    })),
  ),
)

const filteredItems = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return items.value.filter((item) => {
    if (unreadOnly.value && !item.unread) return false
    if (!keyword) return true

    const haystack = `${item.source} ${item.title} ${item.summary} ${item.dueAt}`.toLowerCase()
    return haystack.includes(keyword)
  })
})

function buildInboxTime(groupLabel: string, date: string) {
  if (groupLabel === "今天") return date.slice(-5)
  if (groupLabel === "更早") return "1 天前"
  return date
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-[var(--sidebar-width)] z-30 w-[24.5rem] border-r border-border bg-background"
  >
    <header class="border-b border-border bg-background px-4 py-3.5">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold leading-none text-foreground">收件箱</h2>
        <label class="flex items-center gap-3">
          <span class="text-xs font-medium text-foreground">仅看未读</span>
          <Switch v-model="unreadOnly" />
        </label>
      </div>

      <Input
        v-model="search"
        placeholder="搜索收件箱..."
        class="mt-3 h-9 rounded-lg bg-background px-3 text-sm shadow-none"
      />
    </header>

    <div class="h-[calc(100svh-6.75rem)] overflow-y-auto">
      <article
        v-for="item in filteredItems"
        :key="item.id"
        class="group border-b border-border px-4 py-4 transition-colors hover:bg-accent/60"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="min-w-0 truncate text-sm font-medium leading-tight text-foreground transition-colors group-hover:text-foreground">
            {{ item.source }}
          </p>
          <p class="shrink-0 pt-0.5 text-xs font-normal leading-none text-muted-foreground">
            {{ item.inboxTime }}
          </p>
        </div>

        <p class="mt-2.5 text-sm font-semibold leading-tight text-foreground">
          {{ item.title }}
        </p>

        <p class="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {{ item.summary }}
        </p>
      </article>

      <div
        v-if="filteredItems.length === 0"
        class="px-4 py-10 text-sm text-muted-foreground"
      >
        No messages found.
      </div>
    </div>
  </aside>
</template>
