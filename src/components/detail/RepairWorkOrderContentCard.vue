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
const reviewVideoFiles = computed(() => normalizeFiles(props.workOrder?.ReviewVideoFile).filter(isVideo))

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

function buildReviewVideoItem(file: WorkOrderFile, index: number) {
  return {
    key: `review-${index}-${toText(file.Url)}`,
    src: toText(file.Url),
    type: "video" as const,
    alt: reviewVideoTitle(file, index),
  }
}

function reviewVideoTitle(file: WorkOrderFile, index: number) {
  return toText(file.Title, toText(file.title, `复核视频 ${index + 1}`))
}

function reviewVideoDescription(file: WorkOrderFile) {
  return toText(file.Abstract, toText(file.abstract, toText(file.CreatedAt, toText(file.createdAt))))
}

function mediaGroupEmptyDescription(group: RepairMediaGroup) {
  return group.key === "before"
    ? "维修处理前的图片或视频会展示在这里。"
    : "维修处理后的图片或视频会展示在这里。"
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
          class="detail-section-inset pt-4 pb-3"
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

        <div v-else class="detail-group-stack space-y-4 pb-2">
          <article class="overflow-hidden rounded-[20px] border border-border/60 bg-card-background text-foreground">
            <div class="rounded-[16px] bg-card px-4 py-3.5 shadow-(--shadow-border)">
              <div class="mb-2.5 flex min-w-0 items-center gap-2.5">
                <div class="flex size-7 shrink-0 items-center justify-center rounded-[10px] bg-background text-muted-foreground shadow-(--shadow-border)">
                  <i class="ri-file-text-line text-[15px]" />
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
            </div>
          </article>

          <MediaLightbox v-slot="{ open: openMediaLightbox }">
            <article
              v-for="group in mediaGroups"
              :key="group.key"
              class="min-w-0 overflow-hidden rounded-[20px] border border-border/60 bg-card-background text-foreground"
            >
              <div class="rounded-[16px] bg-card px-4 py-3 shadow-(--shadow-border)">
                <div class="flex min-w-0 items-center gap-2.5">
                  <div
                    :class="[
                      'flex size-7 shrink-0 items-center justify-center rounded-[10px] ring-1',
                      mediaGroupIconClass(group),
                    ]"
                  >
                    <i :class="[mediaGroupIcon(group), 'text-[15px]']" />
                  </div>
                  <div class="min-w-0">
                    <div class="truncate text-[14px] font-semibold text-foreground">{{ group.title }}</div>
                    <div class="truncate text-[12px] text-muted-foreground">{{ group.description }}</div>
                  </div>
                </div>
              </div>

              <div class="px-4 pb-4 pt-3">
                <Empty
                  v-if="!group.files.length"
                  class="min-h-24 w-full rounded-[14px] border border-dashed border-border/80 bg-card p-5! shadow-none md:p-5!"
                >
                  <EmptyHeader class="max-w-none gap-1.5">
                    <EmptyMedia
                      variant="icon"
                      class="mb-1 size-9 rounded-[10px] bg-muted/70 text-muted-foreground"
                    >
                      <i :class="[mediaGroupIcon(group), 'text-[17px]']" />
                    </EmptyMedia>
                    <EmptyTitle class="text-[13px] font-semibold leading-5 tracking-normal">
                      暂无{{ group.title }}附件
                    </EmptyTitle>
                    <EmptyDescription class="text-[12px] leading-5">
                      {{ mediaGroupEmptyDescription(group) }}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>

                <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2.5">
                  <button
                    v-for="(file, index) in group.files"
                    :key="`${group.key}-${index}-${file.Url}`"
                    type="button"
                    class="group relative aspect-[4/3] min-h-10 overflow-hidden rounded-[10px] bg-muted text-left outline outline-1 -outline-offset-1 outline-black/10 transition-transform duration-180 ease-out hover:scale-[1.01] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#097fe8]/50"
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
              </div>
            </article>

            <article class="min-w-0 overflow-hidden rounded-[20px] border border-border/60 bg-card-background text-foreground">
              <div class="rounded-[16px] bg-card px-4 py-3 shadow-(--shadow-border)">
                <div class="flex min-w-0 items-center gap-2.5">
                  <div class="flex size-7 shrink-0 items-center justify-center rounded-[10px] bg-[#eef6ff] text-[#097fe8] ring-1 ring-[#097fe8]/15">
                    <i class="ri-movie-line text-[15px]" />
                  </div>
                  <div class="min-w-0">
                    <div class="truncate text-[14px] font-semibold text-foreground">复核视频</div>
                    <div class="truncate text-[12px] text-muted-foreground">复核通过后的视频记录</div>
                  </div>
                </div>
              </div>

              <div class="px-4 pb-4 pt-3">
                <Empty
                  v-if="!reviewVideoFiles.length"
                  class="min-h-24 w-full rounded-[14px] border border-dashed border-border/80 bg-card p-5! shadow-none md:p-5!"
                >
                  <EmptyHeader class="max-w-none gap-1.5">
                    <EmptyMedia
                      variant="icon"
                      class="mb-1 size-9 rounded-[10px] bg-muted/70 text-muted-foreground"
                    >
                      <i class="ri-movie-line text-[17px]" />
                    </EmptyMedia>
                    <EmptyTitle class="text-[13px] font-semibold leading-5 tracking-normal">
                      暂无复核视频
                    </EmptyTitle>
                    <EmptyDescription class="text-[12px] leading-5">
                      复核通过后的视频记录会展示在这里。
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>

                <div v-else class="grid gap-2.5 sm:grid-cols-2">
                  <button
                    v-for="(file, index) in reviewVideoFiles"
                    :key="`review-${index}-${file.Url}`"
                    type="button"
                    class="group flex min-w-0 items-stretch gap-3 rounded-[14px] bg-card p-2 text-left shadow-(--shadow-border) outline-none transition-transform duration-180 ease-out hover:scale-[1.005] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[#097fe8]/50"
                    :aria-label="`预览视频：${reviewVideoTitle(file, index)}`"
                    @click="openMediaLightbox(buildReviewVideoItem(file, index), '复核视频', $event)"
                  >
                    <span class="relative aspect-video w-[112px] shrink-0 overflow-hidden rounded-[10px] bg-black">
                      <video
                        :src="file.Url"
                        preload="metadata"
                        playsinline
                        muted
                        class="h-full w-full object-cover"
                      />
                      <span class="pointer-events-none absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-transform duration-200 ease-out group-hover:scale-105">
                        <i class="ri-play-fill translate-x-px text-[20px]" />
                      </span>
                    </span>
                    <span class="flex min-w-0 flex-1 flex-col justify-center py-1">
                      <span class="truncate text-[13px] font-medium text-foreground">
                        {{ reviewVideoTitle(file, index) }}
                      </span>
                      <span
                        v-if="reviewVideoDescription(file)"
                        class="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground"
                      >
                        {{ reviewVideoDescription(file) }}
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            </article>
          </MediaLightbox>
        </div>
      </div>
    </div>
  </section>
</template>
