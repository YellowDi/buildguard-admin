<script setup lang="ts">
import { computed } from "vue"

import DetailFieldSections from "@/components/detail/DetailFieldSections.vue"
import type { DetailFieldSection } from "@/components/detail/types"
import TitleBlock from "@/components/layout/TitleBlock.vue"
import MediaLightbox from "@/components/media/MediaLightbox.vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ResponsiveRightSheet } from "@/components/ui/sheet"
import type { RepairWorkOrderDetailResult, WorkOrderFile } from "@/lib/work-orders-api"

const props = defineProps<{
  open: boolean
  workOrder: RepairWorkOrderDetailResult | null
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
}>()

const sections = computed<DetailFieldSection[]>(() => {
  if (!props.workOrder) {
    return []
  }

  return [
    {
      key: "repair-media-basic",
      title: "报修信息",
      rows: [
        { key: "title", label: "报修标题", value: toText(props.workOrder.Title, "-") },
        {
          key: "content",
          label: "报修内容",
          value: toText(props.workOrder.Content, "-"),
          truncate: false,
          valueClass: "leading-6 whitespace-pre-wrap break-words",
        },
        {
          key: "repair-content",
          label: "维修内容",
          value: toText(props.workOrder.RepairContent, "-"),
          truncate: false,
          valueClass: "leading-6 whitespace-pre-wrap break-words",
        },
      ],
    },
  ]
})

const beforeFiles = computed(() => normalizeFiles(props.workOrder?.BeforeRepairFile))
const afterFiles = computed(() => normalizeFiles(props.workOrder?.AfterRepairFile))
const mediaCount = computed(() => beforeFiles.value.length + afterFiles.value.length)
const sheetTitle = computed(() => toText(props.workOrder?.Title, "维修过程"))
const sheetDescription = computed(() => toText(props.workOrder?.OrderNo, "报修工单"))

function handleOpenChange(open: boolean) {
  emit("update:open", open)
}

function normalizeFiles(files: WorkOrderFile[] | undefined) {
  return Array.isArray(files)
    ? files.filter(file => toText(file.Url))
    : []
}

