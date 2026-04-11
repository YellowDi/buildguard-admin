<script setup lang="ts">
import { computed } from "vue"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailFieldSection, EntityHistoryMetaBadge, EntityHistoryTone, HistoryEntry } from "@/components/detail/types"
import TitleBlock from "@/components/layout/TitleBlock.vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  metaBadges?: EntityHistoryMetaBadge[]
  sections: DetailFieldSection[]
  historyTitle?: string
  historyEntries: HistoryEntry[]
  emptyHistoryTitle?: string
  emptyHistoryDescription?: string
}>(), {
  description: "",
  metaBadges: () => [],
  historyTitle: "历史记录",
  emptyHistoryTitle: "暂无历史记录",
  emptyHistoryDescription: "当前暂无可展示的历史内容。",
})

const emit = defineEmits<{
  "update:open": [value: boolean]
}>()

const hasSections = computed(() => props.sections.length > 0)
const hasHistory = computed(() => props.historyEntries.length > 0)

function handleOpenChange(open: boolean) {
  emit("update:open", open)
}

function badgeClass(tone: EntityHistoryTone | undefined) {
  if (tone === "info") {
    return "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/45 dark:text-sky-200"
  }

  if (tone === "success") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/45 dark:text-emerald-200"
  }

  if (tone === "warning") {
    return "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/45 dark:text-amber-200"
  }

  if (tone === "danger") {
    return "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/45 dark:text-rose-200"
  }

  return "border border-border/70 bg-muted text-foreground dark:bg-muted/50"
}
</script>

<template>
  <ResponsiveRightSheet
    :open="open"
    :show-primary="false"
    sheet-content-class="flex h-full max-h-full flex-col overflow-hidden sm:max-w-2xl"
    @update:open="handleOpenChange"
  >
    <template #actions>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
        @click="handleOpenChange(false)"
      >
        <i class="ri-arrow-right-double-line text-[16px]" />
        <span class="sr-only">关闭历史详情</span>
      </Button>
    </template>

    <template #title>
      <div class="flex min-w-0 flex-col gap-2">
        <div class="truncate">{{ props.title }}</div>
        <div v-if="props.metaBadges.length" class="flex flex-wrap items-center gap-2">
          <Badge
            v-for="badge in props.metaBadges"
            :key="badge.key"
            variant="secondary"
            :class="cn('rounded-md px-2 py-0.5 text-[12px] font-medium', badgeClass(badge.tone))"
          >
            {{ badge.label }}
          </Badge>
        </div>
      </div>
    </template>

    <template v-if="props.description" #description>
      {{ props.description }}
    </template>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="min-h-0 flex-1 space-y-6 overflow-y-auto pb-6">
        <DetailFieldSections
          v-if="hasSections"
          :sections="props.sections"
          use-title-block
        />

        <Separator v-if="hasSections" class="bg-border/80" />

        <section class="space-y-4">
          <TitleBlock
            variant="section"
            :title="props.historyTitle"
            class="detail-section-inset pt-1 pb-1"
          />

          <div
            v-if="hasHistory"
            class="space-y-4 px-4 pb-1"
          >
            <article
              v-for="(entry, index) in props.historyEntries"
              :key="entry.key"
              class="relative pl-8"
            >
              <div
                v-if="index < props.historyEntries.length - 1"
                class="absolute top-8 left-[11px] bottom-[-1rem] w-px bg-border/80"
              />

              <div
                :class="cn(
                  'absolute top-1.5 left-0 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-xs',
                  entry.isLatest
                    ? 'border-sky-200 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200'
                    : 'border-border/70 text-muted-foreground dark:bg-background',
                )"
              >
                <i :class="entry.isLatest ? 'ri-sparkling-2-line text-[13px]' : 'ri-history-line text-[13px]'" />
              </div>

              <div
                :class="cn(
                  'rounded-2xl border px-4 py-4 shadow-xs transition-colors',
                  entry.isLatest
                    ? 'border-sky-200 bg-sky-50/70 dark:border-sky-900/70 dark:bg-sky-950/25'
                    : 'border-border/70 bg-background dark:bg-card/70',
                )"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="truncate text-sm font-semibold text-foreground">{{ entry.title }}</h3>
                      <Badge
                        v-if="entry.isLatest"
                        variant="secondary"
                        class="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[12px] font-medium text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/45 dark:text-sky-200"
                      >
                        最新结果
                      </Badge>
                    </div>
                    <p class="mt-1 text-xs text-muted-foreground">{{ entry.timestamp }}</p>
                  </div>

                  <Badge
                    v-if="entry.statusLabel"
                    variant="secondary"
                    :class="cn('rounded-md px-2 py-0.5 text-[12px] font-medium', badgeClass(entry.statusTone))"
                  >
                    {{ entry.statusLabel }}
                  </Badge>
                </div>

                <p
                  v-if="entry.summary"
                  class="mt-3 text-sm leading-6 text-foreground"
                >
                  {{ entry.summary }}
                </p>

                <div
                  v-if="entry.fields?.length"
                  class="mt-4 grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2"
                >
                  <div
                    v-for="field in entry.fields"
                    :key="field.key"
                    class="min-w-0"
                  >
                    <p class="text-xs text-muted-foreground">{{ field.label }}</p>
                    <p class="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                      {{ field.value }}
                    </p>
                  </div>
                </div>

                <div
                  v-if="entry.images?.length"
                  class="mt-4 border-t border-border/70 pt-4"
                >
                  <p class="text-xs text-muted-foreground">现场照片</p>
                  <div class="mt-3 grid grid-cols-2 gap-3">
                    <div
                      v-for="image in entry.images"
                      :key="image.key"
                      class="overflow-hidden rounded-xl border border-border/70 bg-muted/35"
                    >
                      <img
                        :src="image.src"
                        :alt="image.alt ?? entry.title"
                        class="h-28 w-full object-cover"
                      >
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="px-4 pb-2">
            <Empty class="w-full border border-dashed border-border/80 bg-muted/25 p-6 shadow-none">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <i class="ri-history-line text-[18px]" />
                </EmptyMedia>
                <EmptyTitle>{{ props.emptyHistoryTitle }}</EmptyTitle>
                <EmptyDescription>{{ props.emptyHistoryDescription }}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </section>
      </div>
    </div>
  </ResponsiveRightSheet>
</template>
