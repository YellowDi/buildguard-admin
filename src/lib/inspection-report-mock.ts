import type { CustomerDetailResult } from "@/lib/customers-api"
import { getWorkOrderStatusLabel } from "@/lib/work-order-status"
import type {
  WorkOrderBuildInfo,
  WorkOrderBuildInspectionItem,
  WorkOrderDetailResult,
  WorkOrderGnReportResult,
} from "@/lib/work-orders-api"

export type ReportTemplateModuleKey =
  | "cover"
  | "summary"
  | "score"
  | "aiSummary"
  | "expertAdvice"
  | "buildings"
  | "risks"
  | "attachments"
  | "footer"

export type ReportTemplateModule = {
  key: ReportTemplateModuleKey
  title: string
  description: string
  enabled: boolean
}

export type ReportTemplateConfig = {
  templateName: string
  footerText: string
  watermarkText: string
  modules: ReportTemplateModule[]
  updatedAt: string
}

export type InspectionReportCreateInput = {
  title: string
  reportDate: string
  accessPassword?: string
  remark: string
  workOrder: WorkOrderDetailResult
  building: WorkOrderBuildInfo
  customer: CustomerDetailResult | null
}

export type InspectionReportGnCreateInput = {
  title: string
  reportDate: string
  buildUuid?: string
  persist?: boolean
  report: WorkOrderGnReportResult
  version?: number
  workOrderUuid?: string
}

export type InspectionReportSnapshot = {
  title: string
  reportDate: string
  remark: string
  orderNo: string
  serviceName: string
  planName: string
  customerName: string
  parkName: string
  address: string
  deadline: string
  statusLabel: string
  resultLabel: string
  scoreText: string
  totalBuildings: number
  totalItems: number
  completedItems: number
  issueItems: number
  aiSummary: InspectionReportAiSummary
  buildings: InspectionReportBuilding[]
  risks: InspectionReportRiskItem[]
}

export type InspectionReportAiSummary = {
  conclusion: string
  highlights: string[]
  suggestions: string[]
}

export type InspectionReportBuilding = {
  key: string
  name: string
  scoreText: string
  resultLabel: string
  completedCount: number
  totalCount: number
  items: InspectionReportItem[]
}

export type InspectionReportItem = {
  key: string
  name: string
  categoryName: string
  content: string
  measureContent?: string
  suggestContent?: string
  resultLabel: string
  scoreText: string
  executorName: string
}

export type InspectionReportRiskItem = InspectionReportItem & {
  buildingName: string
}

export type InspectionReportRecord = {
  id: string
  createdAt: string
  accessPassword?: string
  buildUuid?: string
  fileUrl?: string
  template: ReportTemplateConfig
  version?: number
  workOrderUuid?: string
  snapshot: InspectionReportSnapshot
}

const REPORT_STORAGE_KEY = "buildguard:inspection-reports"
const TEMPLATE_STORAGE_KEY = "buildguard:report-template"
const REPORT_BRAND_TEXT = "宝京云维"
const LEGACY_REPORT_BRAND_TEXT = "BuildGuard"
const LEGACY_REPORT_ITEMS_MODULE_TITLE = "建筑与检测项"
const LEGACY_REPORT_ITEMS_MODULE_DESCRIPTION = "展示当前建筑的检测项、分类、结果和执行人。"
const DEFAULT_REPORT_MODULE_ORDER: ReportTemplateModuleKey[] = [
  "cover",
  "summary",
  "score",
  "aiSummary",
  "expertAdvice",
  "buildings",
  "attachments",
  "footer",
]
const PRE_AI_REPORT_MODULE_ORDER: ReportTemplateModuleKey[] = [
  "cover",
  "summary",
  "score",
  "risks",
  "buildings",
  "attachments",
  "footer",
]
const PRE_EXPERT_ADVICE_REPORT_MODULE_ORDER: ReportTemplateModuleKey[] = [
  "cover",
  "summary",
  "score",
  "aiSummary",
  "risks",
  "buildings",
  "attachments",
  "footer",
]
const LEGACY_DEFAULT_REPORT_MODULE_ORDER: ReportTemplateModuleKey[] = [
  "cover",
  "summary",
  "score",
  "buildings",
  "risks",
  "attachments",
  "footer",
]

