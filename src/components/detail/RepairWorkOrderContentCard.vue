<script setup lang="ts">
import { computed } from "vue"

import TitleBlock from "@/components/layout/TitleBlock.vue"
import MediaLightbox from "@/components/media/MediaLightbox.vue"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { RepairWorkOrderDetailResult, WorkOrderFile } from "@/lib/work-orders-api"

type RepairMediaGroup = {
  key: "before" | "after"
  title: string
  description: string
  files: WorkOrderFile[]
}

const props = withDefaults(defineProps<{
  workOrder: RepairWorkOrderDetailResult | null
  title?: string
}>(), {
  title: "维修记录",
})

const mediaGroups = computed<RepairMediaGroup[]>(() => {
  if (!props.workOrder) {
    return []
  }

  return [
    {
      key: "before",
      title: "维修前",
      description: "维修处理前记录",
      files: normalizeFiles(props.workOrder.BeforeRepairFile),
    },
    {
      key: "after",
      title: "维修后",
      description: "维修处理后记录",
      files: normalizeFiles(props.workOrder.AfterRepairFile),
    },
  ]
})
const hasContent = computed(() => Boolean(props.workOrder))
const repairContentText = computed(() => toText(props.workOrder?.RepairContent))

function normalizeFiles(value: unknown) {
  return Array.isArray(value)
    ? value.filter((file): file is WorkOrderFile => Boolean(file && typeof file === "object" && toText((file as WorkOrderFile).Url)))
    : []
}

function isVideo(file: WorkOrderFile) {
  const url = toText(file.Url)
  return toNumber(file.Type) === 2 || /\.(mp4|mov|m4v|webm|ogg)(\?|#|$)/i.test(url)
}

function buildMediaItem(file: WorkOrderFile, group: RepairMediaGroup, index: number) {
  return {
    key: `${group.key}-${index}-${toText(file.Url)}`,
    src: toText(file.Url),
    type: isVideo(file) ? "video" as const : "image" as const,
    alt: `${group.title}附件 ${index + 1}`,
  }
}

function mediaGroupIcon(group: RepairMediaGroup) {
  return group.key === "before" ? "ri-camera-line" : "ri-checkbox-circle-line"
}

function mediaGroupIconClass(group: RepairMediaGroup) {
  return group.key === "before"
    ? "bg-warning-surface text-warning ring-warning/15"
    : "bg-success-surface text-success ring-success/15"
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
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
  <section class="detail-relation-module w-full min-w-0 max-w-full">
    <div class="detail-table-scroll">
      <div class="detail-table-frame detail-relation-frame">
        <TitleBlock
          variant="section"
          :title="props.title"
          class="detail-section-inset pt-4 pb-1"
        />

        <div
          v-if="!hasContent"
          class="flex min-h-[min(160px,30vh)] w-full min-w-0 flex-col items-center justify-center px-4 py-12"
        >
          <Empty class="w-full max-w-md flex-none border-0 bg-transparent p-6! shadow-none md:p-8!">
            <EmptyHeader class="max-w-md">
              <EmptyMedia variant="icon">
                <i class="ri-tools-line text-[18px]" />
              </EmptyMedia>
              <EmptyTitle>暂无维修记录</EmptyTitle>
              <EmptyDescription>当前工单还没有可展示的维修记录。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>

        <div v-else class="detail-section-inset space-y-4 pb-4 pt-2">
          <article class="rounded-[8px] bg-card-background p-3">
            <div class="mb-2 flex min-w-0 items-center gap-2">
              <div class="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-background text-muted-foreground shadow-(--shadow-border)">
                <i class="ri-file-text-line text-[16px]" />
              </div>
              <div class="truncate text-[14px] font-semibold text-foreground">维修内容</div>
            </div>
            <div
              :class="[
                'whitespace-pre-wrap break-words text-pretty text-[14px] leading-6',
                repairContentText ? 'text-foreground' : 'text-muted-foreground',
              ]"
            >
              {{ repairContentText || "暂无维修内容" }}
            </div>
          </article>

          <MediaLightbox v-slot="{ open: openMediaLightbox }">
            <article
              v-for="group in mediaGroups"
              :key="group.key"
              class="min-w-0 rounded-[8px] bg-card-background p-3"
            >
              <div class="mb-3 flex min-w-0 items-center gap-2.5">
                <div
                  :class="[
                    'flex size-8 shrink-0 items-center justify-center rounded-[8px] ring-1',
                    mediaGroupIconClass(group),
                  ]"
                >
                  <i :class="[mediaGroupIcon(group), 'text-[16px]']" />
                </div>
                <div class="min-w-0">
                  <div class="truncate text-[14px] font-semibold text-foreground">{{ group.title }}</div>
                  <div class="truncate text-[12px] text-muted-foreground">{{ group.description }}</div>
                </div>
              </div>

              <div
                v-if="!group.files.length"
                class="flex min-h-20 items-center rounded-[6px] bg-background/60 px-3 py-4 text-[13px] text-muted-foreground shadow-(--shadow-border)"
              >
                暂无{{ group.title }}附件
              </div>

              <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
                <button
                  v-for="(file, index) in group.files"
                  :key="`${group.key}-${index}-${file.Url}`"
                  type="button"
                  class="group relative aspect-[4/3] min-h-10 overflow-hidden rounded-[4px] bg-muted text-left outline outline-1 -outline-offset-1 outline-black/10 transition-transform duration-180 ease-out hover:scale-[1.01] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#097fe8]/50"
                  :aria-label="`预览${isVideo(file) ? '视频' : '图片'}：${group.title}附件 ${index + 1}`"
                  @click="openMediaLightbox(buildMediaItem(file, group, index), `${group.title}附件`, $event)"
                >
                  <video
                    v-if="isVideo(file)"
                    :src="file.Url"
                    preload="metadata"
                    playsinline
                    muted
                    class="h-full w-full bg-black object-cover"
                  />
                  <img
                    v-else
                    :src="file.Url"
                    :alt="`${group.title}附件 ${index + 1}`"
                    class="h-full w-full object-cover"
                  >
                  <span
                    v-if="isVideo(file)"
                    class="pointer-events-none absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-transform duration-200 ease-out group-hover:scale-105"
                  >
                    <i class="ri-play-fill translate-x-px text-[20px]" />
                  </span>
                </button>
              </div>
            </article>
          </MediaLightbox>
        </div>
      </div>
    </div>
  </section>
</template>
