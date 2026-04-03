<script setup lang="ts">
import { computed, ref } from "vue"
import { Button } from "@/components/ui/button"
import Input from "@/components/ui/input/Input.vue"
import type { AppSidebarConversationItem } from "@/components/layout/app-sidebar/types"

const props = defineProps<{
  items: AppSidebarConversationItem[]
}>()

const keyword = ref("")

const filteredItems = computed(() => {
  const search = keyword.value.trim().toLowerCase()

  return props.items.filter((item) => {
    if (!search) {
      return true
    }

    const haystack = `${item.title} ${item.project} ${item.preview} ${item.model}`.toLowerCase()
    return haystack.includes(search)
  })
})

function handleCreateConversation() {
  // Mock-only entry point. Keep the button present until the real creation flow is wired.
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <div class="shrink-0 px-2 py-2">
      <div class="flex items-center gap-2">
        <Input
          v-model="keyword"
          placeholder="搜索 AI 对话..."
          class="h-9 rounded-full bg-background px-3 text-sm shadow-none"
        />
        <Button
          type="button"
          variant="default"
          size="sm"
          class="shrink-0 rounded-full"
          @click="handleCreateConversation"
        >
          <i class="ri-add-line text-[16px] leading-none" />
          <span>添加对话</span>
        </Button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <article
        v-for="(item, index) in filteredItems"
        :key="item.id"
        :class="[
          'group cursor-pointer px-4 py-4 transition-colors hover:bg-sidebar-hover',
          index !== filteredItems.length - 1 ? 'border-b border-border' : '',
        ]"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="truncate text-sm font-semibold text-foreground">
                {{ item.title }}
              </p>
              <span
                v-if="item.pinned"
                class="inline-flex shrink-0 items-center rounded-full bg-badge px-1.5 py-0.5 text-[10px] font-semibold text-link-foreground"
              >
                置顶
              </span>
            </div>
            <p class="mt-1 truncate text-xs text-muted-foreground">
              {{ item.project }}
            </p>
          </div>

          <div class="shrink-0 text-right">
            <p class="text-xs text-muted-foreground">{{ item.updatedAt }}</p>
            <p class="mt-1 text-[11px] font-medium text-muted-foreground">
              {{ item.messageCount }} 条
            </p>
          </div>
        </div>

        <p class="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {{ item.preview }}
        </p>

        <div class="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span class="rounded-full bg-muted px-2 py-0.5">{{ item.model }}</span>
          <span>最近更新</span>
        </div>
      </article>

      <div
        v-if="filteredItems.length === 0"
        class="px-4 py-10 text-center"
      >
        <p class="text-sm font-medium text-foreground">没有匹配的对话</p>
        <p class="mt-1 text-xs text-muted-foreground">当前为本地 mock 数据，接口接入后可直接替换数据源。</p>
      </div>
    </div>
  </div>
</template>
