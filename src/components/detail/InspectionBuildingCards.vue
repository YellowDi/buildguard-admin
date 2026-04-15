<script setup lang="ts">
import { computed, ref, watch } from "vue"

import TitleBlock from "@/components/layout/TitleBlock.vue"
import InspectionCategoryScoreLimitInline from "@/components/inspection/InspectionCategoryScoreLimitInline.vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

type InspectionBuildingCardField = {
  key: string
  label: string
  value: string
}

type InspectionBuildingCardItem = {
  key: string
  name: string
  summary?: string
  fields?: InspectionBuildingCardField[]
  loading?: boolean
  error?: string
  emptyText?: string
  onSelect?: () => void
  onRetry?: () => void
}

type InspectionBuildingCardGroup = {
  key: string
  title: string
  scoreLimit?: number | null
  items: InspectionBuildingCardItem[]
}

type InspectionBuildingCardBuilding = {
  key: string
  buildName: string
  summary: string
  score?: string
  groups: InspectionBuildingCardGroup[]
}

const props = withDefaults(defineProps<{
  title?: string
  count?: number
  buildings: InspectionBuildingCardBuilding[]
  emptyTitle?: string
  emptyDescription?: string
}>(), {
  title: "建筑与检测项",
  count: undefined,
  emptyTitle: "暂无服务建筑",
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
    expandedBuildingKey.value = buildings[0]?.key ?? ""
  }
}, { immediate: true })
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
              {{ displayCount }}
            </Badge>
          </template>
        </TitleBlock>

        <div
          v-if="props.buildings.length === 0"
          class="flex min-h-[min(160px,30vh)] w-full min-w-0 flex-col items-center justify-center px-4 py-12"
        >
          <Empty class="w-full max-w-md flex-none border-0 bg-transparent shadow-none p-6! md:p-8!">
            <EmptyHeader class="max-w-md">
              <EmptyMedia variant="icon">
                <i class="ri-building-line text-[18px]" />
              </EmptyMedia>
              <EmptyTitle>{{ props.emptyTitle }}</EmptyTitle>
              <EmptyDescription>{{ props.emptyDescription }}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>

        <div v-else class="detail-group-stack">
          <Accordion
            v-model="expandedBuildingKey"
            type="single"
            collapsible
            class="pb-2"
          >
            <AccordionItem
              v-for="building in props.buildings"
              :key="building.key"
              :value="building.key"
              class="mb-3 min-w-0 overflow-x-clip rounded-2xl border border-border/55 bg-muted shadow-xs last:mb-0 dark:shadow-(--shadow-card)"
            >
              <AccordionTrigger class="bg-transparent px-3.5 py-3 text-left hover:no-underline">
                <div class="flex min-w-0 flex-1 items-center gap-3 pr-3">
                  <div class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {{ building.buildName }}
                  </div>
                  <Badge
                    v-if="building.score"
                    variant="secondary"
                    class="shrink-0 rounded-md border border-brand-border bg-brand-surface px-2 py-0.5 text-[12px] font-semibold text-link"
                  >
                    {{ building.score }}
                  </Badge>
                  <div class="shrink-0 truncate text-xs text-muted-foreground">
                    {{ building.summary }}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent
                class="bg-transparent data-[state=closed]:p-0 data-[state=open]:overflow-visible! data-[state=open]:px-2 data-[state=open]:pb-2 data-[state=open]:pt-0 [&>div]:pb-0 [&>div]:pt-0"
              >
                <div v-if="building.groups.length === 0" class="py-2 text-sm text-muted-foreground">
                  当前建筑暂无绑定检测项。
                </div>

                <div v-else class="overflow-hidden rounded-lg bg-background shadow-(--shadow-card)">
                  <div
                    v-for="(group, groupIndex) in building.groups"
                    :key="`${building.key}-${group.key}`"
                    :class="[
                      'space-y-3',
                      groupIndex === 0 ? 'pt-3' : 'pt-2',
                    ]"
                  >
                    <div class="flex min-w-0 items-center gap-3 px-2">
                      <div class="flex min-w-0 items-center gap-2">
                        <div class="truncate text-sm font-semibold text-muted-foreground">{{ group.title }}</div>
                        <Badge
                          variant="secondary"
                          class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
                        >
                          {{ group.items.length }}
                        </Badge>
                      </div>

                      <div class="h-px flex-1 bg-border/80" />

                      <div v-if="group.scoreLimit !== undefined" class="flex shrink-0 items-center">
                        <InspectionCategoryScoreLimitInline :limit="group.scoreLimit" />
                      </div>
                    </div>

                    <div class="space-y-0.5 px-1.5 pb-1.5">
                      <div
                        v-for="item in group.items"
                        :key="`${building.key}-${group.key}-${item.key}`"
                        class="min-w-0"
                      >
                        <button
                          type="button"
                          class="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
                          :disabled="!item.onSelect"
                          @click="item.onSelect?.()"
                        >
                          <div class="flex min-w-0 flex-1 items-center gap-2.5">
                            <div class="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                              {{ item.name }}
                            </div>

                            <div class="flex min-w-0 max-w-[50%] shrink items-center gap-1.5 text-[11px] text-muted-foreground">
                              <i
                                :class="[
                                  item.loading
                                    ? 'ri-loader-4-line animate-spin text-muted-foreground'
                                    : item.error
                                      ? 'ri-error-warning-line text-destructive'
                                      : 'ri-time-line text-muted-foreground',
                                  'shrink-0 text-[12px]',
                                ]"
                              />
                              <span
                                :class="[
                                  'truncate whitespace-nowrap',
                                  item.error ? 'text-destructive' : 'text-muted-foreground',
                                ]"
                              >
                                {{ item.error || item.summary || item.emptyText || "-" }}
                              </span>
                            </div>
                          </div>

                          <div class="flex shrink-0 items-center gap-1.5 self-center">
                            <Button
                              v-if="item.error && item.onRetry"
                              type="button"
                              variant="outline"
                              size="sm"
                              class="h-6 rounded-md px-2 text-[11px]"
                              @click.stop="item.onRetry"
                            >
                              重试
                            </Button>
                            <i class="ri-arrow-right-s-line text-base text-muted-foreground/80" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  </section>
</template>
