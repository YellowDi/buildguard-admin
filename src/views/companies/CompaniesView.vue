<script setup lang="ts">
import companiesData from "@/data/companies.json"
import ResourceListPage from "@/components/resource/ResourceListPage.vue"
import { useResourceListController } from "@/components/resource/useResourceListController"
import { companiesColumns, companiesPageConfig, companiesSortFieldOptions, type CompanyRecord } from "@/views/companies/companiesPageConfig"

type RawCompanyRecord = Omit<CompanyRecord, "startDate" | "endDate" | "serviceDaysDisplay">

const companies = (companiesData as RawCompanyRecord[]).map((company) => {
  const startDate = extractDatePart(company.lastUpdated)
  const endDate = buildEndDate(company.serviceDays)

  return {
    ...company,
    startDate,
    endDate,
    serviceDays: getRemainingDays(endDate),
    serviceDaysDisplay: `${getRemainingDays(endDate)} 天`,
  }
})

const controller = useResourceListController<CompanyRecord, string>({
  rows: companies,
  ...companiesPageConfig,
})

function buildEndDate(serviceDays: number) {
  const baseDate = new Date()
  baseDate.setHours(0, 0, 0, 0)
  baseDate.setDate(baseDate.getDate() + serviceDays)
  return toISODate(baseDate)
}

function extractDatePart(value: string) {
  const [datePart] = value.split(" ")
  return datePart ?? ""
}

function getRemainingDays(endDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) {
    return 0
  }

  const diff = targetDate.getTime() - today.getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}
</script>

<template>
  <ResourceListPage
    :title="companiesPageConfig.title ?? '企业'"
    :count="controller.visibleRows.value.length"
    :tabs="controller.tabs.value"
    :fields="controller.fields.value"
    :available-filters="controller.availableFilterKeys.value"
    :show-controls="controller.showControls.value"
    :custom-sort-enabled="controller.customSortEnabled.value"
    :sort-rules="controller.sortRules.value"
    :sort-field-options="companiesSortFieldOptions"
    :search-query="controller.searchQuery.value"
    :primary-action-label="companiesPageConfig.primaryActionLabel"
    :text-filters="controller.textFilters.value"
    :number-filters="controller.numberFilters.value"
    :tag-filters="controller.tagFilters.value"
    :tag-filter-options="controller.tagFilterOptions.value"
    :date-filters="controller.dateFilters.value"
    :date-filter-fields="controller.dateFilterFields.value"
    :columns="companiesColumns"
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
