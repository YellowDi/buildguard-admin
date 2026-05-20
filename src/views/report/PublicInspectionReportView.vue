<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { toast } from "vue-sonner"

import reportLogoUrl from "@/assets/baojing-yunwei-logo.png"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  buildInspectionReportUrl,
  getInspectionReportMock,
  normalizeReportTemplateModuleOrder,
  verifyInspectionReportPassword,
  type InspectionReportRecord,
  type InspectionReportItem,
  type InspectionReportRiskItem,
  type ReportTemplateModule,
} from "@/lib/inspection-report-mock"

type ReportItemCategoryGroup<TItem extends InspectionReportItem = InspectionReportItem> = {
  categoryName: string
  items: TItem[]
}

type ReportItemRiskLevelGroup<TItem extends InspectionReportItem = InspectionReportItem> = {
  riskLevel: string
  totalItems: number
  categories: ReportItemCategoryGroup<TItem>[]
}

const resultOrder = ["存在隐患", "异常", "已驳回", "轻微风险", "正常", "未反馈"]

const route = useRoute()

const reportId = computed(() => typeof route.params.reportId === "string" ? route.params.reportId.trim() : "")
const report = ref<InspectionReportRecord | null>(getInspectionReportMock(reportId.value))
const password = ref("")
const passwordError = ref("")
const unlocked = ref(false)

const reportUrl = computed(() => reportId.value ? buildInspectionReportUrl(reportId.value) : "")
const enabledModules = computed(() => report.value
  ? normalizeReportTemplateModuleOrder(report.value.template.modules).filter(module => module.enabled)
  : [])
const reportBodyModules = computed(() => enabledModules.value.filter(module => !moduleIs(module, "cover")))
const reportBuildingName = computed(() => report.value?.snapshot.buildings[0]?.name ?? "-")
const reportItemRiskLevelGroups = computed<ReportItemRiskLevelGroup[]>(() => {
  const items = report.value?.snapshot.buildings.flatMap(building => building.items) ?? []

  return groupReportItemsByRiskLevel(items)
})
const reportRiskIssueGroups = computed<ReportItemRiskLevelGroup<InspectionReportRiskItem>[]>(() => {
  return groupReportItemsByRiskLevel(report.value?.snapshot.risks ?? [])
})
const completionText = computed(() => {
  const snapshot = report.value?.snapshot

  if (!snapshot || snapshot.totalItems <= 0) {
    return "0%"
  }

  return `${Math.round((snapshot.completedItems / snapshot.totalItems) * 100)}%`
})

watch(reportId, (id) => {
  report.value = getInspectionReportMock(id)
  password.value = ""
  passwordError.value = ""
  unlocked.value = false
})

function updatePassword(value: string | number) {
  password.value = String(value).replace(/\D/g, "").slice(0, 4)
  passwordError.value = ""
}

function unlockReport() {
  if (!report.value) {
    return
  }

  if (!/^\d{4}$/.test(password.value)) {
    passwordError.value = "请输入 4 位数字密码"
    return
  }

  if (!verifyInspectionReportPassword(report.value.id, password.value)) {
    passwordError.value = "密码不正确，请重新输入"
    return
  }

  unlocked.value = true
  passwordError.value = ""

  if (route.query.print === "1") {
    void nextTick(() => {
      printReport()
    })
  }
}

async function copyReportUrl() {
  if (!reportUrl.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(reportUrl.value)
    toast.success("报告链接已复制")
  } catch {
    toast.error("复制失败，请手动复制浏览器地址")
  }
}

function printReport() {
  window.print()
}

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

