<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"

withDefaults(defineProps<{
  /** 每个分组下的行数 */
  rowsPerGroup?: number
  /** 分组数量 */
  groups?: number
  /** true：两列数据 + 操作（园区建筑表）；false：一列数据 + 操作（检测服务关联建筑） */
  twoDataColumns?: boolean
}>(), {
  rowsPerGroup: 4,
  groups: 1,
  twoDataColumns: true,
})
</script>

<template>
  <div class="space-y-5">
    <div class="px-2 py-1">
      <div class="mb-5 flex items-baseline gap-2">
        <Skeleton class="h-5 w-28" />
        <Skeleton class="h-4 w-8 rounded-md" />
      </div>

      <div class="space-y-4">
        <div
          v-for="group in groups"
          :key="`detail-relation-group-${group}`"
          class="space-y-3"
        >
          <Skeleton class="h-4 w-24" />
          <div class="space-y-3 p-1">
            <div
              v-for="row in rowsPerGroup"
              :key="`detail-relation-row-${group}-${row}`"
              :class="twoDataColumns
                ? 'grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_2rem] gap-3'
                : 'grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3'"
            >
              <template v-if="twoDataColumns">
                <Skeleton class="h-4 w-5/6 max-w-full" />
                <Skeleton class="h-4 w-4/5 max-w-full" />
                <Skeleton class="h-4 w-4 shrink-0 justify-self-end" />
              </template>
              <template v-else>
                <Skeleton class="h-4 w-4/5 max-w-full" />
                <Skeleton class="h-7 w-12 shrink-0 justify-self-end rounded-md" />
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
