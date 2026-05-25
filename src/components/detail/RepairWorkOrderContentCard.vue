<script setup lang="ts">
import { computed } from "vue"

import TitleBlock from "@/components/layout/TitleBlock.vue"
import MediaLightbox from "@/components/media/MediaLightbox.vue"
import { Badge } from "@/components/ui/badge"
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

  const groups: RepairMediaGroup[] = [
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

  return groups.filter(group => group.files.length > 0)
})
const mediaCount = computed(() => mediaGroups.value.reduce((total, group) => total + group.files.length, 0))
const hasContent = computed(() => Boolean(props.workOrder))
const repairContentText = computed(() => toText(props.workOrder?.RepairContent))
const hasRepairRecords = computed(() => Boolean(repairContentText.value || mediaGroups.value.length))
const resultStateText = computed(() => hasRepairRecords.value ? "有维修结果" : "待补充结果")

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
        >
          <template #append>
            <Badge variant="secondary" class="rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none">
              {{ resultStateText }}
            </Badge>
          </template>
        </TitleBlock>

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
          <section class="rounded-[8px] bg-card p-3 shadow-(--shadow-border)">
            <div class="flex min-w-0 items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2.5">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-success-surface text-success ring-1 ring-success/15">
                  <i class="ri-file-check-line text-[17px]" />
                </div>
                <div class="min-w-0">
                  <div class="truncate text-[15px] font-semibold text-foreground">维修结果</div>
                  <div class="truncate text-[12px] text-muted-foreground">
                    {{ mediaCount ? `${mediaCount} 个过程附件` : "暂无过程附件" }}
                  </div>
                </div>
              </div>
              <Badge v-if="hasRepairRecords" variant="secondary" class="shrink-0 rounded-md px-1.5 py-0.5 text-[12px]">
                已记录
              </Badge>
            </div>

            <div
              v-if="!hasRepairRecords"
              class="mt-4 flex min-h-[140px] w-full min-w-0 flex-col items-center justify-center rounded-[6px] bg-surface-secondary px-4 py-8"
            >
              <Empty class="w-full max-w-md flex-none border-0 bg-transparent p-0! shadow-none">
                <EmptyHeader class="max-w-md">
                  <EmptyMedia variant="icon">
                    <i class="ri-inbox-line text-[18px]" />
                  </EmptyMedia>
                  <EmptyTitle>暂无维修结果</EmptyTitle>
                  <EmptyDescription>当前工单没有返回维修内容、维修前或维修后附件。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>

            <template v-else>
              <div
                v-if="repairContentText"
                class="mt-4 rounded-[6px] bg-surface-secondary px-3 py-3 text-[14px] leading-6 text-foreground shadow-(--shadow-border)"
              >
                <div class="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                  <i class="ri-file-text-line text-[14px]" />
                  <span>维修内容</span>
                </div>
                <div class="whitespace-pre-wrap break-words text-pretty">
                  {{ repairContentText }}
                </div>
              </div>

              <MediaLightbox v-if="mediaGroups.length" v-slot="{ open: openMediaLightbox }">
                <div
                  :class="[
                    'mt-4 grid gap-3',
                    mediaGroups.length > 1 ? 'md:grid-cols-2' : '',
                  ]"
                >
                  <article
                    v-for="group in mediaGroups"
                    :key="group.key"
                    class="min-w-0 rounded-[8px] bg-surface-secondary p-3 shadow-(--shadow-border)"
                  >
                    <div class="flex min-w-0 items-start justify-between gap-3">
                      <div class="flex min-w-0 items-center gap-2.5">
                        <div
                          :class="[
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ring-1',
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
                      <Badge variant="secondary" class="shrink-0 rounded-md px-1.5 py-0.5 text-[12px] tabular-nums">
                        {{ group.files.length }} 个
                      </Badge>
                    </div>

                    <div class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
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
                          class="pointer-events-none absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-transform duration-200 ease-out group-hover:scale-105"
                        >
                          <i class="ri-play-fill translate-x-px text-[20px]" />
                        </span>
                      </button>
                    </div>
                  </article>
                </div>
              </MediaLightbox>
            </template>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>
