<script setup lang="ts">
import { computed, ref, watch } from "vue"

import TitleBlock from "@/components/layout/TitleBlock.vue"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/ui/status-badge"

type InspectionBuildingStatus = "pending" | "processing" | "completed"

type InspectionBuildingCardV2Item = {
  key: string
  name: string
  categoryName: string
  resultLabel?: string
  scoreText: string
  scoreValue: number | null
  onSelect?: () => void
}

type InspectionBuildingCardV2Group = {
  key: string
  title: string
  scoreText: string
  scoreValue: number | null
  items: InspectionBuildingCardV2Item[]
}

type InspectionBuildingCardV2Building = {
  key: string
  buildName: string
  status: InspectionBuildingStatus
  completedCount: number
  totalCount: number
  progressValue: number
  progressLabel?: string
  deadlineText: string
  scoreText: string
  groups: InspectionBuildingCardV2Group[]
}

const props = withDefaults(defineProps<{
  title?: string
  count?: number
  buildings: InspectionBuildingCardV2Building[]
  emptyTitle?: string
  emptyDescription?: string
  emptyItemsText?: string
  totalLabel?: string
  emptyIcon?: string
  selectable?: boolean
  selectedItemKeys?: string[]
  selectableDisabledItemKeys?: string[]
  showHeader?: boolean
}>(), {
  title: "建筑与检测项",
  count: undefined,
  emptyTitle: "暂无建筑检测项",
  emptyDescription: "当前暂无可展示的建筑检测项数据。",
  emptyItemsText: "当前建筑暂无检测项。",
  totalLabel: "总检测项",
  emptyIcon: "ri-building-line",
  selectable: false,
  selectedItemKeys: () => [],
  selectableDisabledItemKeys: () => [],
  showHeader: true,
})

const emit = defineEmits<{
  "update:selectedItemKeys": [value: string[]]
  "item-toggle": [item: InspectionBuildingCardV2Item, checked: boolean]
}>()

const expandedBuildingKeys = ref<string[]>([])

const displayCount = computed(() => props.count ?? props.buildings.length)

watch(() => props.buildings, (buildings) => {
  if (!buildings.length) {
    expandedBuildingKeys.value = []
    return
  }

  const validKeys = new Set(buildings.map(building => building.key))
  expandedBuildingKeys.value = expandedBuildingKeys.value.filter(key => validKeys.has(key))
}, { immediate: true })

function toggleBuilding(buildingKey: string) {
  expandedBuildingKeys.value = expandedBuildingKeys.value.includes(buildingKey)
    ? expandedBuildingKeys.value.filter(key => key !== buildingKey)
    : [...expandedBuildingKeys.value, buildingKey]
}

function isExpanded(buildingKey: string) {
  return expandedBuildingKeys.value.includes(buildingKey)
}

function handleBaseCardClick(buildingKey: string) {
  if (typeof window !== "undefined") {
    const selectedText = window.getSelection?.()?.toString().trim() ?? ""
    if (selectedText) {
      return
    }
  }

  toggleBuilding(buildingKey)
}

function handleBaseCardKeydown(event: KeyboardEvent, buildingKey: string) {
  if (event.key !== "Enter" && event.key !== " ") {
    return
  }

  event.preventDefault()
  toggleBuilding(buildingKey)
}

function isItemSelected(itemKey: string) {
  return props.selectedItemKeys.includes(itemKey)
}

function isItemSelectionDisabled(itemKey: string) {
  return props.selectable && props.selectableDisabledItemKeys.includes(itemKey)
}

function handleItemClick(item: InspectionBuildingCardV2Item) {
  if (isItemSelectionDisabled(item.key)) {
    return
  }

  if (props.selectable) {
    updateItemSelected(item, !isItemSelected(item.key))
    return
  }

  item.onSelect?.()
}

function handleItemKeydown(event: KeyboardEvent, item: InspectionBuildingCardV2Item) {
  if (event.key !== "Enter" && event.key !== " ") {
    return
  }

  event.preventDefault()
  handleItemClick(item)
}

