<script setup lang="ts">
import { computed, ref } from "vue"
import Input from "@/components/ui/input/Input.vue"
import { Switch } from "@/components/ui/switch"
import type {
  AppSidebarInboxGroup,
  AppSidebarInboxItem,
} from "@/components/layout/app-sidebar/types"

type InboxEntry = AppSidebarInboxItem & {
  inboxTime: string
  unread: boolean
}

const props = defineProps<{
  groups: AppSidebarInboxGroup[]
}>()

const inboxSearch = ref("")
const inboxUnreadOnly = ref(false)

const inboxEntries = computed<InboxEntry[]>(() =>
  props.groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      inboxTime: buildInboxTime(group.label, item.date),
      unread: item.severity !== "info",
    })),
  ),
)

const filteredInboxEntries = computed(() => {
  const keyword = inboxSearch.value.trim().toLowerCase()

  return inboxEntries.value.filter((item) => {
    if (inboxUnreadOnly.value && !item.unread) {
      return false
    }

    if (!keyword) {
      return true
    }

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
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <div class="shrink-0 px-2 py-2">
      <div class="flex items-center gap-3">
        <Input
          v-model="inboxSearch"
          placeholder="搜索收件箱..."
          class="h-9 rounded-lg bg-background px-3 text-sm shadow-none"
        />
        <label class="flex shrink-0 items-center gap-2.5">
          <span class="text-xs font-medium text-foreground">仅看未读</span>
          <Switch v-model="inboxUnreadOnly" />
        </label>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <article
        v-for="(item, index) in filteredInboxEntries"
        :key="item.id"
        :class="[
          'group px-4 py-4 transition-colors hover:bg-interactive-hover',
          index !== filteredInboxEntries.length - 1 ? 'border-b border-border' : '',
        ]"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="min-w-0 truncate text-sm font-medium leading-tight text-foreground">
            {{ item.source }}
          </p>
          <p class="shrink-0 pt-0.5 text-xs font-normal leading-none text-muted-foreground">
            {{ item.inboxTime }}
          </p>
        </div>

        <p class="mt-2 text-sm font-semibold leading-tight text-foreground">
          {{ item.title }}
        </p>

        <p class="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {{ item.summary }}
        </p>
      </article>

      <div
        v-if="filteredInboxEntries.length === 0"
        class="px-3 py-10 text-sm text-muted-foreground"
      >
        No messages found.
      </div>
    </div>
  </div>
</template>
