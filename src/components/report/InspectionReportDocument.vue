<script setup lang="ts">
import { computed } from "vue"

import reportLogoUrl from "@/assets/baojing-yunwei-logo.png"
import {
  normalizeReportTemplateModuleOrder,
  type InspectionReportItem,
  type InspectionReportRecord,
  type ReportTemplateModule,
} from "@/lib/inspection-report-mock"

type ReportDocumentVariant = "screen" | "pdf"

type ReportItemCategoryGroup<TItem extends InspectionReportItem = InspectionReportItem> = {
  categoryName: string
  items: TItem[]
}

type ReportItemRiskLevelGroup<TItem extends InspectionReportItem = InspectionReportItem> = {
  riskLevel: string
  totalItems: number
  categories: ReportItemCategoryGroup<TItem>[]
}

const props = withDefaults(defineProps<{
  report: InspectionReportRecord
  variant?: ReportDocumentVariant
}>(), {
  variant: "screen",
})

const resultOrder = ["存在隐患", "异常", "已驳回", "轻微风险", "正常", "未反馈"]
const categoryAccentColors = [
  "14 116 144",
  "37 99 235",
  "124 58 237",
  "217 119 6",
  "220 38 38",
  "5 150 105",
]

const enabledModules = computed(() => normalizeReportTemplateModuleOrder(props.report.template.modules).filter(module => module.enabled))
const reportBodyModules = computed(() => enabledModules.value.filter(module =>
  !moduleIs(module, "cover")
  && !moduleIs(module, "attachments")
  && !moduleIs(module, "footer")
  && !moduleIs(module, "expertAdvice")
  && !moduleIs(module, "risks"),
))
const reportBuildingName = computed(() => props.report.snapshot.buildings[0]?.name ?? "-")
const reportItemRiskLevelGroups = computed<ReportItemRiskLevelGroup[]>(() => {
  const items = props.report.snapshot.buildings.flatMap(building => building.items)

  return groupReportItemsByRiskLevel(items)
})
const completionText = computed(() => {
  const snapshot = props.report.snapshot

  if (snapshot.totalItems <= 0) {
    return "0%"
  }

  return `${Math.round((snapshot.completedItems / snapshot.totalItems) * 100)}%`
})

function getResultClass(label: string) {
  if (label === "正常") {
    return "bg-success-surface text-success"
  }

  if (label === "轻微风险") {
    return "bg-warning-surface text-warning"
  }

  if (label === "存在隐患" || label === "异常" || label === "已驳回") {
    return "bg-destructive-surface text-destructive"
  }

  return "bg-muted text-muted-foreground"
}

function getRiskLevelToneClass(label: string) {
  if (label === "正常") {
    return "inspection-risk-level--success"
  }

  if (label === "轻微风险") {
    return "inspection-risk-level--warning"
  }

  if (label === "存在隐患" || label === "异常" || label === "已驳回") {
    return "inspection-risk-level--danger"
  }

  return "inspection-risk-level--neutral"
}

function getRiskLevelIcon(label: string) {
  if (label === "正常") {
    return "ri-checkbox-circle-line"
  }

  if (label === "轻微风险") {
    return "ri-alert-line"
  }

  if (label === "存在隐患" || label === "异常" || label === "已驳回") {
    return "ri-error-warning-line"
  }

  return "ri-question-line"
}

function getCategoryAccentStyle(index: number): Record<string, string> {
  return {
    "--category-accent": categoryAccentColors[index % categoryAccentColors.length],
  }
}