function getRiskLevelSectionClass(label: string) {
  if (label === "正常") {
    return "border-success/25 bg-success-surface/45"
  }

  if (label === "轻微风险") {
    return "border-warning/25 bg-warning-surface/45"
  }

  if (label === "存在隐患" || label === "异常" || label === "已驳回") {
    return "border-destructive/25 bg-destructive-surface/55"
  }

  return "border-border bg-muted/35"
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

function displayItemValue(value: string) {
  return value.trim() || "-"
}
</script>

<template>
  <main class="min-h-svh bg-surface-secondary text-foreground">
    <section v-if="!report" class="mx-auto flex min-h-svh w-full max-w-lg items-center px-4">
      <div class="w-full rounded-xl bg-background p-6 text-center shadow-(--shadow-card)">
        <div class="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <i class="ri-file-warning-line text-2xl" />
        </div>
        <h1 class="text-lg font-semibold text-foreground">报告不存在</h1>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">
          当前报告可能尚未生成，或本地 mock 数据已被清理。
        </p>
      </div>
    </section>

    <section
      v-else-if="!unlocked"
      class="mx-auto flex min-h-svh w-full max-w-md items-center px-4"
    >
      <form class="w-full rounded-xl bg-background p-6 shadow-(--shadow-card)" @submit.prevent="unlockReport">
        <div class="mb-6 space-y-2">
          <div class="inline-flex size-11 items-center justify-center rounded-lg bg-brand-surface text-link">
            <i class="ri-lock-password-line text-xl" />
          </div>
          <h1 class="text-xl font-semibold text-foreground">请输入报告访问密码</h1>
          <p class="text-sm leading-6 text-muted-foreground">
            {{ report.snapshot.title }} 已开启访问保护，输入 4 位数字密码后可浏览。
          </p>
        </div>

        <InputOTP
          :model-value="password"
          autocomplete="off"
          class="mt-5 w-full"
          :max-length="4"
          aria-label="报告访问密码"
          inputmode="numeric"
          @complete="unlockReport"
          @update:model-value="updatePassword"
        >
          <InputOTPGroup class="grid w-full grid-cols-4">
            <InputOTPSlot
              v-for="slotIndex in 4"
              :key="slotIndex"
              class="h-16 w-full text-2xl sm:h-[72px] sm:text-3xl"
              :index="slotIndex - 1"
            />
          </InputOTPGroup>
        </InputOTP>

        <p v-if="passwordError" class="mt-3 text-center text-sm text-destructive">{{ passwordError }}</p>
      </form>
    </section>

    <section v-else class="inspection-report-page">
      <div class="report-no-print sticky top-0 z-20 border-b border-border/70 bg-background/92 backdrop-blur">
        <div class="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-foreground">{{ report.snapshot.title }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ reportUrl }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" class="h-8 gap-1 px-3" @click="copyReportUrl">
              <i class="ri-file-copy-line text-base" />
              复制链接
            </Button>
            <Button type="button" class="h-8 gap-1 px-3" @click="printReport">
              <i class="ri-printer-line text-base" />
              打印 PDF
            </Button>
          </div>
        </div>
      </div>

      <article class="mx-auto w-full max-w-5xl px-4 py-8">
        <div class="relative overflow-hidden rounded-xl bg-background shadow-(--shadow-card)">
          <div class="relative z-10 grid gap-6 px-5 py-7 sm:px-8 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-8">
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

            <dl class="grid gap-4 rounded-lg bg-muted/60 p-4 text-sm shadow-[inset_0_0_0_1px_hsl(var(--border)/0.45)]">
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
              :class="{ 'report-items-module-section': moduleIs(module, 'buildings') || moduleIs(module, 'risks') }"
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
                <div class="mb-5 flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 class="text-xl font-semibold text-foreground">{{ module.title }}</h2>
                    <p class="mt-1 text-sm text-muted-foreground">根据当前建筑检测结果生成的模拟总结</p>
                  </div>
                  <span class="inline-flex h-7 items-center rounded-md bg-brand-surface px-2.5 text-xs font-medium text-link">
                    Mock AI
                  </span>
                </div>

                <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <article class="rounded-lg bg-brand-surface/65 p-4 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.45)]">
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
                </div>
              </template>

              <template v-else-if="moduleIs(module, 'expertAdvice')">
                <div class="mb-5">
                  <h2 class="text-xl font-semibold text-foreground">{{ module.title }}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">生成报告时填写的专家处理建议</p>
                </div>

                <article class="rounded-lg bg-muted/55 p-4 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.45)]">
                  <div class="flex gap-3">
                    <div class="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-link shadow-(--shadow-border)">
                      <i class="ri-user-star-line text-lg" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <h3 class="text-sm font-semibold text-foreground">专家建议</h3>
                      <p class="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                        {{ report.snapshot.remark || "暂无专家建议。" }}
                      </p>
                    </div>
                  </div>
                </article>
              </template>

              <template v-else-if="moduleIs(module, 'buildings')">
                <div class="mb-5">
                  <h2 class="text-xl font-semibold text-foreground">{{ module.title }}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">
                    当前建筑：{{ reportBuildingName }}，{{ report.snapshot.totalItems }} 个检测项
                  </p>
                </div>

                <div v-if="reportItemRiskLevelGroups.length" class="report-risk-level-list space-y-5">
                  <section
                    v-for="group in reportItemRiskLevelGroups"
                    :key="group.riskLevel"
                    class="inspection-risk-level rounded-lg border p-4"
                    :class="getRiskLevelSectionClass(group.riskLevel)"
                  >
                    <header class="risk-level-header flex flex-wrap items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="rounded-md px-2.5 py-1 text-sm font-medium" :class="getResultClass(group.riskLevel)">
                            {{ group.riskLevel }}
                          </span>
                          <span class="text-xs text-muted-foreground">{{ group.categories.length }} 个分类</span>
                        </div>
                        <p class="mt-1 text-sm leading-6 text-muted-foreground">
                          同等级检测项按分类归并展示。
                        </p>
                      </div>
                      <span class="rounded-md bg-background/80 px-2.5 py-1 text-sm font-semibold tabular-nums text-foreground shadow-(--shadow-border)">
                        {{ group.totalItems }} 项
                      </span>
                    </header>

                    <div class="mt-4 divide-y divide-border/65">
                      <section
                        v-for="category in group.categories"
                        :key="`${group.riskLevel}-${category.categoryName}`"
                        class="inspection-category-block py-4 first:pt-0 last:pb-0"
                      >
                        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h4 class="text-sm font-semibold text-foreground">{{ category.categoryName }}</h4>
                          <span class="rounded bg-background/75 px-2 py-0.5 text-xs text-muted-foreground">
                            {{ category.items.length }} 项
                          </span>
                        </div>

                        <div class="grid gap-2">
                          <article
                            v-for="item in category.items"
                            :key="`${group.riskLevel}-${category.categoryName}-${item.key}`"
                            class="inspection-report-item rounded-md border border-border/60 bg-background p-3"
                          >
                            <div class="flex flex-wrap items-start justify-between gap-3">
                              <h5 class="min-w-0 flex-1 text-sm font-semibold leading-6 text-foreground">{{ item.name }}</h5>
                              <span class="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                <i class="ri-user-line text-sm" />
                                {{ displayItemValue(item.executorName) }}
                              </span>
                            </div>
                            <p class="mt-2 text-sm leading-6 text-muted-foreground">
                              {{ displayItemValue(item.content) }}
                            </p>
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

              <template v-else-if="moduleIs(module, 'risks')">
                <div class="mb-5">
                  <h2 class="text-xl font-semibold text-foreground">{{ module.title }}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">异常、轻微风险和隐患检测项汇总</p>
                </div>

                <div v-if="reportRiskIssueGroups.length" class="report-risk-level-list space-y-5">
                  <section
                    v-for="group in reportRiskIssueGroups"
                    :key="group.riskLevel"
                    class="inspection-risk-level rounded-lg border p-4"
                    :class="getRiskLevelSectionClass(group.riskLevel)"
                  >
                    <header class="risk-level-header flex flex-wrap items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="rounded-md px-2.5 py-1 text-sm font-medium" :class="getResultClass(group.riskLevel)">
                            {{ group.riskLevel }}
                          </span>
                          <span class="text-xs text-muted-foreground">{{ group.categories.length }} 个分类</span>
                        </div>
                        <p class="mt-1 text-sm leading-6 text-muted-foreground">
                          需关注检测项按分类归并展示。
                        </p>
                      </div>
                      <span class="rounded-md bg-background/80 px-2.5 py-1 text-sm font-semibold tabular-nums text-foreground shadow-(--shadow-border)">
                        {{ group.totalItems }} 项
                      </span>
                    </header>

                    <div class="mt-4 divide-y divide-border/65">
                      <section
                        v-for="category in group.categories"
                        :key="`${group.riskLevel}-${category.categoryName}`"
                        class="inspection-category-block py-4 first:pt-0 last:pb-0"
                      >
                        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h4 class="text-sm font-semibold text-foreground">{{ category.categoryName }}</h4>
                          <span class="rounded bg-background/75 px-2 py-0.5 text-xs text-muted-foreground">
                            {{ category.items.length }} 项
                          </span>
                        </div>

                        <div class="grid gap-2">
                          <article
                            v-for="item in category.items"
                            :key="`${group.riskLevel}-${category.categoryName}-${item.key}`"
                            class="inspection-report-item rounded-md border border-border/60 bg-background p-3"
                          >
                            <div class="flex flex-wrap items-start justify-between gap-3">
                              <h5 class="min-w-0 flex-1 text-sm font-semibold leading-6 text-foreground">{{ item.name }}</h5>
                              <span class="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                <i class="ri-user-line text-sm" />
                                {{ displayItemValue(item.executorName) }}
                              </span>
                            </div>
                            <p class="mt-2 text-sm leading-6 text-muted-foreground">
                              {{ displayItemValue(item.content) }}
                            </p>
                          </article>
                        </div>
                      </section>
                    </div>
                  </section>
                </div>
                <div v-else class="rounded-lg bg-success-surface p-4 text-sm leading-6 text-success">
                  当前报告未发现异常或隐患检测项。
                </div>
              </template>

              <template v-else-if="moduleIs(module, 'attachments')">
                <div class="mb-5">
                  <h2 class="text-xl font-semibold text-foreground">{{ module.title }}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">现场照片、测量记录与附件占位</p>
                </div>

                <div class="grid gap-3 sm:grid-cols-3">
                  <div class="rounded-lg bg-muted/55 p-4">
                    <i class="ri-image-line text-xl text-muted-foreground" />
                    <p class="mt-3 text-sm font-medium text-foreground">现场照片</p>
                    <p class="mt-1 text-sm leading-5 text-muted-foreground">待接口接入后展示。</p>
                  </div>
                  <div class="rounded-lg bg-muted/55 p-4">
                    <i class="ri-ruler-line text-xl text-muted-foreground" />
                    <p class="mt-3 text-sm font-medium text-foreground">测量记录</p>
                    <p class="mt-1 text-sm leading-5 text-muted-foreground">待接口接入后展示。</p>
                  </div>
                  <div class="rounded-lg bg-muted/55 p-4">
                    <i class="ri-attachment-2 text-xl text-muted-foreground" />
                    <p class="mt-3 text-sm font-medium text-foreground">报告附件</p>
                    <p class="mt-1 text-sm leading-5 text-muted-foreground">待接口接入后展示。</p>
                  </div>
                </div>
              </template>

              <template v-else-if="moduleIs(module, 'footer')">
                <div class="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>{{ report.template.footerText }}</p>
                  <p>生成时间：{{ report.createdAt }}</p>
                </div>
              </template>
            </section>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.inspection-report-page {
  min-height: 100svh;
}

.inspection-risk-level,
.risk-level-header,
.inspection-category-block,
.inspection-report-item {
  break-inside: avoid;
  page-break-inside: avoid;
}

.inspection-report-item {
  overflow-wrap: anywhere;
}

@media print {
  @page {
    margin: 14mm;
  }

  .report-no-print {
    display: none !important;
  }

  .inspection-report-page {
    background: #ffffff !important;
  }

  .inspection-report-page article {
    max-width: none !important;
    padding: 0 !important;
  }

  .inspection-report-page article > div {
    border-radius: 0 !important;
    box-shadow: none !important;
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
    background: #ffffff !important;
    border-color: rgb(0 0 0 / 0.12) !important;
    box-shadow: none !important;
    padding: 12px !important;
  }

  .inspection-category-block {
    padding-top: 10px !important;
    padding-bottom: 10px !important;
  }

  .inspection-report-item {
    background: #ffffff !important;
    border-color: rgb(0 0 0 / 0.12) !important;
    box-shadow: none !important;
    padding: 8px 10px !important;
  }
}
</style>
