import type { CustomerDetailResult } from "@/lib/customers-api"
import { getWorkOrderStatusLabel } from "@/lib/work-order-status"
import type { WorkOrderBuildInfo, WorkOrderBuildInspectionItem, WorkOrderDetailResult } from "@/lib/work-orders-api"

export type ReportTemplateModuleKey =
  | "cover"
  | "summary"
  | "score"
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
  accessPassword: string
  remark: string
  workOrder: WorkOrderDetailResult
  building: WorkOrderBuildInfo
  customer: CustomerDetailResult | null
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
  buildings: InspectionReportBuilding[]
  risks: InspectionReportRiskItem[]
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
  accessPassword: string
  template: ReportTemplateConfig
  snapshot: InspectionReportSnapshot
}

const REPORT_STORAGE_KEY = "buildguard:inspection-reports"
const TEMPLATE_STORAGE_KEY = "buildguard:report-template"
const REPORT_BRAND_TEXT = "宝京云维"
const LEGACY_REPORT_BRAND_TEXT = "BuildGuard"
const DEFAULT_REPORT_MODULE_ORDER: ReportTemplateModuleKey[] = [
  "cover",
  "summary",
  "score",
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
      key: "risks",
      title: "风险问题",
      description: "聚合异常或待整改检测项，便于客户优先处理。",
      enabled: true,
    },
    {
      key: "buildings",
      title: "建筑与检测项",
      description: "展示当前建筑的检测项、分类、结果和执行人。",
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
    accessPassword: input.accessPassword,
    template,
    snapshot: buildInspectionReportSnapshot(input),
  }
  const records = loadInspectionReportRecords()

  records.unshift(record)
  writeStoredValue(REPORT_STORAGE_KEY, records.slice(0, 50))

  return record
}

export function getInspectionReportMock(reportId: string): InspectionReportRecord | null {
  const id = reportId.trim()

  if (!id) {
    return null
  }

  return loadInspectionReportRecords().find(record => record.id === id) ?? null
}

export function verifyInspectionReportPassword(reportId: string, password: string) {
  const record = getInspectionReportMock(reportId)
  return Boolean(record && record.accessPassword === password.trim())
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
  if (!matchesModuleOrder(modules.map(module => module.key), LEGACY_DEFAULT_REPORT_MODULE_ORDER)) {
    return modules
  }

  const moduleByKey = new Map(modules.map(module => [module.key, module]))

  return DEFAULT_REPORT_MODULE_ORDER
    .map(key => moduleByKey.get(key))
    .filter((module): module is ReportTemplateModule => Boolean(module))
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
    resultLabel: buildings[0]?.resultLabel ?? formatResultLabel(input.workOrder.Result),
    scoreText: buildings[0]?.scoreText ?? formatScore(input.workOrder.Score),
    totalBuildings: buildings.length,
    totalItems,
    completedItems,
    issueItems: risks.length,
    buildings,
    risks,
  }
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

function normalizeTemplateConfig(value: Partial<ReportTemplateConfig> | null): ReportTemplateConfig {
  const defaultModules = DEFAULT_REPORT_TEMPLATE_CONFIG.modules
  const storedModules = Array.isArray(value?.modules) ? value.modules : []
  const moduleByKey = new Map(storedModules.map(module => [module.key, module]))
  const mergedModules = defaultModules.map((defaultModule) => {
    const storedModule = moduleByKey.get(defaultModule.key)

    return {
      ...defaultModule,
      enabled: typeof storedModule?.enabled === "boolean" ? storedModule.enabled : defaultModule.enabled,
      title: toText(storedModule?.title, defaultModule.title),
      description: toText(storedModule?.description, defaultModule.description),
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
  return {
    ...record,
    template: normalizeTemplateConfig(record.template),
  }
}

function normalizeReportBrandText(value: unknown, fallback: string) {
  const text = toText(value, fallback)
  return text === LEGACY_REPORT_BRAND_TEXT ? REPORT_BRAND_TEXT : text
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
    && typeof (value as InspectionReportRecord).accessPassword === "string"
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

function formatScore(value: unknown) {
  const score = toNumber(value)
  return score === null ? "-" : String(score)
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