export const DEFAULT_REPORT_TEMPLATE_CONFIG: ReportTemplateConfig = {
  templateName: "检测报告标准模板",
  footerText: "本报告基于现场检测工单数据自动生成，仅用于客户安全管理和整改跟踪。",
  watermarkText: REPORT_BRAND_TEXT,
  updatedAt: "2026-05-18 00:00",
  modules: [
    {
      key: "cover",
      title: "报告封面",
      description: "展示报告标题、客户、园区和报告日期。",
      enabled: true,
    },
    {
      key: "summary",
      title: "工单摘要",
      description: "展示检测服务、计划、状态、截止时间等基础信息。",
      enabled: true,
    },
    {
      key: "score",
      title: "评分结果",
      description: "汇总得分、检测项完成度、异常数量和整体结论。",
      enabled: true,
    },
    {
      key: "aiSummary",
      title: "AI 总结",
      description: "基于当前建筑检测结果生成结论、关键发现和处理建议。",
      enabled: true,
    },
    {
      key: "expertAdvice",
      title: "专家建议",
      description: "展示生成报告时填写的专家处理建议。",
      enabled: true,
    },
    {
      key: "buildings",
      title: "检测项",
      description: "按风险等级和分类展示当前建筑的检测项、扣分数和影响评估。",
      enabled: true,
    },
    {
      key: "attachments",
      title: "附件与图片",
      description: "预留现场照片、测量记录和附件清单位置。",
      enabled: true,
    },
    {
      key: "footer",
      title: "页脚说明",
      description: "展示模板页脚说明、水印和生成时间。",
      enabled: true,
    },
  ],
}

export function loadReportTemplateConfig(): ReportTemplateConfig {
  const stored = readStoredValue<Partial<ReportTemplateConfig>>(TEMPLATE_STORAGE_KEY)
  return normalizeTemplateConfig(stored)
}

export function saveReportTemplateConfig(config: ReportTemplateConfig) {
  writeStoredValue(TEMPLATE_STORAGE_KEY, normalizeTemplateConfig({
    ...config,
    updatedAt: formatDateTime(new Date()),
  }))
}

export function createInspectionReportMock(input: InspectionReportCreateInput): InspectionReportRecord {
  const template = loadReportTemplateConfig()
  const record: InspectionReportRecord = {
    id: createReportId(),
    createdAt: formatDateTime(new Date()),
    ...(input.accessPassword ? { accessPassword: input.accessPassword } : {}),
    buildUuid: toText(input.building.BuildUuid, ""),
    workOrderUuid: toText(input.workOrder.Uuid, ""),
    template,
    snapshot: buildInspectionReportSnapshot(input),
  }
  const records = loadInspectionReportRecords()

  records.unshift(record)
  writeStoredValue(REPORT_STORAGE_KEY, records.slice(0, 50))

  return record
}

export function createInspectionReportFromGnReport(input: InspectionReportGnCreateInput): InspectionReportRecord {
  const template = loadReportTemplateConfig()
  const record: InspectionReportRecord = {
    id: createReportId(),
    createdAt: formatDateTime(new Date()),
    buildUuid: toText(input.buildUuid, toText(input.report.BuildUuid, "")),
    template,
    version: typeof input.version === "number" && Number.isFinite(input.version) ? input.version : undefined,
    workOrderUuid: toText(input.workOrderUuid, ""),
    snapshot: buildInspectionReportSnapshotFromGnReport(input),
  }

  if (input.persist !== false) {
    saveInspectionReportRecord(record)
  }

  return record
}

export function saveInspectionReportRecord(record: InspectionReportRecord): InspectionReportRecord {
  const normalizedRecord = normalizeInspectionReportRecord(record)
  const records = loadInspectionReportRecords().filter(item => item.id !== normalizedRecord.id)

  records.unshift(normalizedRecord)
  writeStoredValue(REPORT_STORAGE_KEY, records.slice(0, 50))

  return normalizedRecord
}

export function getInspectionReportMock(reportId: string): InspectionReportRecord | null {
  const id = reportId.trim()

  if (!id) {
    return null
  }

  return loadInspectionReportRecords().find(record => record.id === id) ?? null
}

export function getLatestInspectionReportRecord(criteria: {
  buildUuid?: string
  orderNo?: string
  workOrderUuid?: string
}): InspectionReportRecord | null {
  const buildUuid = criteria.buildUuid?.trim() ?? ""
  const orderNo = criteria.orderNo?.trim() ?? ""
  const workOrderUuid = criteria.workOrderUuid?.trim() ?? ""

  if (!buildUuid && !orderNo && !workOrderUuid) {
    return null
  }

  return loadInspectionReportRecords().find(record => (
    matchesInspectionReportLookup(record, { buildUuid, orderNo, workOrderUuid })
  )) ?? null
}