function groupReportItemsByRiskLevel<TItem extends InspectionReportItem>(items: TItem[]): ReportItemRiskLevelGroup<TItem>[] {
  const riskLevelMap = new Map<string, Map<string, TItem[]>>()

  items.forEach((item) => {
    const riskLevel = item.resultLabel.trim() || "未反馈"
    const categoryName = item.categoryName.trim() || "未分类"
    let categoryMap = riskLevelMap.get(riskLevel)

    if (!categoryMap) {
      categoryMap = new Map<string, TItem[]>()
      riskLevelMap.set(riskLevel, categoryMap)
    }

    categoryMap.set(categoryName, [...(categoryMap.get(categoryName) ?? []), item])
  })

  return Array.from(riskLevelMap.entries())
    .map(([riskLevel, categoryMap]) => {
      const categories = Array.from(categoryMap.entries()).map(([categoryName, categoryItems]) => ({
        categoryName,
        items: categoryItems,
      }))

      return {
        riskLevel,
        categories,
        totalItems: categories.reduce((sum, category) => sum + category.items.length, 0),
      }
    })
    .sort((current, next) => getRiskLevelOrder(current.riskLevel) - getRiskLevelOrder(next.riskLevel))
}

function getRiskLevelOrder(label: string) {
  const orderIndex = resultOrder.indexOf(label)

  return orderIndex === -1 ? resultOrder.length : orderIndex
}

function moduleIs(module: ReportTemplateModule, key: ReportTemplateModule["key"]) {
  return module.key === key
}

