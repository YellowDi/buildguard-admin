<script setup lang="ts">
import { computed, ref, watch } from "vue"

import InspectionCategoryScoreLimitInline from "@/components/inspection/InspectionCategoryScoreLimitInline.vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

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
  onExpand?: () => void
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
const expandedInspectionItemKey = ref("")

const displayCount = computed(() => props.count ?? props.buildings.length)

watch(() => props.buildings, (buildings) => {
  if (!buildings.length) {
    expandedBuildingKey.value = ""
    expandedInspectionItemKey.value = ""
    return
  }

  if (!buildings.some(building => building.key === expandedBuildingKey.value)) {
    expandedBuildingKey.value = buildings[0]?.key ?? ""
  }
}, { immediate: true })

watch(expandedBuildingKey, (nextKey) => {
  if (!expandedInspectionItemKey.value) {
    return
  }

  if (!nextKey || !expandedInspectionItemKey.value.startsWith(`${nextKey}::`)) {
    expandedInspectionItemKey.value = ""
  }
})

watch(expandedInspectionItemKey, (nextKey) => {
  const item = nextKey ? findInspectionItemByAccordionKey(nextKey) : null
  item?.onExpand?.()
})

function findInspectionItemByAccordionKey(key: string) {
  for (const building of props.buildings) {
    for (const group of building.groups) {
      for (const item of group.items) {
        if (buildInspectionAccordionKey(building.key, group.key, item.key) === key) {
          return item
        }
      }
    }
  }

  return null
}

function buildInspectionAccordionKey(buildingKey: string, groupKey: string, itemKey: string) {
  return `${buildingKey}::${groupKey}::${itemKey}`
}
</script>

<template>
  <section class="detail-relation-module w-full min-w-0 max-w-full">
    <div class="detail-table-scroll">
      <div class="detail-table-frame detail-relation-frame">
        <div class="detail-table-heading-row detail-table-grid detail-relation-grid detail-section-inset items-center">
          <div class="flex min-w-0 items-center gap-2">
            <h2 class="detail-field-section__heading shrink-0 whitespace-nowrap">{{ props.title }}</h2>
            <Badge
              variant="secondary"
              class="min-w-6 justify-center rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-none"
            >
              {{ displayCount }}
            </Badge>
          </div>
        </div>

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
              class="mb-3 min-w-0 overflow-x-clip rounded-md border border-border/55 bg-muted shadow-xs last:mb-0 dark:shadow-(--shadow-card)"
            >
              <AccordionTrigger class="bg-transparent px-3.5 py-3 text-left hover:no-underline">
                <div class="flex min-w-0 flex-1 items-center gap-3 pr-3">
                  <div class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {{ building.buildName }}
                  </div>
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

                <div v-else class="overflow-hidden rounded-md bg-background shadow-(--shadow-card)">
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

                    <Accordion
                      v-model="expandedInspectionItemKey"
                      type="single"
                      collapsible
                      class="min-w-0 overflow-visible"
                    >
                      <AccordionItem
                        v-for="item in group.items"
                        :key="buildInspectionAccordionKey(building.key, group.key, item.key)"
                        :value="buildInspectionAccordionKey(building.key, group.key, item.key)"
                        class="min-w-0 overflow-x-clip border-0 bg-transparent"
                      >
                        <AccordionTrigger
                          class="rounded-none border-0 bg-transparent px-2 py-3 text-left transition-colors hover:bg-muted/50 hover:no-underline"
                        >
                          <div class="flex min-w-0 flex-1 items-center gap-3 pr-3">
                            <div class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                              {{ item.name }}
                            </div>
                            <div
                              v-if="item.summary"
                              class="shrink-0 truncate text-xs text-muted-foreground"
                            >
                              {{ item.summary }}
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent
                          class="rounded-none px-2 data-[state=closed]:pb-0 data-[state=closed]:pt-0 data-[state=open]:overflow-visible! data-[state=open]:bg-background data-[state=open]:pb-0 data-[state=open]:pt-0 [&>div]:pb-0 [&>div]:pt-0"
                        >
                          <div v-if="item.loading" class="grid gap-3">
                            <div class="grid gap-2">
                              <Skeleton class="h-3 w-16 rounded" />
                              <Skeleton class="h-5 w-full rounded" />
                              <Skeleton class="h-5 w-4/5 rounded" />
                            </div>
                            <div class="grid gap-2">
                              <Skeleton class="h-3 w-16 rounded" />
                              <Skeleton class="h-5 w-full rounded" />
                              <Skeleton class="h-5 w-3/4 rounded" />
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                              <div class="space-y-2">
                                <Skeleton class="h-3 w-14 rounded" />
                                <Skeleton class="h-5 w-12 rounded" />
                              </div>
                              <div class="space-y-2">
                                <Skeleton class="h-3 w-24 rounded" />
                                <Skeleton class="h-5 w-12 rounded" />
                              </div>
                            </div>
                          </div>

                          <div v-else-if="item.error" class="space-y-3">
                            <p class="text-sm text-destructive">{{ item.error }}</p>
                            <Button
                              v-if="item.onRetry"
                              type="button"
                              variant="outline"
                              size="sm"
                              class="gap-2"
                              @click="item.onRetry"
                            >
                              <i class="ri-refresh-line text-sm" />
                              重新加载
                            </Button>
                          </div>

                          <div v-else-if="item.fields?.length" class="grid gap-3 text-sm">
                            <div
                              v-for="field in item.fields"
                              :key="field.key"
                              class="grid gap-1"
                            >
                              <p class="text-xs text-muted-foreground">{{ field.label }}</p>
                              <p class="whitespace-pre-wrap wrap-break-word leading-6 text-foreground">
                                {{ field.value }}
                              </p>
                            </div>
                          </div>

                          <div v-else class="text-sm text-muted-foreground">
                            {{ item.emptyText ?? "-" }}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
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