export function updateInspectionReportFileUrl(reportId: string, fileUrl: string): InspectionReportRecord | null {
  const id = reportId.trim()
  const normalizedFileUrl = fileUrl.trim()

  if (!id || !normalizedFileUrl) {
    return null
  }

  const records = loadInspectionReportRecords()
  const recordIndex = records.findIndex(record => record.id === id)

  if (recordIndex === -1) {
    return null
  }

  const updatedRecord = {
    ...records[recordIndex],
    fileUrl: normalizedFileUrl,
  }

  records.splice(recordIndex, 1, updatedRecord)
  writeStoredValue(REPORT_STORAGE_KEY, records)

  return updatedRecord
}

export function buildInspectionReportUrl(reportId: string) {
  const normalizedBase = normalizeBasePath(import.meta.env.BASE_URL)
  const path = `${normalizedBase}reports/inspection/${encodeURIComponent(reportId)}`

  if (typeof window === "undefined") {
    return path
  }

  return `${window.location.origin}${path}`
}

export function normalizeReportTemplateModuleOrder(modules: ReportTemplateModule[]): ReportTemplateModule[] {
  const moduleKeys = modules.map(module => module.key)

  if (!shouldNormalizeReportModuleOrder(moduleKeys)) {
    return modules
  }

  const moduleByKey = new Map(modules.map(module => [module.key, module]))

  return DEFAULT_REPORT_MODULE_ORDER
    .map(key => moduleByKey.get(key))
    .filter((module): module is ReportTemplateModule => Boolean(module))
}

function shouldNormalizeReportModuleOrder(keys: ReportTemplateModuleKey[]) {
  const knownPreviousOrders = [
    PRE_EXPERT_ADVICE_REPORT_MODULE_ORDER,
    PRE_AI_REPORT_MODULE_ORDER,
    LEGACY_DEFAULT_REPORT_MODULE_ORDER,
  ]

  return knownPreviousOrders.some((order) => {
    const baseKeys = keys.slice(0, order.length)
    const appendedKeys = keys.slice(order.length)

    return matchesModuleOrder(baseKeys, order)
      && appendedKeys.every(key => key === "aiSummary" || key === "expertAdvice")
  })
}

export function createReportQrPlaceholderDataUrl(value: string, title = "报告二维码") {
  if (typeof document === "undefined") {
    return ""
  }

  const canvas = document.createElement("canvas")
  const size = 360
  const padding = 28
  const cells = 21
  const cellSize = Math.floor((size - padding * 2) / cells)
  const offset = Math.floor((size - cellSize * cells) / 2)
  const context = canvas.getContext("2d")

  canvas.width = size
  canvas.height = size

  if (!context) {
    return ""
  }

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, size, size)
  context.fillStyle = "#111827"

  drawFinder(context, offset, offset, cellSize)
  drawFinder(context, offset + cellSize * 14, offset, cellSize)
  drawFinder(context, offset, offset + cellSize * 14, cellSize)

  const seed = hashString(value)
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      if (isFinderCell(x, y)) {
        continue
      }

      const enabled = ((seed + x * 17 + y * 31 + x * y * 7) % 5) < 2
      if (enabled) {
        context.fillRect(offset + x * cellSize, offset + y * cellSize, cellSize - 1, cellSize - 1)
      }
    }
  }

  context.fillStyle = "#ffffff"
  context.fillRect(34, size - 56, size - 68, 28)
  context.fillStyle = "#374151"
  context.font = "12px sans-serif"
  context.textAlign = "center"
  context.fillText(title, size / 2, size - 38)

  return canvas.toDataURL("image/png")
}

