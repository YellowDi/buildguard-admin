<script setup lang="ts">
import { computed } from "vue"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailFieldSection, EntityHistoryMetaBadge, EntityHistoryTone, HistoryEntry } from "@/components/detail/types"
import TitleBlock from "@/components/layout/TitleBlock.vue"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import MediaLightbox from "@/components/media/MediaLightbox.vue"
import { Separator } from "@/components/ui/separator"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import { StatusBadge } from "@/components/ui/status-badge"
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
const defaultHistoryEntryKeys = computed(() => {
  const defaultKey = props.historyEntries.find(entry => entry.isLatest)?.key ?? props.historyEntries[0]?.key

  return defaultKey ? [defaultKey] : []
})

const metaFieldLabels = new Set(["检测人", "扣分", "实测值"])

function handleOpenChange(open: boolean) {
  emit("update:open", open)
}

function badgeClass(tone: EntityHistoryTone | undefined) {
  if (tone === "info") {
    return "border border-black/5 bg-[#f2f9ff] text-[#097fe8] dark:border-white/10 dark:bg-[#1a2a3a] dark:text-[#5aacf5]"
  }

  if (tone === "success") {
    return "border border-transparent bg-[rgba(42,157,153,0.1)] text-[#2a9d99] dark:bg-[rgba(61,189,185,0.15)] dark:text-[#3dbdb9]"
  }

  if (tone === "warning") {
    return "border border-transparent bg-[rgba(221,91,0,0.1)] text-[#dd5b00] dark:bg-[rgba(240,112,32,0.15)] dark:text-[#f07020]"
  }

  if (tone === "danger") {
    return "border border-transparent bg-[rgba(201,64,121,0.1)] text-[#c94079] dark:bg-[rgba(255,128,213,0.15)] dark:text-[#ff80d5]"
  }

  return "border border-black/5 bg-white text-[#615d59] dark:border-white/10 dark:bg-[#232323] dark:text-[#a8a5a0]"
}

function splitEntryFields(entry: HistoryEntry) {
  const fields = entry.fields ?? []

  return {
    meta: fields.filter(field => metaFieldLabels.has(field.label) && field.value.trim().length <= 24),
    detail: fields.filter(field => !metaFieldLabels.has(field.label) || field.value.trim().length > 24),
  }
}

function isVideoMedia(image: NonNullable<HistoryEntry["images"]>[number]) {
  return image.type === "video"
}

function resolveEntryStatusBadgeTone(entry: HistoryEntry) {
  if (entry.statusLabel === "正常") {
    return "green"
  }

  if (entry.statusLabel === "重点关注" || entry.statusTone === "warning") {
    return "orange"
  }

  if (entry.statusLabel === "高风险" || entry.statusTone === "danger") {
    return "red"
  }

  if (entry.statusTone === "info") {
    return "blue"
  }

  return "gray"
}

function resolveEntryStatusBadgeIcon(entry: HistoryEntry) {
  if (entry.statusLabel === "正常") {
    return "check"
  }

  if (entry.statusLabel === "重点关注") {
    return "clock"
  }

  if (entry.statusLabel === "高风险") {
    return "alert"
  }

  if (entry.statusTone === "danger") {
    return "alert"
  }

  if (entry.statusTone === "warning") {
    return "clock"
  }

  if (entry.statusTone === "info") {
    return "minus"
  }

  return "dot"
}
</script>