function isVideo(file: WorkOrderFile) {
  return file.Type === 2 || /\.(mp4|mov|m4v|webm|ogg)(\?|#|$)/i.test(toText(file.Url))
}

function buildMediaItem(file: WorkOrderFile, section: "before" | "after", index: number) {
  const label = section === "before" ? "维修前" : "维修后"

  return {
    key: `${section}-${index}-${toText(file.Url)}`,
    src: toText(file.Url),
    type: isVideo(file) ? "video" as const : "image" as const,
    alt: `${label}附件 ${index + 1}`,
  }
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
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
            <span class="sr-only">关闭维修过程</span>
          </Button>
        </div>
        <div class="right-sheet-actions__secondary" />
      </div>
    </template>

    <template #title>
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate">{{ sheetTitle }}</span>
        <Badge variant="secondary" class="shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-medium">
          {{ mediaCount }}
        </Badge>
      </div>
    </template>

    <template #description>
      {{ sheetDescription }}
    </template>

    <div class="min-h-0 flex-1 overflow-y-auto pb-6">
      <DetailFieldSections
        v-if="sections.length"
        :sections="sections"
        use-title-block
      />

      <section class="detail-accordion-module min-w-0">
        <TitleBlock
          variant="section"
          title="维修过程附件"
          :sticky="true"
          sticky-top="var(--detail-layout-sticky-offset, 0px)"
          class="detail-section-inset pt-4 pb-1"
        />

        <MediaLightbox v-if="mediaCount" v-slot="{ open: openMediaLightbox }">
          <div class="detail-section-inset space-y-5">
            <div v-if="beforeFiles.length" class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-foreground">维修前</h3>
                <Badge variant="secondary" class="rounded-md px-1.5 py-0.5 text-[12px]">{{ beforeFiles.length }}</Badge>
              </div>

              <div class="columns-1 gap-3 sm:columns-2">
                <button
                  v-for="(file, index) in beforeFiles"
                  :key="`before-${index}-${file.Url}`"
                  type="button"
                  class="border-overlay group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-[12px] bg-[#f6f5f4] text-left shadow-[0_4px_18px_rgba(0,0,0,0.04),0_2.025px_7.85px_rgba(0,0,0,0.027),0_0.8px_2.93px_rgba(0,0,0,0.02),0_0.175px_1.04px_rgba(0,0,0,0.01)] transition-transform duration-180 ease-out hover:scale-[1.01] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#097fe8]/50 dark:bg-[#1e1e1e] dark:shadow-[0_4px_18px_rgba(0,0,0,0.2),0_2.025px_7.85px_rgba(0,0,0,0.15),0_0.8px_2.93px_rgba(0,0,0,0.1),0_0.175px_1.04px_rgba(0,0,0,0.08)]"
                  :aria-label="`预览${isVideo(file) ? '视频' : '图片'}：维修前附件 ${index + 1}`"
                  @click="openMediaLightbox(buildMediaItem(file, 'before', index), '维修前附件', $event)"
                >
                  <video
                    v-if="isVideo(file)"
                    :src="file.Url"
                    preload="metadata"
                    playsinline
                    muted
                    class="block h-auto w-full bg-black"
                  />
                  <img
                    v-else
                    :src="file.Url"
                    :alt="`维修前附件 ${index + 1}`"
                    class="block h-auto w-full"
                  >
                  <span
                    v-if="isVideo(file)"
                    class="pointer-events-none absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-sm transition-[opacity,transform,filter] duration-200 ease-out group-hover:scale-105"
                  >
                    <i class="ri-play-fill translate-x-px text-[24px]" />
                  </span>
                </button>
              </div>
            </div>

            <div v-if="afterFiles.length" class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-foreground">维修后</h3>
                <Badge variant="secondary" class="rounded-md px-1.5 py-0.5 text-[12px]">{{ afterFiles.length }}</Badge>
              </div>

              <div class="columns-1 gap-3 sm:columns-2">
                <button
                  v-for="(file, index) in afterFiles"
                  :key="`after-${index}-${file.Url}`"
                  type="button"
                  class="border-overlay group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-[12px] bg-[#f6f5f4] text-left shadow-[0_4px_18px_rgba(0,0,0,0.04),0_2.025px_7.85px_rgba(0,0,0,0.027),0_0.8px_2.93px_rgba(0,0,0,0.02),0_0.175px_1.04px_rgba(0,0,0,0.01)] transition-transform duration-180 ease-out hover:scale-[1.01] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#097fe8]/50 dark:bg-[#1e1e1e] dark:shadow-[0_4px_18px_rgba(0,0,0,0.2),0_2.025px_7.85px_rgba(0,0,0,0.15),0_0.8px_2.93px_rgba(0,0,0,0.1),0_0.175px_1.04px_rgba(0,0,0,0.08)]"
                  :aria-label="`预览${isVideo(file) ? '视频' : '图片'}：维修后附件 ${index + 1}`"
                  @click="openMediaLightbox(buildMediaItem(file, 'after', index), '维修后附件', $event)"
                >
                  <video
                    v-if="isVideo(file)"
                    :src="file.Url"
                    preload="metadata"
                    playsinline
                    muted
                    class="block h-auto w-full bg-black"
                  />
                  <img
                    v-else
                    :src="file.Url"
                    :alt="`维修后附件 ${index + 1}`"
                    class="block h-auto w-full"
                  >
                  <span
                    v-if="isVideo(file)"
                    class="pointer-events-none absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-sm transition-[opacity,transform,filter] duration-200 ease-out group-hover:scale-105"
                  >
                    <i class="ri-play-fill translate-x-px text-[24px]" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </MediaLightbox>

        <div v-else class="detail-section-inset py-4">
          <Empty class="w-full border border-dashed border-black/10 bg-white/70 p-6 shadow-none dark:border-white/10 dark:bg-[#191919]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <i class="ri-image-line text-[18px]" />
              </EmptyMedia>
              <EmptyTitle>暂无维修过程附件</EmptyTitle>
              <EmptyDescription>当前报修工单还没有维修前后图片或视频。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </section>
    </div>
  </ResponsiveRightSheet>
</template>