function buildInspectionReportSnapshot(input: InspectionReportCreateInput): InspectionReportSnapshot {
  const buildings = normalizeReportBuildings([input.building])
  const totalItems = buildings.reduce((sum, building) => sum + building.totalCount, 0)
  const completedItems = buildings.reduce((sum, building) => sum + building.completedCount, 0)
  const risks = buildings.flatMap(building => building.items
    .filter(item => item.resultLabel !== "正常" && item.resultLabel !== "未反馈")
    .map(item => ({
      ...item,
      buildingName: building.name,
    })))
  const resultLabel = buildings[0]?.resultLabel ?? formatResultLabel(input.workOrder.Result)
  const scoreText = buildings[0]?.scoreText ?? formatScore(input.workOrder.Score)

  return {
    title: input.title.trim(),
    reportDate: input.reportDate.trim(),
    remark: input.remark.trim(),
    orderNo: toText(input.workOrder.OrderNo, "-"),
    serviceName: toText(input.workOrder.ServiceName, toText(input.workOrder.PackageName, "-")),
    planName: toText(input.workOrder.PlanName, "-"),
    customerName: toText(input.customer?.CorpName, toText(input.workOrder.CustomerName, toText(input.workOrder.CorpName, "-"))),
    parkName: toText(input.workOrder.ParkName, "-"),
    address: toText(input.customer?.Address, "-"),
    deadline: formatDateOnly(toText(input.workOrder.Deadline, "-")),
    statusLabel: getWorkOrderStatusLabel(toNumber(input.workOrder.Status), "-"),
    resultLabel,
    scoreText,
    totalBuildings: buildings.length,
    totalItems,
    completedItems,
    issueItems: risks.length,
    aiSummary: buildInspectionReportAiSummary({
      buildingName: buildings[0]?.name ?? "-",
      resultLabel,
      scoreText,
      totalItems,
      completedItems,
      risks,
      items: buildings.flatMap(building => building.items),
    }),
    buildings,
    risks,
  }
}

function buildInspectionReportSnapshotFromGnReport(input: InspectionReportGnCreateInput): InspectionReportSnapshot {
  const report = input.report
  const resultLabel = formatGnReportResultLabel(report.Result)
  const building = normalizeGnReportBuilding(report, resultLabel)
  const buildings = [building]
  const risks = building.items
    .filter(item => isGnReportRiskItem(item))
    .map(item => ({
      ...item,
      buildingName: building.name,
    }))
  const riskNum = toNumber(report.RiskNum) ?? risks.length

  return {
    title: input.title.trim(),
    reportDate: input.reportDate.trim(),
    remark: toText(report.Expert, ""),
    orderNo: toText(report.OrderNo, "-"),
    serviceName: toText(report.ServiceName, "-"),
    planName: toText(report.PlanName, "-"),
    customerName: toText(report.CustomerName, "-"),
    parkName: toText(report.ParkName, "-"),
    address: toText(report.CustomerAddress, "-"),
    deadline: formatDateOnly(toText(report.Deadline, "-")),
    statusLabel: resultLabel,
    resultLabel,
    scoreText: formatScore(report.Score),
    totalBuildings: buildings.length,
    totalItems: building.totalCount,
    completedItems: building.completedCount,
    issueItems: riskNum,
    aiSummary: buildGnReportAiSummary({
      report,
      resultLabel,
      scoreText: formatScore(report.Score),
      totalItems: building.totalCount,
      risks,
    }),
    buildings,
    risks,
  }
}

function normalizeGnReportBuilding(report: WorkOrderGnReportResult, resultLabel: string): InspectionReportBuilding {
  const items = normalizeGnReportItems(report)

  return {
    key: toText(report.BuildUuid, "gn-report-building"),
    name: toText(report.BuildName, "当前建筑"),
    scoreText: formatScore(report.Score),
    resultLabel,
    completedCount: items.length,
    totalCount: items.length,
    items,
  }
}

function normalizeGnReportItems(report: WorkOrderGnReportResult): InspectionReportItem[] {
  const items = Array.isArray(report.Items) ? report.Items : []
  const reportResultLabel = formatGnReportResultLabel(report.Result)

  return items.map((item, index) => {
    const score = toNumber(item.Score)

    return {
      key: `${toText(report.BuildUuid, "gn-report-building")}-item-${index + 1}`,
      name: toText(item.InspectionName, `检测项 ${index + 1}`),
      categoryName: toText(item.CategoryName, "未分类"),
      content: toText(item.Content, "-"),
      measureContent: toText(item.MeasureContent, ""),
      suggestContent: toText(item.SuggestContent, ""),
      resultLabel: formatGnReportItemResult(score, reportResultLabel),
      scoreText: formatDeductionScore(score),
      executorName: "-",
    }
  })
}

