<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type InboxGroup = {
  label: string
  items: Array<{
    id: number
    title: string
    source: string
    date: string
    dueAt: string
  }>
}

const groups: InboxGroup[] = [
  {
    label: "今天",
    items: [
      { id: 1, title: "提醒", source: "Spotify", date: "2024/06/01", dueAt: "2017 年 10 月 6 日 20:49" },
      { id: 2, title: "提醒", source: "Spotify", date: "2024/06/01", dueAt: "2017 年 10 月 6 日 20:49" },
      { id: 3, title: "提醒", source: "Spotify", date: "2024/06/01", dueAt: "2017 年 10 月 6 日 20:49" },
    ],
  },
  {
    label: "更早",
    items: [
      { id: 4, title: "提醒", source: "Spotify", date: "2024/06/01", dueAt: "2017 年 10 月 6 日 20:49" },
      { id: 5, title: "提醒", source: "Spotify", date: "2024/06/01", dueAt: "2017 年 10 月 6 日 20:49" },
      { id: 6, title: "提醒", source: "Spotify", date: "2024/06/01", dueAt: "2017 年 10 月 6 日 20:49" },
      { id: 7, title: "提醒", source: "Spotify", date: "2024/06/01", dueAt: "2017 年 10 月 6 日 20:49" },
    ],
  },
]
</script>

<template>
  <aside
    class="fixed inset-y-0 left-[16rem] z-[5] w-[24.5rem] border-r border-black/10 bg-white"
  >
    <header class="flex h-14 items-center justify-between border-b border-black/8 bg-white/75 px-4 backdrop-blur-sm">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-[#4b5563] transition-colors hover:bg-black/5"
        >
          <i class="ri-inbox-unarchive-fill text-base" />
        </button>
        <span class="text-lg font-semibold text-[#171717]">收件箱</span>
      </div>

      <div class="flex items-center gap-2 text-[#6b7280]">
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-black/5"
        >
          <i class="ri-filter-3-line text-lg" />
        </button>
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-black/5"
        >
          <i class="ri-more-2-fill text-lg" />
        </button>
      </div>
    </header>

    <div class="h-[calc(100svh-3.5rem)] overflow-y-auto">
      <section v-for="group in groups" :key="group.label">
        <div class="sticky top-0 z-10 border-b border-black/8 bg-[#f7f7f6] px-4 py-1.5 text-sm text-[#8b8b88]">
          {{ group.label }}
        </div>

        <article
          v-for="item in group.items"
          :key="item.id"
          class="group relative border-b border-black/8 bg-white px-4 py-4 transition-colors hover:bg-black/[0.02]"
        >
          <div class="flex gap-4">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-[#666]">
              <i class="ri-notification-3-line text-lg" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-sm font-medium leading-5 text-[#1f1f1f]">{{ item.title }}</p>
                  <p class="truncate text-xl font-medium leading-tight text-[#3f3f46] underline underline-offset-2">
                    {{ item.source }}
                  </p>
                </div>
                <div class="flex h-8 w-[7rem] shrink-0 items-start justify-end">
                  <span class="pt-1 text-right text-sm text-[#7b7b7b] group-hover:hidden">
                    {{ item.date }}
                  </span>
                  <div
                    class="hidden items-start justify-end gap-1 rounded-xl border border-black/8 bg-white p-1 shadow-sm group-hover:flex"
                  >
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <button
                          type="button"
                          class="flex size-8 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-black/5"
                        >
                          <i class="ri-notification-3-line text-lg" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">提醒</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <button
                          type="button"
                          class="flex size-8 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-black/5"
                        >
                          <i class="ri-notification-badge-line text-lg" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">标记未读</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <button
                          type="button"
                          class="flex size-8 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-black/5"
                        >
                          <i class="ri-archive-line text-lg" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">归档</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div class="mt-4 space-y-1 text-[#666]">
                <p class="text-xs">到期时间</p>
                <p class="flex items-center gap-2 text-base font-semibold text-[#111]">
                  <i class="ri-calendar-line text-base font-normal text-[#555]" />
                  <span>{{ item.dueAt }}</span>
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  </aside>
</template>
