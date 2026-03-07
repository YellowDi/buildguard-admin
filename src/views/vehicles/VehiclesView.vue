<script setup lang="ts">
import { computed, ref } from "vue"

import ResourceListPage from "@/components/resource/ResourceListPage.vue"
import { useResourceListController } from "@/components/resource/useResourceListController"
import {
  alarmColumns,
  alarmSortFieldOptions,
  alarmVehicles,
  alarmVehiclesPageConfig,
  inspectionColumns,
  inspectionSortFieldOptions,
  inspectionVehicles,
  inspectionVehiclesPageConfig,
  operatingColumns,
  operatingSortFieldOptions,
  operatingVehicles,
  operatingVehiclesPageConfig,
  VEHICLE_TAB_ALARMS,
  VEHICLE_TAB_INSPECTIONS,
  VEHICLE_TAB_OVERVIEW,
  vehicleTableClass,
  vehicleTableWrapperClass,
  vehiclesPageTabs,
  type AlarmVehicleRecord,
  type InspectionVehicleRecord,
  type OperatingVehicleRecord,
} from "@/views/vehicles/vehiclesPageConfig"

const activeTab = ref(VEHICLE_TAB_OVERVIEW)

const operatingController = useResourceListController<OperatingVehicleRecord, string>({
  rows: operatingVehicles,
  ...operatingVehiclesPageConfig,
})

const alarmController = useResourceListController<AlarmVehicleRecord, string>({
  rows: alarmVehicles,
  ...alarmVehiclesPageConfig,
})

const inspectionController = useResourceListController<InspectionVehicleRecord, string>({
  rows: inspectionVehicles,
  ...inspectionVehiclesPageConfig,
})

const tabs = computed(() => vehiclesPageTabs(activeTab.value))

const tableRegistry = {
  [VEHICLE_TAB_OVERVIEW]: {
    controller: operatingController,
    columns: operatingColumns,
    sortFieldOptions: operatingSortFieldOptions,
  },
  [VEHICLE_TAB_ALARMS]: {
    controller: alarmController,
    columns: alarmColumns,
    sortFieldOptions: alarmSortFieldOptions,
  },
  [VEHICLE_TAB_INSPECTIONS]: {
    controller: inspectionController,
    columns: inspectionColumns,
    sortFieldOptions: inspectionSortFieldOptions,
  },
} as const

const activeTable = computed(() => tableRegistry[activeTab.value as keyof typeof tableRegistry] ?? tableRegistry[VEHICLE_TAB_OVERVIEW])
const activeController = computed(() => activeTable.value.controller)
const activeCount = computed(() => activeController.value.visibleRows.value.length)

const sections = computed(() => [
  {
    key: activeTab.value,
    columns: activeTable.value.columns,
    rows: activeController.value.visibleRows.value,
    rowKey: "plateNumber",
    showIndex: true,
    stickyHeader: true,
    wrapperClass: vehicleTableWrapperClass,
    tableClass: vehicleTableClass,
  },
])

function handleTabClick(tab: { value?: string | number; label: string }) {
  activeTab.value = `${tab.value ?? tab.label}`
}

function handleSetCustomSortEnabled(enabled: boolean) {
  activeController.value.customSortEnabled.value = enabled
}

function handleUpdateSortRules(rules: typeof activeController.value.sortRules.value) {
  activeController.value.sortRules.value = rules
}

function handleToggleControls() {
  activeController.value.showControls.value = !activeController.value.showControls.value
}

function handleUpdateSearchQuery(query: string) {
  activeController.value.searchQuery.value = query
}

function handleAddFilter(key: string) {
  activeController.value.handleAddFilter(key)
}

function handleReplaceFilter(payload: Parameters<typeof activeController.value.handleReplaceFilter>[0]) {
  activeController.value.handleReplaceFilter(payload)
}

function handleRemoveFilter(key: string) {
  activeController.value.handleRemoveFilter(key)
}

function handleUpdateTextFilter(payload: Parameters<typeof activeController.value.updateTextFilter>[0] extends never ? never : { label: string; value: Parameters<typeof activeController.value.updateTextFilter>[1] }) {
  activeController.value.updateTextFilter(payload.label, payload.value)
}

function handleUpdateNumberFilter(payload: Parameters<typeof activeController.value.updateNumberFilter>[0] extends never ? never : { label: string; value: Parameters<typeof activeController.value.updateNumberFilter>[1] }) {
  activeController.value.updateNumberFilter(payload.label, payload.value)
}

function handleUpdateTagFilter(payload: Parameters<typeof activeController.value.updateTagFilter>[0] extends never ? never : { label: string; value: Parameters<typeof activeController.value.updateTagFilter>[1] }) {
  activeController.value.updateTagFilter(payload.label, payload.value)
}

function handleUpdateDateFilter(payload: Parameters<typeof activeController.value.updateDateFilter>[0] extends never ? never : { label: string; value: Parameters<typeof activeController.value.updateDateFilter>[1] }) {
  activeController.value.updateDateFilter(payload.label, payload.value)
}
</script>

<template>
  <ResourceListPage
    title="车辆"
    :count="activeCount"
    :tabs="tabs"
    :fields="activeController.fields.value"
    :available-filters="activeController.availableFilterKeys.value"
    :show-controls="activeController.showControls.value"
    :custom-sort-enabled="activeController.customSortEnabled.value"
    :sort-rules="activeController.sortRules.value"
    :sort-field-options="activeTable.sortFieldOptions"
    :search-query="activeController.searchQuery.value"
    :text-filters="activeController.textFilters.value"
    :number-filters="activeController.numberFilters.value"
    :tag-filters="activeController.tagFilters.value"
    :tag-filter-options="activeController.tagFilterOptions.value"
    :date-filters="activeController.dateFilters.value"
    :date-filter-fields="activeController.dateFilterFields.value"
    :columns="activeTable.columns"
    :rows="activeController.visibleRows.value"
    row-key="plateNumber"
    :sections="sections"
    @tab-click="handleTabClick"
    @add-filter="handleAddFilter"
    @replace-filter="handleReplaceFilter"
    @remove-filter="handleRemoveFilter"
    @set-custom-sort-enabled="handleSetCustomSortEnabled"
    @update-sort-rules="handleUpdateSortRules"
    @toggle-controls="handleToggleControls"
    @update-search-query="handleUpdateSearchQuery"
    @update-text-filter="handleUpdateTextFilter"
    @update-number-filter="handleUpdateNumberFilter"
    @update-tag-filter="handleUpdateTagFilter"
    @update-date-filter="handleUpdateDateFilter"
  />
</template>