function normalizeReportBuildings(value: WorkOrderBuildInfo[] | undefined): InspectionReportBuilding[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((building, buildingIndex) => {
    const items = normalizeReportItems(building.InspectionItems, buildingIndex)
    const totalCount = toNumber(building.ItemTotal) ?? items.length
    const completedCount = toNumber(building.ItemPassTotal)
      ?? items.filter(item => item.resultLabel !== "未反馈").length

    return {
      key: toText(building.BuildUuid, `building-${buildingIndex + 1}`),
      name: toText(building.BuildName, `建筑 ${buildingIndex + 1}`),
      scoreText: formatScore(building.Score),
      resultLabel: formatInspectionItemResult(building.Result),
      completedCount,
      totalCount,
      items,
    }
  })
}

function normalizeReportItems(value: WorkOrderBuildInspectionItem[] | undefined, buildingIndex: number): InspectionReportItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item, itemIndex) => ({
    key: toText(
      item.Uuid,
      toText(item.InspectionItemUuid, `building-${buildingIndex + 1}-item-${itemIndex + 1}`),
    ),
    name: toText(item.InspectionItemName, `检测项 ${itemIndex + 1}`),
    categoryName: toText(item.CategoryName, "未分类"),
    content: toText(item.CategoryContent, "-"),
    measureContent: "",
    suggestContent: "",
    resultLabel: formatInspectionItemResult(item.Result),
    scoreText: formatScore(item.Score ?? item.CategoryScore),
    executorName: toText(item.ExecutorName, toText(item.UserName, "-")),
  }))
}

function loadInspectionReportRecords(): InspectionReportRecord[] {
  const records = readStoredValue<InspectionReportRecord[]>(REPORT_STORAGE_KEY)
  return Array.isArray(records)
    ? records
      .filter(isInspectionReportRecord)
      .map(normalizeInspectionReportRecord)
    : []
}

function normalizeTemplateConfig(
  value: Partial<ReportTemplateConfig> | null | undefined,
  options: { includeMissingModules?: boolean } = {},
): ReportTemplateConfig {
  const includeMissingModules = options.includeMissingModules ?? true
  const defaultModules = DEFAULT_REPORT_TEMPLATE_CONFIG.modules
  const storedModules = Array.isArray(value?.modules) ? value.modules : []
  const moduleByKey = new Map(storedModules.map(module => [module.key, module]))
  const sourceModules = includeMissingModules
    ? defaultModules
    : defaultModules.filter(defaultModule => moduleByKey.has(defaultModule.key))
  const mergedModules = sourceModules.map((defaultModule) => {
    const storedModule = moduleByKey.get(defaultModule.key)

    return {
      ...defaultModule,
      enabled: typeof storedModule?.enabled === "boolean" ? storedModule.enabled : defaultModule.enabled,
      title: normalizeReportModuleTitle(defaultModule.key, storedModule?.title, defaultModule.title),
      description: normalizeReportModuleDescription(defaultModule.key, storedModule?.description, defaultModule.description),
    }
  })
  const orderedKeys = storedModules
    .map(module => module.key)
    .filter((key): key is ReportTemplateModuleKey => defaultModules.some(defaultModule => defaultModule.key === key))
  const orderedModules = normalizeReportTemplateModuleOrder([
    ...orderedKeys
      .map(key => mergedModules.find(module => module.key === key))
      .filter((module): module is ReportTemplateModule => Boolean(module)),
    ...mergedModules.filter(module => !orderedKeys.includes(module.key)),
  ])

  return {
    templateName: toText(value?.templateName, DEFAULT_REPORT_TEMPLATE_CONFIG.templateName),
    footerText: toText(value?.footerText, DEFAULT_REPORT_TEMPLATE_CONFIG.footerText),
    watermarkText: normalizeReportBrandText(value?.watermarkText, DEFAULT_REPORT_TEMPLATE_CONFIG.watermarkText),
    modules: orderedModules,
    updatedAt: toText(value?.updatedAt, DEFAULT_REPORT_TEMPLATE_CONFIG.updatedAt),
  }
}

