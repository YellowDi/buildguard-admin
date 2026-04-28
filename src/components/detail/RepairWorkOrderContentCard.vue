<script setup lang="ts">
import { computed } from "vue"

import TitleBlock from "@/components/layout/TitleBlock.vue"
import MediaLightbox from "@/components/media/MediaLightbox.vue"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
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
const hasRepairRecords = computed(() => Boolean(toText(props.workOrder?.RepairContent) || mediaGroups.value.length))
const recordCount = computed(() => (toText(props.workOrder?.RepairContent) ? 1 : 0) + mediaCount.value)

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
            <Badge
              variant="secondary"
              class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
            >
              {{ recordCount }}
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

        <div v-else class="detail-group-stack pb-2">
          <section v-if="toText(props.workOrder?.RepairContent)">
            <div class="detail-group-divider-row detail-section-inset flex min-w-0 items-center gap-3">
              <div class="min-w-0 truncate text-[14px] font-medium text-muted-foreground">文字记录</div>
              <div class="h-px min-w-0 flex-1 bg-border/80" />
            </div>

            <div class="detail-field-row detail-field-row--top-aligned group">
              <div class="detail-field-row__label">维修内容</div>
              <div class="detail-field-row__value whitespace-pre-wrap break-words leading-6">
                {{ toText(props.workOrder?.RepairContent) }}
              </div>
            </div>
          </section>

          <Separator v-if="toText(props.workOrder?.RepairContent) && mediaGroups.length" class="bg-border/80" />

          <section v-if="mediaGroups.length">
            <div class="detail-group-divider-row detail-section-inset flex min-w-0 items-center gap-3">
              <div class="min-w-0 truncate text-[14px] font-medium text-muted-foreground">图片与视频</div>
              <div class="h-px min-w-0 flex-1 bg-border/80" />
              <Badge variant="secondary" class="rounded-md px-1.5 py-0.5 text-[12px]">{{ mediaCount }}</Badge>
            </div>

            <MediaLightbox v-slot="{ open: openMediaLightbox }">
              <div class="space-y-4">
                <template
                  v-for="(group, groupIndex) in mediaGroups"
                  :key="group.key"
                >
                  <Separator v-if="groupIndex > 0" class="bg-border/80" />
                  <div class="detail-section-inset space-y-2">
                    <div class="flex min-w-0 items-center justify-between gap-3">
                      <div class="min-w-0">
                        <div class="truncate text-[13px] font-medium text-foreground">{{ group.title }}</div>
                        <div class="truncate text-[12px] text-muted-foreground">{{ group.description }}</div>
                      </div>
                      <div class="shrink-0 text-[12px] tabular-nums text-muted-foreground">{{ group.files.length }} 个</div>
                    </div>

                    <div class="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
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
                  </div>
                </template>
              </div>
            </MediaLightbox>
          </section>

          <div
            v-if="!hasRepairRecords"
            class="flex min-h-[min(160px,30vh)] w-full min-w-0 flex-col items-center justify-center px-4 py-12"
          >
            <Empty class="w-full max-w-md flex-none border-0 bg-transparent p-6! shadow-none md:p-8!">
              <EmptyHeader class="max-w-md">
                <EmptyMedia variant="icon">
                  <i class="ri-inbox-line text-[18px]" />
                </EmptyMedia>
                <EmptyTitle>暂无维修记录</EmptyTitle>
                <EmptyDescription>当前工单没有返回维修内容、维修前或维修后附件。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