function updateItemSelected(item: InspectionBuildingCardV2Item, checked: boolean | "indeterminate") {
  if (checked === "indeterminate") {
    return
  }

  if (isItemSelectionDisabled(item.key)) {
    return
  }

  const nextSelectedKeys = checked
    ? Array.from(new Set([...props.selectedItemKeys, item.key]))
    : props.selectedItemKeys.filter(key => key !== item.key)

  emit("update:selectedItemKeys", nextSelectedKeys)
  emit("item-toggle", item, checked)
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

function resolveStatusIconWrapClass(status: InspectionBuildingStatus) {
  if (status === "completed") {
    return "bg-[#eaf6f0] text-[#2f8f62] shadow-[inset_0_0_0_1px_rgba(47,143,98,0.08)]"
  }

  if (status === "processing") {
    return "bg-[#edf4ff] text-[#2f7df6] shadow-[inset_0_0_0_1px_rgba(47,125,246,0.08)]"
  }

  return "bg-[#fff4e8] text-[#d97706] shadow-[inset_0_0_0_1px_rgba(217,119,6,0.08)]"
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

function resolveItemResultBadgeTone(resultLabel: string | undefined) {
  if (resultLabel === "正常") {
    return "green"
  }

  if (resultLabel === "轻微风险") {
    return "orange"
  }

  if (resultLabel === "存在隐患") {
    return "red"
  }

  return "gray"
}

function resolveItemResultBadgeIcon(resultLabel: string | undefined) {
  if (resultLabel === "正常") {
    return "check"
  }

  if (resultLabel === "轻微风险") {
    return "clock"
  }

  if (resultLabel === "存在隐患") {
    return "alert"
  }

  return "minus"
}

function handleExpandBeforeEnter(element: Element) {
  const target = element as HTMLElement
  target.style.height = "0"
  target.style.opacity = "0"
  target.style.overflow = "hidden"
}

function handleExpandEnter(element: Element) {
  const target = element as HTMLElement
  target.style.transition = "height 220ms cubic-bezier(0.2, 0, 0, 1), opacity 180ms ease-out"
  target.style.height = `${target.scrollHeight}px`
  target.style.opacity = "1"
}

function handleExpandAfterEnter(element: Element) {
  const target = element as HTMLElement
  target.style.height = "auto"
  target.style.opacity = "1"
  target.style.overflow = ""
  target.style.transition = ""
}

function handleExpandBeforeLeave(element: Element) {
  const target = element as HTMLElement
  target.style.height = `${target.scrollHeight}px`
  target.style.opacity = "1"
  target.style.overflow = "hidden"
}

function handleExpandLeave(element: Element) {
  const target = element as HTMLElement
  target.style.transition = "height 180ms cubic-bezier(0.4, 0, 1, 1), opacity 140ms ease-in"
  void target.offsetHeight
  target.style.height = "0"
  target.style.opacity = "0"
}

function handleExpandAfterLeave(element: Element) {
  const target = element as HTMLElement
  target.style.height = ""
  target.style.opacity = ""
  target.style.overflow = ""
  target.style.transition = ""
}
</script>

<template>
  <section class="detail-relation-module w-full min-w-0 max-w-full">
    <div class="detail-table-scroll">
      <div class="detail-table-frame detail-relation-frame">
        <TitleBlock
          v-if="props.showHeader"
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
                <i :class="[props.emptyIcon, 'text-[18px]']" />
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
            <div
              role="button"
              tabindex="0"
              class="block w-full rounded-[16px] bg-white px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(17,24,39,0.04),0_5px_10px_rgba(17,24,39,0.05)]"
              :aria-expanded="isExpanded(building.key)"
              @click="handleBaseCardClick(building.key)"
              @keydown="handleBaseCardKeydown($event, building.key)"
            >
              <div class="flex min-w-0 items-start gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex min-w-0 items-center gap-2.5">
                    <div
                      :class="[
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-180',
                        resolveStatusIconWrapClass(building.status),
                      ]"
                    >
                      <i
                        :class="[
                          resolveStatusIcon(building.status),
                          building.status === 'processing' ? 'animate-spin' : '',
                          'text-[15px]',
                        ]"
                      />
                    </div>
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
                      <span class="ml-1">{{ building.progressLabel || "已完成" }}</span>
                      <span class="mx-1.5">/</span>
                      <span class="text-[#2b2d33]">{{ building.totalCount }}</span>
                      <span class="ml-1">{{ props.totalLabel }}</span>
                    </div>
                    <div class="shrink-0 truncate tabular-nums text-right">
                      {{ building.deadlineText }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Transition
              @before-enter="handleExpandBeforeEnter"
              @enter="handleExpandEnter"
              @after-enter="handleExpandAfterEnter"
              @before-leave="handleExpandBeforeLeave"
              @leave="handleExpandLeave"
              @after-leave="handleExpandAfterLeave"
            >
              <div
                v-if="isExpanded(building.key)"
                class="bg-transparent pb-0 pt-3"
              >
                <div
                  v-if="building.groups.length === 0"
                  class="px-4 py-1 text-sm text-[#8f949c]"
                >
                  {{ props.emptyItemsText }}
                </div>

                <div
                  v-else
                  class="overflow-hidden pb-1"
                >
                  <div
                    v-for="(group, groupIndex) in building.groups"
                    :key="`${building.key}-${group.key}`"
                    :class="groupIndex === 0 ? '' : 'pt-2'"
                  >
                    <div class="flex items-center gap-3 px-4 py-2.5">
                      <div class="flex min-w-0 items-center gap-2">
                        <div class="truncate text-[13px] font-semibold tracking-[0.01em] text-[#6f7680]">
                          {{ group.title }}
                        </div>
                        <Badge
                          variant="secondary"
                          class="min-w-6 justify-center rounded-md border border-black/6 bg-[#f3f4f6] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[#6b7280]"
                        >
                          {{ group.items.length }}
                        </Badge>
                      </div>

                      <div class="h-px flex-1 bg-black/6" />

                      <div
                        :class="[
                          'shrink-0 whitespace-nowrap text-[16px] font-semibold tabular-nums',
                          resolveScoreTone(group.scoreValue),
                        ]"
                      >
                        {{ group.scoreText }}
                      </div>
                    </div>

                    <TransitionGroup name="inspection-item-stagger" tag="div">
                      <div
                        v-for="(item, itemIndex) in group.items"
                        :key="`${building.key}-${group.key}-${item.key}`"
                        role="button"
                        tabindex="0"
                        :aria-pressed="props.selectable ? isItemSelected(item.key) : undefined"
                        :class="[
                          'flex min-h-10 w-full items-center justify-between gap-4 border-b border-black/5 px-4 py-2.5 text-left transition-colors duration-180 ease-out last:border-b-0 hover:bg-black/1.5',
                          props.selectable && isItemSelected(item.key) ? 'bg-black/2' : '',
                          isItemSelectionDisabled(item.key) ? 'cursor-not-allowed opacity-55 hover:bg-transparent' : '',
                          !props.selectable && !item.onSelect ? 'cursor-default' : 'cursor-pointer',
                        ]"
                        :style="{ '--item-delay': `${220 + (groupIndex * 3 + itemIndex) * 36}ms` }"
                        @click="handleItemClick(item)"
                        @keydown="handleItemKeydown($event, item)"
                      >
                        <div class="flex min-w-0 items-center gap-2.5 overflow-hidden">
                          <Checkbox
                            v-if="props.selectable"
                            :model-value="isItemSelected(item.key)"
                            :disabled="isItemSelectionDisabled(item.key)"
                            class="shrink-0"
                            @click.stop
                            @update:model-value="updateItemSelected(item, $event)"
                          />
                          <StatusBadge
                            v-if="item.resultLabel"
                            :label="item.resultLabel"
                            :tone="resolveItemResultBadgeTone(item.resultLabel)"
                            :icon="resolveItemResultBadgeIcon(item.resultLabel)"
                            class="shrink-0"
                          />
                          <div class="truncate whitespace-nowrap text-[14px] font-medium text-[#1e1f23]">
                            {{ item.name }}
                          </div>
                        </div>

                        <div
                          :class="[
                            'shrink-0 whitespace-nowrap text-[16px] font-semibold tabular-nums',
                            resolveScoreTone(item.scoreValue),
                          ]"
                        >
                          {{ item.scoreText }}
                        </div>
                      </div>
                    </TransitionGroup>
                  </div>
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
                :aria-expanded="isExpanded(building.key)"
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

<style scoped>
.inspection-item-stagger-enter-active {
  transition:
    opacity 180ms ease-out,
    transform 220ms cubic-bezier(0.2, 0, 0, 1);
  transition-delay: var(--item-delay);
}

.inspection-item-stagger-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.inspection-item-stagger-enter-to {
  opacity: 1;
  transform: translateY(0);
}
</style>
