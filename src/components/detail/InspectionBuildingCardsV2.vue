<script setup lang="ts">
import { computed, ref, watch } from "vue"

import TitleBlock from "@/components/layout/TitleBlock.vue"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"

type InspectionBuildingStatus = "pending" | "processing" | "completed"

type InspectionBuildingCardV2Item = {
  key: string
  name: string
  categoryName: string
  scoreText: string
  scoreValue: number | null
  onSelect?: () => void
}

type InspectionBuildingCardV2Building = {
  key: string
  buildName: string
  status: InspectionBuildingStatus
  completedCount: number
  totalCount: number
  progressValue: number
  deadlineText: string
  scoreText: string
  items: InspectionBuildingCardV2Item[]
}

const props = withDefaults(defineProps<{
  title?: string
  count?: number
  buildings: InspectionBuildingCardV2Building[]
  emptyTitle?: string
  emptyDescription?: string
}>(), {
  title: "建筑与检测项",
  count: undefined,
  emptyTitle: "暂无建筑检测项",
  emptyDescription: "当前暂无可展示的建筑检测项数据。",
})

const expandedBuildingKey = ref("")

const displayCount = computed(() => props.count ?? props.buildings.length)

watch(() => props.buildings, (buildings) => {
  if (!buildings.length) {
    expandedBuildingKey.value = ""
    return
  }

  if (!buildings.some(building => building.key === expandedBuildingKey.value)) {
    expandedBuildingKey.value = ""
  }
}, { immediate: true })

function toggleBuilding(buildingKey: string) {
  expandedBuildingKey.value = expandedBuildingKey.value === buildingKey ? "" : buildingKey
}

function isExpanded(buildingKey: string) {
  return expandedBuildingKey.value === buildingKey
}

function resolveStatusIcon(status: InspectionBuildingStatus) {
  if (status === "completed") {
    return "ri-checkbox-circle-fill"
  }

  if (status === "processing") {
    return "ri-loader-4-line"
  }

  return "ri-time-line"
}

function resolveScoreTone(scoreValue: number | null) {
  if (scoreValue === null) {
    return "text-[#202126]"
  }

  if (scoreValue > 0) {
    return "text-[#1f2937]"
  }

  return "text-[#9aa0a7]"
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
        >
          <template #append>
            <Badge
              variant="secondary"
              class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
            >
              {{ displayCount }}
            </Badge>
          </template>
        </TitleBlock>

        <div
          v-if="props.buildings.length === 0"
          class="flex min-h-[min(160px,30vh)] w-full min-w-0 flex-col items-center justify-center px-4 py-12"
        >
          <Empty class="w-full max-w-md flex-none border-0 bg-transparent p-6! shadow-none md:p-8!">
            <EmptyHeader class="max-w-md">
              <EmptyMedia variant="icon">
                <i class="ri-building-line text-[18px]" />
              </EmptyMedia>
              <EmptyTitle>{{ props.emptyTitle }}</EmptyTitle>
              <EmptyDescription>{{ props.emptyDescription }}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>

        <div v-else class="detail-group-stack space-y-4 pb-2">
          <article
            v-for="building in props.buildings"
            :key="building.key"
            class="overflow-hidden rounded-[20px] border border-black/4.5 bg-[#faf9f7] text-[#202126]"
          >
            <button
              type="button"
              class="block w-full rounded-[16px] bg-white px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(17,24,39,0.04),0_5px_10px_rgba(17,24,39,0.05)] transition-shadow duration-180 ease-out"
              :aria-expanded="isExpanded(building.key)"
              @click="toggleBuilding(building.key)"
            >
              <div class="flex min-w-0 items-start gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex min-w-0 items-center gap-2.5">
                    <i
                      :class="[
                        resolveStatusIcon(building.status),
                        building.status === 'processing' ? 'animate-spin' : '',
                        'shrink-0 text-[15px] text-[#8f949c]',
                      ]"
                    />
                    <div class="truncate whitespace-nowrap text-[18px] font-semibold tracking-[-0.025em] text-[#17181c]">
                      {{ building.buildName }}
                    </div>
                  </div>

                  <Progress
                    :model-value="building.progressValue"
                    class="mt-3.5 h-[6px] rounded-full bg-[#ebecef] **:data-[slot=progress-indicator]:bg-[#1d1d20]"
                  />

                  <div class="mt-3 flex min-w-0 items-center justify-between gap-3 whitespace-nowrap text-[12px] text-[#a0a4ac]">
                    <div class="min-w-0 truncate tabular-nums">
                      <span class="text-[#2b2d33]">{{ building.completedCount }}</span>
                      <span> 已完成 / </span>
                      <span>{{ building.totalCount }}</span>
                      <span> 总检测项</span>
                    </div>
                    <div class="shrink-0 truncate tabular-nums text-right">
                      {{ building.deadlineText }}
                    </div>
                  </div>
                </div>
              </div>
            </button>

            <Transition
              enter-active-class="transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
              enter-from-class="translate-y-1 opacity-0"
              enter-to-class="translate-y-0 opacity-100"
              leave-active-class="transition-[opacity,transform] duration-150 ease-in"
              leave-from-class="translate-y-0 opacity-100"
              leave-to-class="translate-y-1 opacity-0"
            >
              <div
                v-if="isExpanded(building.key)"
                class="bg-transparent pb-0 pt-3"
              >
                <div
                  v-if="building.items.length === 0"
                  class="px-4 py-1 text-sm text-[#8f949c]"
                >
                  当前建筑暂无检测项。
                </div>

                <div
                  v-else
                  class="overflow-hidden"
                >
                  <button
                    v-for="item in building.items"
                    :key="`${building.key}-${item.key}`"
                    type="button"
                    class="flex min-h-10 w-full items-center justify-between gap-4 border-b border-black/5 px-4 py-2.5 text-left transition-colors duration-180 ease-out last:border-b-0 hover:bg-black/1.5"
                    :disabled="!item.onSelect"
                    @click="item.onSelect?.()"
                  >
                    <div class="flex min-w-0 items-center gap-2.5 overflow-hidden whitespace-nowrap">
                      <div class="truncate whitespace-nowrap text-[14px] font-medium text-[#1e1f23]">
                        {{ item.name }}
                      </div>
                      <div class="truncate whitespace-nowrap text-[13px] text-[#979ca5]">
                        {{ item.categoryName }}
                      </div>
                    </div>

                    <div
                      :class="[
                        'shrink-0 whitespace-nowrap text-[14px] font-medium tabular-nums',
                        resolveScoreTone(item.scoreValue),
                      ]"
                    >
                      {{ item.scoreText }}
                    </div>
                  </button>
                </div>
              </div>
            </Transition>

            <div
              :class="[
                'flex items-center justify-between gap-3 px-4 py-2.5',
              ]"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-[#8f949c] transition-colors duration-180 hover:text-[#1f2024]"
                @click="toggleBuilding(building.key)"
              >
                {{ isExpanded(building.key) ? "收起详情" : "查看更多详情" }}
                <i :class="isExpanded(building.key) ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'" class="text-[15px]" />
              </button>

              <div class="shrink-0 text-right tabular-nums">
                <div
                  :class="[
                    'whitespace-nowrap text-[17px] font-semibold tracking-[-0.02em]',
                    resolveScoreTone(null),
                  ]"
                >
                  {{ building.scoreText }}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