function normalizeInspectionReportRecord(record: InspectionReportRecord): InspectionReportRecord {
  const hasTemplateSnapshot = Array.isArray(record.template?.modules)
  const recordLike = record as Record<string, unknown>

  return {
    ...record,
    buildUuid: toText(record.buildUuid, toText(recordLike.BuildUuid, record.snapshot?.buildings?.[0]?.key ?? "")),
    fileUrl: toText(record.fileUrl, toText((record as Record<string, unknown>).FileUrl, toText((record as Record<string, unknown>).pdfUrl, ""))),
    template: normalizeTemplateConfig(record.template, { includeMissingModules: !hasTemplateSnapshot }),
    version: toNumber(record.version) ?? toNumber(recordLike.Version) ?? undefined,
    workOrderUuid: toText(record.workOrderUuid, toText(recordLike.WorkOrderUuid, "")),
    snapshot: normalizeInspectionReportSnapshot(record.snapshot),
  }
}

function matchesInspectionReportLookup(
  record: InspectionReportRecord,
  criteria: { buildUuid: string, orderNo: string, workOrderUuid: string },
) {
  const recordBuildUuid = toText(record.buildUuid, record.snapshot.buildings[0]?.key ?? "")
  const recordOrderNo = toText(record.snapshot.orderNo, "")
  const recordWorkOrderUuid = toText(record.workOrderUuid, "")

  if (criteria.buildUuid && recordBuildUuid !== criteria.buildUuid) {
    return false
  }

  if (criteria.workOrderUuid && recordWorkOrderUuid) {
    return recordWorkOrderUuid === criteria.workOrderUuid
  }

  if (criteria.orderNo && recordOrderNo) {
    return recordOrderNo === criteria.orderNo
  }

  return !criteria.workOrderUuid && !criteria.orderNo
}

function normalizeInspectionReportSnapshot(snapshot: InspectionReportSnapshot): InspectionReportSnapshot {
  const buildings = normalizeStoredReportBuildings(snapshot.buildings)
  const risks = normalizeStoredReportRisks(snapshot.risks)

  return {
    ...snapshot,
    buildings,
    risks,
    aiSummary: normalizeInspectionReportAiSummary({
      ...snapshot,
      buildings,
      risks,
    }),
  }
}

function normalizeStoredReportBuildings(value: unknown): InspectionReportBuilding[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(item => item && typeof item === "object")
    .map((item, index) => {
      const building = item as InspectionReportBuilding
      const items = normalizeStoredReportItems(building.items)

      return {
        ...building,
        key: toText(building.key, `building-${index + 1}`),
        name: toText(building.name, `建筑 ${index + 1}`),
        scoreText: toText(building.scoreText, "-"),
        resultLabel: toText(building.resultLabel, "未反馈"),
        completedCount: toNumber(building.completedCount) ?? items.length,
        totalCount: toNumber(building.totalCount) ?? items.length,
        items,
      }
    })
}

function normalizeStoredReportRisks(value: unknown): InspectionReportRiskItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(item => item && typeof item === "object")
    .map((item, index) => {
      const risk = item as InspectionReportRiskItem

      return {
        ...normalizeStoredReportItem(risk, index),
        buildingName: toText(risk.buildingName, "-"),
      }
    })
}

function normalizeStoredReportItems(value: unknown): InspectionReportItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(item => item && typeof item === "object")
    .map((item, index) => normalizeStoredReportItem(item as InspectionReportItem, index))
}

function normalizeStoredReportItem(item: InspectionReportItem, index: number): InspectionReportItem {
  return {
    ...item,
    key: toText(item.key, `report-item-${index + 1}`),
    name: toText(item.name, `检测项 ${index + 1}`),
    categoryName: toText(item.categoryName, "未分类"),
    content: toText(item.content, "-"),
    measureContent: toText(item.measureContent, ""),
    suggestContent: toText(item.suggestContent, ""),
    resultLabel: toText(item.resultLabel, "未反馈"),
    scoreText: toText(item.scoreText, "-"),
    executorName: toText(item.executorName, "-"),
  }
}

function normalizeInspectionReportAiSummary(snapshot: InspectionReportSnapshot): InspectionReportAiSummary {
  const summary = snapshot.aiSummary

  if (
    summary
    && typeof summary.conclusion === "string"
    && Array.isArray(summary.highlights)
    && Array.isArray(summary.suggestions)
  ) {
    return {
      conclusion: summary.conclusion,
      highlights: summary.highlights.map(item => toText(item, "")).filter(Boolean),
      suggestions: summary.suggestions.map(item => toText(item, "")).filter(Boolean),
    }
  }

  return buildInspectionReportAiSummary({
    buildingName: snapshot.buildings[0]?.name ?? "-",
    resultLabel: snapshot.resultLabel,
    scoreText: snapshot.scoreText,
    totalItems: snapshot.totalItems,
    completedItems: snapshot.completedItems,
    risks: snapshot.risks,
    items: snapshot.buildings.flatMap(building => building.items),
  })
}

