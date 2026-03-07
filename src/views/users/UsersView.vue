<script setup lang="ts">
import ResourceListPage from "@/components/resource/ResourceListPage.vue"
import { useResourceListController } from "@/components/resource/useResourceListController"
import {
  practitionersColumns,
  practitionersPageConfig,
  practitionersSortFieldOptions,
  type PractitionerRecord,
} from "@/views/users/usersPageConfig"

const practitioners: PractitionerRecord[] = [
  { id: 1, name: "陈晓峰", phone: "13857420011", profileDisplay: "陈晓峰 13857420011", company: "宁波企丰科技有限公司", role: "安全员", district: "海曙区", certificateLevel: "A 级", experienceYears: 8, experienceDisplay: "8 年", joinedAt: "2022-03-12", status: "在岗", note: "本月已完成复训" },
  { id: 2, name: "周雨晴", phone: "13967840025", profileDisplay: "周雨晴 13967840025", company: "宁波兴达交通服务有限公司", role: "驾驶员", district: "鄞州区", certificateLevel: "B 级", experienceYears: 5, experienceDisplay: "5 年", joinedAt: "2023-07-05", status: "在岗", note: "服务评分稳定" },
  { id: 3, name: "李志成", phone: "13780019983", profileDisplay: "李志成 13780019983", company: "宁波北仑安运物流有限公司", role: "押运员", district: "北仑区", certificateLevel: "A 级", experienceYears: 11, experienceDisplay: "11 年", joinedAt: "2020-01-18", status: "待复核", note: "证件年审材料待补" },
  { id: 4, name: "何嘉琳", phone: "13616541287", profileDisplay: "何嘉琳 13616541287", company: "慈溪城际客运集团", role: "调度员", district: "慈溪市", certificateLevel: "B 级", experienceYears: 6, experienceDisplay: "6 年", joinedAt: "2021-10-09", status: "在岗", note: "跨区调度权限已开通" },
  { id: 5, name: "王立新", phone: "13586790041", profileDisplay: "王立新 13586790041", company: "余姚安泰危货运输有限公司", role: "驾驶员", district: "余姚市", certificateLevel: "A 级", experienceYears: 9, experienceDisplay: "9 年", joinedAt: "2019-05-21", status: "停用", note: "长期请假，暂时停岗" },
  { id: 6, name: "宋佳慧", phone: "18657436620", profileDisplay: "宋佳慧 18657436620", company: "奉化通联运输有限公司", role: "安全员", district: "奉化区", certificateLevel: "B 级", experienceYears: 4, experienceDisplay: "4 年", joinedAt: "2024-02-14", status: "待复核", note: "培训档案待上传" },
  { id: 7, name: "许腾飞", phone: "13810235567", profileDisplay: "许腾飞 13810235567", company: "宁波港兴客运发展有限公司", role: "驾驶员", district: "江北区", certificateLevel: "A 级", experienceYears: 12, experienceDisplay: "12 年", joinedAt: "2018-08-03", status: "在岗", note: "重点驾驶员，需季度回访" },
  { id: 8, name: "蒋雯静", phone: "13710235569", profileDisplay: "蒋雯静 13710235569", company: "宁波海联运输集团有限公司", role: "调度员", district: "海曙区", certificateLevel: "C 级", experienceYears: 3, experienceDisplay: "3 年", joinedAt: "2024-11-28", status: "待复核", note: "新入职，权限审批中" },
]

const controller = useResourceListController<PractitionerRecord, string>({
  rows: practitioners,
  ...practitionersPageConfig,
})
</script>

<template>
  <ResourceListPage
    :title="practitionersPageConfig.title ?? '从业人员'"
    :count="controller.visibleRows.value.length"
    :tabs="controller.tabs.value"
    :fields="controller.fields.value"
    :available-filters="controller.availableFilterKeys.value"
    :show-controls="controller.showControls.value"
    :custom-sort-enabled="controller.customSortEnabled.value"
    :sort-rules="controller.sortRules.value"
    :sort-field-options="practitionersSortFieldOptions"
    :search-query="controller.searchQuery.value"
    :text-filters="controller.textFilters.value"
    :number-filters="controller.numberFilters.value"
    :tag-filters="controller.tagFilters.value"
    :tag-filter-options="controller.tagFilterOptions.value"
    :date-filters="controller.dateFilters.value"
    :date-filter-fields="controller.dateFilterFields.value"
    :columns="practitionersColumns"
    :rows="controller.visibleRows.value"
    row-key="id"
    show-index
    sticky-header
    wrapper-class="overflow-visible"
    table-class="min-w-full w-max table-auto border-collapse bg-white text-[14px]"
    @tab-click="controller.handleTabClick"
    @add-filter="controller.handleAddFilter"
    @replace-filter="controller.handleReplaceFilter"
    @remove-filter="controller.handleRemoveFilter"
    @set-custom-sort-enabled="controller.customSortEnabled.value = $event"
    @update-sort-rules="controller.sortRules.value = $event"
    @toggle-controls="controller.showControls.value = !controller.showControls.value"
    @update-search-query="controller.searchQuery.value = $event"
    @update-text-filter="controller.updateTextFilter($event.label, $event.value)"
    @update-number-filter="controller.updateNumberFilter($event.label, $event.value)"
    @update-tag-filter="controller.updateTagFilter($event.label, $event.value)"
    @update-date-filter="controller.updateDateFilter($event.label, $event.value)"
  />
</template>
