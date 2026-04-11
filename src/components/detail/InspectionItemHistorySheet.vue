<script setup lang="ts">
import { computed } from "vue"

import EntityHistorySheet from "@/components/detail/EntityHistorySheet.vue"
import type {
  DetailFieldSection,
  EntityHistoryMetaBadge,
  EntityHistoryTone,
  HistoryEntry,
  HistoryEntryField,
  InspectionItemHistoryModel,
  InspectionItemHistoryRecord,
} from "@/components/detail/types"

const props = defineProps<{
  open: boolean
  model: InspectionItemHistoryModel | null
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
}>()

const sections = computed<DetailFieldSection[]>(() => {
  if (!props.model) {
    return []
  }

  return [
    {
      key: "inspection-item-history-basic",
      title: "基础信息",
      rows: [
        { key: "building-name", label: "建筑", value: props.model.buildingName },
        { key: "category-name", label: "分类", value: props.model.categoryName },
        { key: "inspection-item-name", label: "检测项名称", value: props.model.inspectionItemName },
        { key: "inspector-name", label: "当前检测人", value: props.model.inspectorName },
        { key: "score-text", label: "当前扣分", value: props.model.scoreText },
      ],
    },
    {
      key: "inspection-item-history-definition",
      title: "检测项信息",
      rows: [
        { key: "content", label: "检测内容", value: props.model.content, truncate: false, valueClass: "leading-6" },
        { key: "standard", label: "判定标准", value: props.model.standard, truncate: false, valueClass: "leading-6" },
        { key: "force-photo", label: "是否强制拍照", value: props.model.isForcePhotoText },
        { key: "measure-record", label: "是否记录实测值", value: props.model.isMeasureRecordText },
      ],
    },
  ]
})

const metaBadges = computed<EntityHistoryMetaBadge[]>(() => {
  if (!props.model) {
    return []
  }

  return [
    {
      key: "current-inspector",
      label: `当前检测人 ${props.model.inspectorName}`,
      tone: "info",
    },
    {
      key: "current-score",
      label: `当前扣分 ${props.model.scoreText}`,
      tone: props.model.scoreText === "-" || props.model.scoreText === "0 分" ? "success" : "warning",
    },
  ]
})

const historyEntries = computed<HistoryEntry[]>(() => (
  props.model?.historyEntries.map((entry, index) => ({
    key: entry.key,
    title: entry.isLatest ? "最新检测结果" : `历史记录 ${props.model!.historyEntries.length - index}`,
    timestamp: entry.timestamp,
    statusLabel: entry.resultLabel,
    statusTone: resolveStatusTone(entry.resultLabel),
    summary: entry.summary,
    fields: buildEntryFields(entry),
    isLatest: entry.isLatest,
  })) ?? []
))

const description = computed(() => (
  props.model
    ? `${props.model.buildingName} · ${props.model.categoryName}`
    : ""
))

function handleOpenChange(open: boolean) {
  emit("update:open", open)
}

function buildEntryFields(entry: InspectionItemHistoryRecord): HistoryEntryField[] {
  return [
    { key: `${entry.key}-inspector`, label: "检测人", value: entry.inspectorName },
    { key: `${entry.key}-score`, label: "扣分", value: entry.scoreText },
    ...(entry.measureValue ? [{ key: `${entry.key}-measure`, label: "实测值", value: entry.measureValue }] : []),
    ...(typeof entry.photoCount === "number" ? [{ key: `${entry.key}-photos`, label: "现场照片", value: `${entry.photoCount} 张` }] : []),
    ...(entry.remark ? [{ key: `${entry.key}-remark`, label: "备注", value: entry.remark }] : []),
  ]
}

function resolveStatusTone(label: string): EntityHistoryTone {
  if (label === "正常") {
    return "success"
  }

  if (label === "异常" || label === "已驳回") {
    return "danger"
  }

  if (label === "待复核") {
    return "warning"
  }

  if (label === "未反馈") {
    return "info"
  }

  return "neutral"
}
</script>

<template>
  <EntityHistorySheet
    :open="open"
    :title="model?.inspectionItemName ?? '检测结果历史'"
    :description="description"
    :meta-badges="metaBadges"
    :sections="sections"
    history-title="检测结果时间轴"
    :history-entries="historyEntries"
    empty-history-title="暂无检测结果历史"
    empty-history-description="当前检测项还没有可展示的检测结果历史。"
    @update:open="handleOpenChange"
  />
</template>