function buildInspectionReportAiSummary(input: {
  buildingName: string
  resultLabel: string
  scoreText: string
  totalItems: number
  completedItems: number
  risks: InspectionReportRiskItem[]
  items: InspectionReportItem[]
}): InspectionReportAiSummary {
  const completionRate = input.totalItems > 0
    ? `${Math.round((input.completedItems / input.totalItems) * 100)}%`
    : "0%"
  const dominantResult = getDominantResultLabel(input.items)
  const riskCategories = getTopRiskCategories(input.risks)
  const riskText = input.risks.length > 0
    ? `发现 ${input.risks.length} 项需关注问题，建议优先处理 ${riskCategories || "风险检测项"}。`
    : "当前未发现异常或隐患检测项，建议按计划持续复检。"
  const pendingCount = input.items.filter(item => item.resultLabel === "未反馈").length

  return {
    conclusion: `本次检测对象为 ${input.buildingName}，共覆盖 ${input.totalItems} 个检测项，完成率 ${completionRate}，综合结果为 ${input.resultLabel}，评分 ${input.scoreText}。${riskText}`,
    highlights: [
      `检测项完成率 ${completionRate}，已完成 ${input.completedItems}/${input.totalItems} 项。`,
      input.risks.length > 0
        ? `风险问题主要集中在 ${riskCategories || "当前检测项"}。`
        : "风险问题数量为 0，当前建筑整体状态稳定。",
      dominantResult ? `检测结果以「${dominantResult}」为主。` : "暂无可用于统计的检测结果。",
    ],
    suggestions: [
      input.risks.length > 0
        ? "优先安排责任人复核风险项，并在整改后补充处理记录和现场照片。"
        : "保持现有巡检频次，重点关注后续运行状态变化。",
      pendingCount > 0
        ? `仍有 ${pendingCount} 项未反馈，建议补齐执行结果后再归档报告。`
        : "当前检测项均已有结果，可作为阶段性归档材料。",
      "建议结合历史检测记录和现场附件持续跟踪建筑状态变化。",
    ],
  }
}

function buildGnReportAiSummary(input: {
  report: WorkOrderGnReportResult
  resultLabel: string
  scoreText: string
  totalItems: number
  risks: InspectionReportRiskItem[]
}): InspectionReportAiSummary {
  const conclusion = toText(
    input.report.BuildSuggestContent,
    `本次检测共覆盖 ${input.totalItems} 个检测项，综合结果为 ${input.resultLabel}，评分 ${input.scoreText}。`,
  )
  const riskCategories = getTopRiskCategories(input.risks)
  const itemSuggestions = Array.from(new Set(
    (Array.isArray(input.report.Items) ? input.report.Items : [])
      .map(item => toText(item.SuggestContent, ""))
      .filter(Boolean),
  )).slice(0, 3)

  return {
    conclusion,
    highlights: [
      `综合结果为「${input.resultLabel}」，建筑评分 ${input.scoreText}。`,
      input.risks.length > 0
        ? `发现 ${input.risks.length} 项需关注问题，主要集中在 ${riskCategories || "当前检测项"}。`
        : "当前未发现风险检测项。",
      input.totalItems > 0
        ? `本次报告覆盖 ${input.totalItems} 个检测项。`
        : "当前报告暂无检测项明细。",
    ],
    suggestions: itemSuggestions.length
      ? itemSuggestions
      : [
          input.risks.length > 0
            ? "建议优先复核风险检测项，并在处理后补充整改记录。"
            : "建议保持现有巡检频次，持续关注建筑运行状态。",
        ],
  }
}