<template>
  <ResponsiveRightSheet
    :open="open"
    :show-primary="false"
    sheet-content-class="flex min-h-0 flex-col overflow-hidden sm:max-w-2xl"
    @update:open="handleOpenChange"
  >
    <template #actions>
      <div class="right-sheet-actions">
        <div class="right-sheet-actions__primary">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            class="right-sheet-icon-button"
            @click="handleOpenChange(false)"
          >
            <i class="ri-close-line text-base" />
            <span class="sr-only">关闭历史详情</span>
          </Button>
        </div>
        <div class="right-sheet-actions__secondary" />
      </div>
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
      <div class="min-h-0 flex-1 overflow-y-auto pb-6">
        <DetailFieldSections
          v-if="hasSections"
          :sections="props.sections"
          use-title-block
        />

        <Separator v-if="hasSections" class="bg-border/80" />

        <section class="detail-accordion-module min-w-0">
          <TitleBlock
            variant="section"
            :title="props.historyTitle"
            :sticky="true"
            sticky-top="var(--detail-layout-sticky-offset, 0px)"
            class="detail-section-inset pt-4 pb-1"
          />

          <Accordion
            v-if="hasHistory"
            :key="defaultHistoryEntryKeys.join('-') || 'history-entries'"
            type="multiple"
            :default-value="defaultHistoryEntryKeys"
            class="w-full"
          >
            <AccordionItem
              v-for="(entry, index) in props.historyEntries"
              :key="entry.key"
              :value="entry.key"
              class="border-b-0"
            >
              <div class="detail-section-inset py-1.5">
                <AccordionTrigger class="px-0 py-3 text-left hover:no-underline [&>svg]:self-center [&>svg]:text-muted-foreground">
                  <div class="min-w-0 flex-1 pr-4">
                    <div class="flex min-w-0 items-center justify-between gap-3">
                      <div class="min-w-0 flex items-center gap-2 overflow-hidden">
                        <StatusBadge
                          v-if="entry.statusLabel"
                          :label="entry.statusLabel"
                          :tone="resolveEntryStatusBadgeTone(entry)"
                          :icon="resolveEntryStatusBadgeIcon(entry)"
                          class="shrink-0"
                        />
                        <h3 class="min-w-0 truncate text-[16px] font-semibold tracking-[-0.15px] text-[rgba(0,0,0,0.95)] dark:text-[rgba(255,255,255,0.92)]">
                          {{ entry.title }}
                        </h3>
                      </div>

                      <Badge
                        v-if="entry.isLatest"
                        variant="secondary"
                        class="shrink-0 rounded-full border border-black/5 bg-[#f2f9ff] px-2 py-0.5 text-[12px] font-semibold tracking-[0.125px] text-[#097fe8] dark:border-white/10 dark:bg-[#1a2a3a] dark:text-[#5aacf5]"
                      >
                        最新结果
                      </Badge>
                    </div>

                    <p
                      v-if="entry.summary"
                      class="mt-2 line-clamp-2 text-[14px] leading-6 text-[rgba(0,0,0,0.72)] dark:text-[rgba(255,255,255,0.72)]"
                    >
                      {{ entry.summary }}
                    </p>
                  </div>
                </AccordionTrigger>

                <AccordionContent class="px-0">
                  <div class="pt-0.5">
                    <p
                      v-if="entry.summary"
                      class="text-[15px] leading-7 text-[rgba(0,0,0,0.9)] dark:text-[rgba(255,255,255,0.9)]"
                    >
                      {{ entry.summary }}
                    </p>

                    <div
                      v-if="splitEntryFields(entry).detail.length"
                      class="mt-3 space-y-3"
                    >
                      <div
                        v-for="field in splitEntryFields(entry).detail"
                        :key="field.key"
                        class="rounded-[8px] border border-black/[0.08] bg-[#f6f5f4]/85 px-3 py-2.5 dark:border-white/10 dark:bg-[#1e1e1e]"
                      >
                        <p class="text-[12px] font-medium tracking-[0.125px] text-[#a39e98] dark:text-[#6b6763]">
                          {{ field.label }}
                        </p>
                        <p class="mt-1 whitespace-pre-wrap break-words text-[14px] leading-6 text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.88)]">
                          {{ field.value }}
                        </p>
                      </div>
                    </div>

                    <div
                      v-if="entry.images?.length"
                      class="mt-5"
                    >
                      <p class="text-[12px] font-medium tracking-[0.125px] text-[#a39e98] dark:text-[#6b6763]">
                        现场附件
                      </p>
                      <MediaLightbox v-slot="{ open: openMediaLightbox }">
                        <div
                          class="mt-3 columns-1 gap-3 sm:columns-2"
                        >
                          <button
                            v-for="image in entry.images"
                            :key="image.key"
                            type="button"
                            class="border-overlay group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-[12px] bg-[#f6f5f4] text-left shadow-[0_4px_18px_rgba(0,0,0,0.04),0_2.025px_7.85px_rgba(0,0,0,0.027),0_0.8px_2.93px_rgba(0,0,0,0.02),0_0.175px_1.04px_rgba(0,0,0,0.01)] transition-transform duration-180 ease-out hover:scale-[1.01] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#097fe8]/50 dark:bg-[#1e1e1e] dark:shadow-[0_4px_18px_rgba(0,0,0,0.2),0_2.025px_7.85px_rgba(0,0,0,0.15),0_0.8px_2.93px_rgba(0,0,0,0.1),0_0.175px_1.04px_rgba(0,0,0,0.08)]"
                            :aria-label="`预览${isVideoMedia(image) ? '视频' : '图片'}：${image.alt ?? entry.title}`"
                            @click="openMediaLightbox(image, entry.title, $event)"
                          >
                            <video
                              v-if="isVideoMedia(image)"
                              :src="image.src"
                              preload="metadata"
                              playsinline
                              muted
                              class="block h-auto w-full bg-black"
                            />
                            <img
                              v-else
                              :src="image.src"
                              :alt="image.alt ?? entry.title"
                              class="block h-auto w-full"
                            >
                            <span
                              v-if="isVideoMedia(image)"
                              class="pointer-events-none absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-sm transition-[opacity,transform,filter] duration-200 ease-out group-hover:scale-105"
                            >
                              <i class="ri-play-fill translate-x-px text-[24px]" />
                            </span>
                          </button>
                        </div>
                      </MediaLightbox>
                    </div>
                  </div>
                </AccordionContent>
              </div>

              <div
                v-if="index < props.historyEntries.length - 1"
                class="detail-section-inset"
              >
                <div class="w-full border-b border-dashed border-border/80" />
              </div>
            </AccordionItem>
          </Accordion>

          <div v-else class="flex min-h-[min(160px,30vh)] w-full min-w-0 flex-col items-center justify-center px-0 py-4">
            <Empty class="w-full border border-dashed border-black/10 bg-white/70 p-6 shadow-none dark:border-white/10 dark:bg-[#191919]">
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