function displayItemValue(value: unknown, fallback = "-") {
  if (typeof value === "string") {
    return value.trim() || fallback
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function shouldShowItemSuggestion(item: InspectionReportItem) {
  return item.resultLabel !== "正常" && displayItemValue(item.suggestContent, "") !== ""
}
</script>

<template>
  <article
    class="inspection-report-document mx-auto w-full max-w-5xl px-4 py-8"
    :class="{ 'inspection-report-document--pdf': variant === 'pdf' }"
  >
    <div class="report-document-shell relative overflow-hidden rounded-xl bg-background shadow-(--shadow-card)">
      <div class="report-cover-grid relative z-10 grid gap-6 px-5 py-7 sm:px-8 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-8">
        <div class="min-w-0 space-y-5">
          <div class="flex items-center gap-3">
            <img
              :src="reportLogoUrl"
              alt="宝京云维 logo"
              class="size-12 shrink-0 object-contain"
            >
            <div class="min-w-0">
              <p class="text-sm font-semibold text-foreground">宝京云维</p>
              <p class="mt-0.5 text-xs text-muted-foreground">{{ report.template.templateName }}</p>
            </div>
          </div>

          <div class="max-w-3xl space-y-3">
            <h1 class="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              {{ report.snapshot.title }}
            </h1>
            <p class="text-base leading-7 text-muted-foreground">
              {{ report.snapshot.customerName }} · {{ report.snapshot.parkName }}
            </p>
          </div>
        </div>

        <dl class="report-cover-meta grid gap-4 rounded-lg bg-muted/60 p-4 text-sm shadow-[inset_0_0_0_1px_var(--border)]">
          <div>
            <dt class="text-muted-foreground">检测建筑</dt>
            <dd class="mt-1 font-medium text-foreground">{{ reportBuildingName }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">报告日期</dt>
            <dd class="mt-1 font-medium tabular-nums text-foreground">{{ report.snapshot.reportDate }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">工单编号</dt>
            <dd class="mt-1 font-medium tabular-nums text-foreground">{{ report.snapshot.orderNo }}</dd>
          </div>
        </dl>
      </div>

      <div class="relative divide-y divide-border/70">
        <section
          v-for="module in reportBodyModules"
          :key="module.key"
          class="report-module-section px-5 py-7 sm:px-8"
          :class="{ 'report-items-module-section': moduleIs(module, 'buildings') }"
        >
          <template v-if="moduleIs(module, 'summary')">
            <div class="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 class="text-xl font-semibold text-foreground">{{ module.title }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">检测工单与客户基础信息</p>
              </div>
              <span class="rounded-md px-2.5 py-1 text-sm font-medium" :class="getResultClass(report.snapshot.statusLabel)">
                {{ report.snapshot.statusLabel }}
              </span>
            </div>

            <dl class="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt class="text-muted-foreground">检测服务</dt>
                <dd class="mt-1 font-medium text-foreground">{{ report.snapshot.serviceName }}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">检测计划</dt>
                <dd class="mt-1 font-medium text-foreground">{{ report.snapshot.planName }}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">客户名称</dt>
                <dd class="mt-1 font-medium text-foreground">{{ report.snapshot.customerName }}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">园区</dt>
                <dd class="mt-1 font-medium text-foreground">{{ report.snapshot.parkName }}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">截止时间</dt>
                <dd class="mt-1 font-medium text-foreground">{{ report.snapshot.deadline }}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">地址</dt>
                <dd class="mt-1 font-medium text-foreground">{{ report.snapshot.address }}</dd>
              </div>
            </dl>
          </template>

          <template v-else-if="moduleIs(module, 'score')">
            <div class="mb-5">
              <h2 class="text-xl font-semibold text-foreground">{{ module.title }}</h2>
              <p class="mt-1 text-sm text-muted-foreground">检测结论、分数和完成度概览</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-lg bg-muted/60 p-4">
                <p class="text-sm text-muted-foreground">综合分数</p>
                <p class="mt-3 text-3xl font-semibold tabular-nums text-foreground">{{ report.snapshot.scoreText }}</p>
              </div>
              <div class="rounded-lg bg-muted/60 p-4">
                <p class="text-sm text-muted-foreground">检测结果</p>
                <p class="mt-3 text-xl font-semibold text-foreground">{{ report.snapshot.resultLabel }}</p>
              </div>
              <div class="rounded-lg bg-muted/60 p-4">
                <p class="text-sm text-muted-foreground">完成度</p>
                <p class="mt-3 text-3xl font-semibold tabular-nums text-foreground">{{ completionText }}</p>
              </div>
              <div class="rounded-lg bg-muted/60 p-4">
                <p class="text-sm text-muted-foreground">风险问题</p>
                <p class="mt-3 text-3xl font-semibold tabular-nums text-foreground">{{ report.snapshot.issueItems }}</p>
              </div>
            </div>
          </template>

          <template v-else-if="moduleIs(module, 'aiSummary')">
            <div class="mb-5">
              <div>
                <h2 class="text-xl font-semibold text-foreground">{{ module.title }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">根据当前建筑检测结果生成的智能总结</p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="grid gap-4 lg:grid-cols-2">
                <article class="rounded-lg bg-brand-surface/65 p-4 shadow-[inset_0_0_0_1px_var(--border)]">
                  <div class="mb-3 inline-flex size-9 items-center justify-center rounded-md bg-background text-link shadow-(--shadow-border)">
                    <i class="ri-sparkling-line text-lg" />
                  </div>
                  <h3 class="text-sm font-semibold text-foreground">综合结论</h3>
                  <p class="mt-2 text-sm leading-6 text-muted-foreground">
                    {{ report.snapshot.aiSummary.conclusion }}
                  </p>
                </article>

                <div class="grid gap-3">
                  <article class="rounded-lg bg-muted/55 p-4">
                    <div class="mb-3 inline-flex size-9 items-center justify-center rounded-md bg-background text-link shadow-(--shadow-border)">
                      <i class="ri-user-star-line text-lg" />
                    </div>
                    <h3 class="text-sm font-semibold text-foreground">专家建议</h3>
                    <p class="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                      {{ report.snapshot.remark || "暂无专家建议。" }}
                    </p>
                  </article>

                  <article class="rounded-lg bg-muted/55 p-4">
                    <h3 class="text-sm font-semibold text-foreground">关键发现</h3>
                    <ul class="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                      <li
                        v-for="highlight in report.snapshot.aiSummary.highlights"
                        :key="highlight"
                        class="flex gap-2"
                      >
                        <i class="ri-checkbox-circle-line mt-1 text-sm text-link" />
                        <span>{{ highlight }}</span>
                      </li>
                    </ul>
                  </article>
                </div>
              </div>

              <article class="rounded-lg bg-muted/55 p-4">
                <h3 class="text-sm font-semibold text-foreground">处理建议</h3>
                <ul class="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  <li
                    v-for="suggestion in report.snapshot.aiSummary.suggestions"
                    :key="suggestion"
                    class="flex gap-2"
                  >
                    <i class="ri-arrow-right-circle-line mt-1 text-sm text-link" />
                    <span>{{ suggestion }}</span>
                  </li>
                </ul>
              </article>
            </div>
          </template>

          <template v-else-if="moduleIs(module, 'buildings')">
            <div class="mb-5">
              <h2 class="text-xl font-semibold text-foreground">{{ module.title }}</h2>
            </div>

            <div v-if="reportItemRiskLevelGroups.length" class="report-risk-level-list space-y-5">
              <section
                v-for="group in reportItemRiskLevelGroups"
                :key="group.riskLevel"
                class="inspection-risk-level"
                :class="getRiskLevelToneClass(group.riskLevel)"
              >
                <header class="risk-level-header">
                  <div class="flex min-w-0 items-center gap-3">
                    <span class="risk-level-icon" aria-hidden="true">
                      <i :class="getRiskLevelIcon(group.riskLevel)" />
                    </span>
                    <div class="min-w-0">
                      <p class="risk-level-eyebrow">风险等级</p>
                      <div class="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 class="truncate text-base font-semibold leading-6 text-foreground">{{ group.riskLevel }}</h3>
                        <span class="text-xs text-muted-foreground">{{ group.categories.length }} 个分类</span>
                        <span class="text-xs text-muted-foreground" aria-hidden="true">·</span>
                        <span class="text-xs text-muted-foreground">{{ group.totalItems }} 项</span>
                      </div>
                    </div>
                  </div>
                </header>

                <div class="mt-5 space-y-4">
                  <section
                    v-for="(category, categoryIndex) in group.categories"
                    :key="`${group.riskLevel}-${category.categoryName}`"
                    class="inspection-category-block"
                    :style="getCategoryAccentStyle(categoryIndex)"
                  >
                    <header class="inspection-category-header">
                      <div class="category-title-wrap">
                        <span class="category-accent" aria-hidden="true" />
                        <div class="min-w-0">
                          <p class="category-eyebrow">检测分类</p>
                          <div class="flex min-w-0 flex-wrap items-center gap-2">
                            <h4 class="truncate text-base font-semibold leading-6 text-foreground">{{ category.categoryName }}</h4>
                            <span class="text-xs text-muted-foreground" aria-hidden="true">·</span>
                            <span class="text-xs font-medium text-muted-foreground">{{ category.items.length }} 项</span>
                          </div>
                        </div>
                      </div>
                    </header>

                    <div class="inspection-category-items">
                      <article
                        v-for="item in category.items"
                        :key="`${group.riskLevel}-${category.categoryName}-${item.key}`"
                        class="inspection-report-item inspection-item-card"
                      >
                        <header class="inspection-item-card__header">
                          <div class="inspection-item-title-wrap">
                            <span class="inspection-item-risk-chip">
                              <i :class="getRiskLevelIcon(item.resultLabel)" />
                              {{ displayItemValue(item.resultLabel, group.riskLevel) }}
                            </span>
                            <h5 class="min-w-0 text-base font-semibold leading-6 text-foreground">{{ item.name }}</h5>
                          </div>
                          <div class="inspection-item-score">
                            <span>扣分数</span>
                            <strong>{{ displayItemValue(item.scoreText) }}</strong>
                          </div>
                        </header>

                        <div class="inspection-item-card__body">
                          <div class="inspection-item-field-grid">
                            <div class="inspection-item-field">
                              <span>影响评估</span>
                              <p class="report-item-content">{{ displayItemValue(item.content) }}</p>
                            </div>
                            <div class="inspection-item-field">
                              <span>测量内容</span>
                              <p class="report-item-content">{{ displayItemValue(item.measureContent, "暂无") }}</p>
                            </div>
                          </div>

                          <section v-if="shouldShowItemSuggestion(item)" class="inspection-item-ai">
                            <div class="inspection-item-ai__icon" aria-hidden="true">
                              <i class="ri-sparkling-line" />
                            </div>
                            <div class="min-w-0">
                              <p class="inspection-item-ai__title">AI 建议</p>
                              <p class="inspection-item-ai__content">
                                {{ displayItemValue(item.suggestContent, "暂无") }}
                              </p>
                            </div>
                          </section>
                        </div>
                      </article>
                    </div>
                  </section>
                </div>
              </section>
            </div>
            <div v-else class="rounded-lg bg-muted/55 p-4 text-sm text-muted-foreground">
              当前建筑暂无检测项数据。
            </div>
          </template>
        </section>
      </div>
    </div>
  </article>
</template>

<style scoped>
.inspection-report-document {
  background: transparent;
}

.inspection-risk-level {
  --risk-rgb: 100 116 139;
  --category-accent: 37 99 235;
}

.inspection-risk-level--danger {
  --risk-rgb: 220 38 38;
}

.inspection-risk-level--warning {
  --risk-rgb: 217 119 6;
}

.inspection-risk-level--success {
  --risk-rgb: 22 163 74;
}

.inspection-risk-level--neutral {
  --risk-rgb: 100 116 139;
}

.risk-level-header,
.inspection-category-header,
.inspection-report-item {
  break-inside: avoid;
  page-break-inside: avoid;
}

.risk-level-header,
.inspection-category-header {
  break-after: avoid;
  page-break-after: avoid;
}

.inspection-report-item {
  overflow-wrap: anywhere;
}

.risk-level-header {
  align-items: center;
  background:
    linear-gradient(135deg, rgb(var(--risk-rgb) / 0.1), var(--background)),
    var(--background);
  border: 1px solid rgb(var(--risk-rgb) / 0.2);
  border-radius: 8px;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 0.875rem 1rem;
}

.risk-level-icon {
  align-items: center;
  background: rgb(var(--risk-rgb) / 0.13);
  border: 1px solid rgb(var(--risk-rgb) / 0.16);
  border-radius: 8px;
  color: rgb(var(--risk-rgb));
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 1.25rem;
  height: 2.25rem;
  justify-content: center;
  width: 2.25rem;
}

.risk-level-eyebrow,
.category-eyebrow {
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1rem;
}

.risk-level-stats {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(2, minmax(4.5rem, auto));
}

.risk-level-stats div {
  background: rgb(255 255 255 / 0.72);
  border: 1px solid rgb(var(--risk-rgb) / 0.14);
  border-radius: 6px;
  min-width: 4.5rem;
  padding: 0.375rem 0.625rem;
}

.risk-level-stats dt {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  line-height: 1rem;
}

.risk-level-stats dd {
  color: var(--foreground);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  line-height: 1.25rem;
  margin-top: 0.125rem;
}

.inspection-category-block {
  background: transparent;
}

.inspection-category-header {
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 0 0 0.75rem;
}

.category-title-wrap {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  min-width: 0;
}

.category-accent {
  background: rgb(var(--category-accent) / 0.88);
  border-radius: 999px;
  box-shadow: 0 0 0 3px rgb(var(--category-accent) / 0.1);
  flex: 0 0 auto;
  height: 1.25rem;
  width: 0.25rem;
}

.category-count-pill {
  background: rgb(246 245 244 / 0.55);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted-foreground);
  flex: 0 0 auto;
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1rem;
  padding: 0.25rem 0.5rem;
}

.inspection-category-items {
  display: grid;
  gap: 0.75rem;
  padding: 0;
}

.inspection-item-card {
  background: var(--background);
  border: 1px solid var(--border);
  border-left: 3px solid rgb(var(--risk-rgb) / 0.76);
  border-radius: 8px;
  box-shadow:
    0 1px 2px rgb(15 23 42 / 0.04),
    0 12px 24px -22px rgb(15 23 42 / 0.42);
  overflow: hidden;
}

.inspection-item-card__header {
  align-items: center;
  background: var(--background);
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 0.875rem;
  justify-content: space-between;
  padding: 0.875rem 1rem;
}

.inspection-item-title-wrap {
  align-items: center;
  display: flex;
  gap: 0.625rem;
  min-width: 0;
}

.inspection-item-risk-chip {
  align-items: center;
  background: rgb(var(--risk-rgb) / 0.12);
  border: 1px solid rgb(var(--risk-rgb) / 0.16);
  border-radius: 6px;
  color: rgb(var(--risk-rgb));
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.75rem;
  font-weight: 650;
  gap: 0.25rem;
  line-height: 1rem;
  max-width: 100%;
  padding: 0.25rem 0.5rem;
}

.inspection-item-score {
  align-items: baseline;
  background: rgb(246 245 244 / 0.52);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.375rem;
  padding: 0.3125rem 0.5rem;
  white-space: nowrap;
}

.inspection-item-score span {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  line-height: 1rem;
}

.inspection-item-score strong {
  color: var(--foreground);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1rem;
}

.inspection-item-card__body {
  display: grid;
  gap: 0.875rem;
  padding: 1rem;
}

.inspection-item-field-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.inspection-item-field {
  background: rgb(246 245 244 / 0.28);
  border: 1px solid var(--border);
  border-radius: 6px;
  min-width: 0;
  padding: 0.75rem;
}

.inspection-item-field span {
  color: var(--muted-foreground);
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1rem;
}

.report-item-content {
  color: var(--muted-foreground);
  font-size: 0.875rem;
  line-height: 1.65;
  margin-top: 0.375rem;
  text-wrap: pretty;
  white-space: pre-line;
}

.inspection-item-ai {
  background: #f2f9ff;
  border: 1px solid rgb(0 117 222 / 0.18);
  border-left: 3px solid rgb(0 117 222 / 0.72);
  border-radius: 8px;
  display: flex;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.875rem;
}

.inspection-item-ai__icon {
  align-items: center;
  background: rgb(255 255 255 / 0.8);
  border: 1px solid rgb(0 117 222 / 0.16);
  border-radius: 6px;
  color: var(--link);
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 1rem;
  height: 1.875rem;
  justify-content: center;
  width: 1.875rem;
}

.inspection-item-ai__title {
  color: var(--link);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.125rem;
}

.inspection-item-ai__content {
  color: var(--foreground);
  font-size: 0.875rem;
  line-height: 1.7;
  margin-top: 0.375rem;
  text-wrap: pretty;
  white-space: pre-line;
}

@media (max-width: 900px) {
  .inspection-item-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .risk-level-header,
  .inspection-category-header,
  .inspection-item-card__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .inspection-item-title-wrap {
    align-items: flex-start;
    flex-direction: column;
  }

  .risk-level-stats,
  .inspection-item-score {
    width: 100%;
  }

  .risk-level-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .inspection-item-score {
    justify-content: space-between;
  }
}

.inspection-report-document--pdf {
  background: #ffffff !important;
  color: #111827 !important;
  max-width: none !important;
  padding: 0 !important;
}

.inspection-report-document--pdf,
.inspection-report-document--pdf * {
  background-image: none !important;
  box-shadow: none !important;
  text-shadow: none !important;
}

.inspection-report-document--pdf * {
  border-color: rgb(0 0 0 / 0.12) !important;
}

.inspection-report-document--pdf .report-document-shell {
  background: #ffffff !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.inspection-report-document--pdf .report-cover-grid {
  align-items: start !important;
  display: grid !important;
  gap: 28px !important;
  grid-template-columns: minmax(0, 1fr) 260px !important;
}

.inspection-report-document--pdf .report-cover-meta {
  background: #f6f5f4 !important;
  border: 1px solid rgb(0 0 0 / 0.12) !important;
  box-shadow: none !important;
  padding: 14px !important;
}

.inspection-report-document--pdf .report-module-section {
  break-inside: avoid;
  page-break-inside: avoid;
}

.inspection-report-document--pdf .report-items-module-section {
  break-inside: auto;
  page-break-inside: auto;
}

.inspection-report-document--pdf .inspection-risk-level {
  break-inside: auto;
  page-break-inside: auto;
}

.inspection-report-document--pdf .risk-level-header {
  background: #ffffff !important;
  border-color: rgb(0 0 0 / 0.16) !important;
  padding: 12px 14px !important;
}

.inspection-report-document--pdf .inspection-category-block {
  background: #ffffff !important;
  box-shadow: none !important;
  break-inside: auto;
  page-break-inside: auto;
}

.inspection-report-document--pdf .inspection-category-header {
  background: transparent !important;
  padding: 0 0 10px !important;
}

.inspection-report-document--pdf .inspection-category-items {
  display: block !important;
  padding: 0 !important;
}

.inspection-report-document--pdf .inspection-report-item {
  background: #ffffff !important;
  border: 1px solid rgb(0 0 0 / 0.12) !important;
  border-left: 3px solid rgb(0 0 0 / 0.2) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.inspection-report-document--pdf .inspection-report-item + .inspection-report-item {
  margin-top: 14px !important;
}

.inspection-report-document--pdf .inspection-item-card__header,
.inspection-report-document--pdf .inspection-item-field,
.inspection-report-document--pdf .inspection-item-ai {
  background: #f6f5f4 !important;
  border: 1px solid rgb(0 0 0 / 0.1) !important;
}

.inspection-report-document--pdf .inspection-item-field-grid {
  grid-template-columns: minmax(0, 1fr) !important;
}

.inspection-report-document--pdf .report-item-content,
.inspection-report-document--pdf .inspection-item-ai__content {
  color: rgb(0 0 0 / 0.7) !important;
}

.inspection-report-document--pdf .text-link,
.inspection-report-document--pdf .inspection-item-ai__icon,
.inspection-report-document--pdf .inspection-item-ai__title {
  color: #0075de !important;
}

@media print {
  @page {
    margin: 14mm;
  }

  .inspection-report-document {
    max-width: none !important;
    padding: 0 !important;
  }

  .report-document-shell {
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .report-cover-grid {
    align-items: start !important;
    display: grid !important;
    gap: 28px !important;
    grid-template-columns: minmax(0, 1fr) 260px !important;
  }

  .report-cover-meta {
    background: #f6f5f4 !important;
    border: 1px solid rgb(0 0 0 / 0.12) !important;
    box-shadow: none !important;
    padding: 14px !important;
  }

  .report-module-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .report-items-module-section {
    break-inside: auto;
    page-break-inside: auto;
  }

  .inspection-risk-level {
    break-inside: auto;
    page-break-inside: auto;
  }

  .risk-level-header {
    background: #ffffff !important;
    border-color: rgb(0 0 0 / 0.16) !important;
    padding: 12px 14px !important;
  }

  .inspection-category-block {
    background: #ffffff !important;
    box-shadow: none !important;
    break-inside: auto;
    page-break-inside: auto;
  }

  .inspection-category-header {
    background: transparent !important;
    padding: 0 0 10px !important;
  }

  .inspection-category-items {
    display: block !important;
    padding: 0 !important;
  }

  .inspection-report-item {
    background: #ffffff !important;
    border: 1px solid rgb(0 0 0 / 0.12) !important;
    border-left: 3px solid rgb(0 0 0 / 0.2) !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .inspection-report-item + .inspection-report-item {
    margin-top: 14px !important;
  }

  .inspection-item-card__header,
  .inspection-item-field,
  .inspection-item-ai {
    background: #f6f5f4 !important;
    border: 1px solid rgb(0 0 0 / 0.1) !important;
  }

  .inspection-item-field-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .report-item-content,
  .inspection-item-ai__content {
    color: rgb(0 0 0 / 0.7) !important;
  }
}
</style>