function getDominantResultLabel(items: InspectionReportItem[]) {
  const counts = new Map<string, number>()

  items.forEach((item) => {
    const label = item.resultLabel.trim()
    if (!label) {
      return
    }

    counts.set(label, (counts.get(label) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .sort((current, next) => next[1] - current[1])[0]?.[0] ?? ""
}

function getTopRiskCategories(risks: InspectionReportRiskItem[]) {
  const counts = new Map<string, number>()

  risks.forEach((risk) => {
    const categoryName = risk.categoryName.trim()
    if (!categoryName || categoryName === "-") {
      return
    }

    counts.set(categoryName, (counts.get(categoryName) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .sort((current, next) => next[1] - current[1])
    .slice(0, 2)
    .map(([categoryName]) => categoryName)
    .join("、")
}

function normalizeReportBrandText(value: unknown, fallback: string) {
  const text = toText(value, fallback)
  return text === LEGACY_REPORT_BRAND_TEXT ? REPORT_BRAND_TEXT : text
}

function normalizeReportModuleTitle(key: ReportTemplateModuleKey, value: unknown, fallback: string) {
  const title = toText(value, fallback)
  return key === "buildings" && title === LEGACY_REPORT_ITEMS_MODULE_TITLE ? fallback : title
}

function normalizeReportModuleDescription(key: ReportTemplateModuleKey, value: unknown, fallback: string) {
  const description = toText(value, fallback)
  return key === "buildings" && description === LEGACY_REPORT_ITEMS_MODULE_DESCRIPTION ? fallback : description
}

function matchesModuleOrder(keys: ReportTemplateModuleKey[], order: ReportTemplateModuleKey[]) {
  return keys.length === order.length && keys.every((key, index) => key === order[index])
}

function readStoredValue<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? JSON.parse(rawValue) as T : null
  } catch {
    return null
  }
}

function writeStoredValue<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function isInspectionReportRecord(value: unknown): value is InspectionReportRecord {
  return Boolean(
    value
    && typeof value === "object"
    && typeof (value as InspectionReportRecord).id === "string"
    && typeof (value as InspectionReportRecord).snapshot === "object",
  )
}

function createReportId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `rpt-${crypto.randomUUID().slice(0, 8)}`
  }

  return `rpt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeBasePath(value: string) {
  const base = value.trim()

  if (!base || base === "/") {
    return "/"
  }

  return `/${base.replace(/^\/+|\/+$/g, "")}/`
}

function formatResultLabel(value: unknown) {
  const result = toNumber(value)

  if (result === null || result === 0) return "未反馈"
  if (result === 1) return "正常"
  if (result === 2) return "异常"
  if (result === 3) return "已驳回"

  return `结果 ${result}`
}

function formatInspectionItemResult(value: unknown) {
  const result = toNumber(value)

  if (result === null || result === 0) return "未反馈"
  if (result === 1) return "正常"
  if (result === 2) return "轻微风险"
  if (result === 3) return "存在隐患"

  return `结果 ${result}`
}

function formatGnReportResultLabel(value: unknown) {
  const result = toNumber(value)

  if (result === 1) return "正常"
  if (result === 2) return "轻微风险"
  if (result === 3) return "存在隐患"
  if (result === null || result === 0) return "未反馈"

  return `结果 ${result}`
}

function formatGnReportItemResult(score: number | null, reportResultLabel: string) {
  if (score !== null && score > 0) {
    return reportResultLabel !== "正常" && reportResultLabel !== "未反馈"
      ? reportResultLabel
      : "存在隐患"
  }

  return "正常"
}

function isGnReportRiskItem(item: InspectionReportItem) {
  return item.resultLabel !== "正常" && item.resultLabel !== "未反馈"
}

function formatScore(value: unknown) {
  const score = toNumber(value)
  return score === null ? "-" : String(score)
}

function formatDeductionScore(value: unknown) {
  const score = toNumber(value)

  if (score === null) {
    return "-"
  }

  if (score <= 0) {
    return "0 分"
  }

  return Number.isInteger(score)
    ? `${score} 分`
    : `${score.toFixed(1).replace(/\.0$/, "")} 分`
}

function formatDateOnly(value: string) {
  const normalized = value.trim()

  if (!normalized || normalized === "-" || normalized === "—") {
    return "-"
  }

  const [datePart] = normalized.split(/[ T]/)
  return datePart || normalized
}

function formatDateTime(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function drawFinder(context: CanvasRenderingContext2D, x: number, y: number, cellSize: number) {
  context.fillStyle = "#111827"
  context.fillRect(x, y, cellSize * 7, cellSize * 7)
  context.fillStyle = "#ffffff"
  context.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5)
  context.fillStyle = "#111827"
  context.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3)
}

function isFinderCell(x: number, y: number) {
  return (x < 8 && y < 8)
    || (x > 12 && y < 8)
    || (x < 8 && y > 12)
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }

  return Math.abs(hash)
}
