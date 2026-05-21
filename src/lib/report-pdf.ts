import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const DEFAULT_SCALE = 2
const PDF_IMAGE_QUALITY = 0.92
const SAFE_BORDER_COLOR = "rgba(0, 0, 0, 0.12)"
const SAFE_LINK_COLOR = "#0075de"
const SAFE_MUTED_COLOR = "#615d59"
const SAFE_TEXT_COLOR = "#111827"
const SAFE_SURFACE_COLOR = "#f6f5f4"
const SAFE_WHITE = "#ffffff"
const PDF_PAGE_BREAK_SAFE_GAP_PX = 18
const PDF_PAGE_BREAK_SPACER_EXTRA_PX = 6
const PDF_PAGE_TOP_TOLERANCE_PX = 2
const PDF_PAGINATION_MAX_PASSES = 4
const PDF_FORCE_NEW_PAGE_SELECTORS = [
  ".report-module-section--ai-summary",
  ".report-module-section--buildings",
]

export type GenerateReportPdfOptions = {
  fileName?: string
  scale?: number
}

export async function generateReportPdfBlob(
  element: HTMLElement,
  options: GenerateReportPdfOptions = {},
): Promise<Blob> {
  await waitForReportAssets(element)

  const scale = options.scale ?? DEFAULT_SCALE
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale,
    useCORS: true,
    windowHeight: element.scrollHeight,
    windowWidth: element.scrollWidth,
    onclone: (_clonedDocument, clonedElement) => {
      sanitizePdfCloneForHtml2Canvas(clonedElement)
      insertPdfPageSpacers(clonedElement, scale)
    },
  })
  const pdf = new jsPDF({
    compress: true,
    format: "a4",
    orientation: "portrait",
    unit: "mm",
  })
  const pageCanvasHeight = Math.floor((A4_HEIGHT_MM * canvas.width) / A4_WIDTH_MM)
  let sourceY = 0
  let pageIndex = 0

  while (sourceY < canvas.height) {
    const sliceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY)
    const pageCanvas = document.createElement("canvas")

    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeight

    const pageContext = pageCanvas.getContext("2d")

    if (!pageContext) {
      throw new Error("PDF 页面画布创建失败")
    }

    pageContext.fillStyle = "#ffffff"
    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    pageContext.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

    if (pageIndex > 0) {
      pdf.addPage()
    }

    const imageHeightMm = (sliceHeight * A4_WIDTH_MM) / canvas.width
    const imageData = pageCanvas.toDataURL("image/jpeg", PDF_IMAGE_QUALITY)

    pdf.addImage(imageData, "JPEG", 0, 0, A4_WIDTH_MM, imageHeightMm, undefined, "FAST")

    sourceY += sliceHeight
    pageIndex += 1
  }

  return pdf.output("blob")
}

async function waitForReportAssets(element: HTMLElement) {
  await Promise.all([
    waitForFonts(),
    waitForImages(element),
  ])
}

async function waitForFonts() {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return
  }

  await document.fonts.ready
}

async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll("img"))

  await Promise.all(images.map(async (image) => {
    if (image.complete && image.naturalWidth > 0) {
      return
    }

    if (typeof image.decode === "function") {
      try {
        await image.decode()
        return
      } catch {
        // Fall back to load/error listeners below.
      }
    }

    await new Promise<void>((resolve) => {
      const handleDone = () => {
        image.removeEventListener("load", handleDone)
        image.removeEventListener("error", handleDone)
        resolve()
      }

      image.addEventListener("load", handleDone, { once: true })
      image.addEventListener("error", handleDone, { once: true })
    })
  }))
}

function sanitizePdfCloneForHtml2Canvas(root: HTMLElement) {
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]

  elements.forEach((element) => {
    setImportantStyle(element, {
      "background-color": "transparent",
      "background-image": "none",
      "border-color": SAFE_BORDER_COLOR,
      "box-shadow": "none",
      color: SAFE_TEXT_COLOR,
      "outline-color": "transparent",
      "text-decoration-color": "currentColor",
      "text-shadow": "none",
    })
  })

  setImportantStyle(root, {
    "background-color": SAFE_WHITE,
    color: SAFE_TEXT_COLOR,
  })

  setStylesForSelector(root, ".report-document-shell, .report-cover-grid, .report-module-section, .inspection-risk-level, .inspection-category-block, .inspection-category-items, .inspection-item-card", {
    "background-color": SAFE_WHITE,
  })
  setStylesForSelector(root, ".report-cover-meta, .inspection-item-card__header, .inspection-item-field, .inspection-item-ai, .rounded-lg", {
    "background-color": SAFE_SURFACE_COLOR,
  })
  setStylesForSelector(root, ".report-item-content, .inspection-item-ai__content, .text-muted-foreground, dt, .risk-level-eyebrow, .category-eyebrow", {
    color: SAFE_MUTED_COLOR,
  })
  setStylesForSelector(root, ".text-link, .inspection-item-ai__icon, .inspection-item-ai__title", {
    color: SAFE_LINK_COLOR,
  })
  setStylesForSelector(root, ".inspection-item-ai", {
    "background-color": "#f2f9ff",
    "border-left-color": SAFE_LINK_COLOR,
  })
  setStylesForSelector(root, ".inspection-item-ai__icon", {
    "background-color": SAFE_WHITE,
    "border-color": "rgba(0, 117, 222, 0.16)",
  })
  setStylesForSelector(root, ".category-accent", {
    "background-color": "#2563eb",
    "border-color": "#2563eb",
  })
  setStylesForSelector(root, ".report-cover-meta", {
    gap: "10px 16px",
    padding: "9px 14px 12px",
  })
  setStylesForSelector(root, ".report-cover-meta > div", {
    display: "grid",
    gap: "3px",
  })
  setStylesForSelector(root, ".report-cover-meta dt, .report-cover-meta dd", {
    display: "block",
    "line-height": "16px",
    margin: "0",
    transform: "translateY(-2px)",
  })
  setStylesForSelector(root, ".report-score-card", {
    "background-color": SAFE_SURFACE_COLOR,
    border: "0",
    "box-sizing": "border-box",
    display: "flex",
    "flex-direction": "column",
    gap: "8px",
    height: "88px",
    "justify-content": "center",
    "min-height": "88px",
    padding: "0 14px",
  })
  setStylesForSelector(root, ".report-score-card__label", {
    "align-items": "center",
    color: SAFE_MUTED_COLOR,
    display: "flex",
    "font-size": "12px",
    height: "16px",
    "line-height": "1",
    margin: "0",
    transform: "none",
  })
  setStylesForSelector(root, ".report-score-card__value", {
    "align-items": "center",
    color: SAFE_TEXT_COLOR,
    display: "flex",
    "font-size": "24px",
    "font-variant-numeric": "tabular-nums",
    "font-weight": "700",
    height: "30px",
    "line-height": "1",
    margin: "0",
    transform: "none",
  })
  setStylesForSelector(root, ".report-score-card__label > span, .report-score-card__value > span", {
    display: "block",
    "line-height": "1",
  })
  setStylesForSelector(root, ".report-score-card__label > span", {
    transform: "translateY(-1px)",
  })
  setStylesForSelector(root, ".report-score-card__value > span", {
    transform: "translateY(-4px)",
  })
  setStylesForSelector(root, ".report-module-section--ai-summary article p, .report-module-section--ai-summary article li, .report-module-section--ai-summary article li span", {
    color: SAFE_MUTED_COLOR,
    "font-weight": "400",
  })
  setStylesForSelector(root, ".report-module-section--ai-summary article h3", {
    color: SAFE_TEXT_COLOR,
  })
  setStylesForSelector(root, ".risk-level-header", {
    "align-items": "center",
    "box-sizing": "border-box",
    display: "flex",
    "min-height": "64px",
    padding: "0 14px",
  })
  setStylesForSelector(root, ".risk-level-header__content", {
    "align-items": "center",
    display: "flex",
    "min-height": "64px",
  })
  setStylesForSelector(root, ".risk-level-header__body", {
    display: "flex",
    "flex-direction": "column",
    gap: "4px",
    "justify-content": "center",
    "min-height": "44px",
  })
  setStylesForSelector(root, ".risk-level-eyebrow", {
    "align-items": "center",
    display: "flex",
    height: "14px",
    "line-height": "1",
    margin: "0",
    transform: "none",
  })
  setStylesForSelector(root, ".risk-level-eyebrow > span", {
    display: "block",
    "line-height": "1",
    transform: "translateY(-1px)",
  })
  setStylesForSelector(root, ".risk-level-title-row", {
    "align-items": "center",
    "min-height": "24px",
  })
  setStylesForSelector(root, ".risk-level-header h3", {
    "align-items": "center",
    display: "flex",
    height: "24px",
    "line-height": "1",
    margin: "0",
    overflow: "visible",
    "text-overflow": "clip",
    transform: "none",
    "white-space": "normal",
  })
  setStylesForSelector(root, ".risk-level-header h3 > span", {
    display: "block",
    "line-height": "1",
    transform: "translateY(-1px)",
  })
  setStylesForSelector(root, ".risk-level-header .text-xs", {
    "align-items": "center",
    display: "inline-flex",
    height: "16px",
    "line-height": "1",
    transform: "none",
  })
  setStylesForSelector(root, ".inspection-category-header", {
    "align-items": "center",
    "background-color": SAFE_WHITE,
    border: "0",
    display: "flex",
    "min-height": "44px",
    padding: "0 0 10px",
  })
  setStylesForSelector(root, ".category-title-wrap", {
    "align-items": "center",
    display: "flex",
    gap: "8px",
  })
  setStylesForSelector(root, ".category-eyebrow", {
    "align-items": "center",
    color: SAFE_MUTED_COLOR,
    display: "flex",
    "font-size": "10px",
    height: "14px",
    "line-height": "1",
    margin: "0",
  })
  setStylesForSelector(root, ".category-eyebrow > span", {
    display: "block",
    "line-height": "1",
    transform: "translateY(-1px)",
  })
  setStylesForSelector(root, ".inspection-category-header h4", {
    "align-items": "center",
    color: SAFE_TEXT_COLOR,
    display: "flex",
    "font-size": "14px",
    height: "20px",
    "line-height": "1",
    margin: "0",
    overflow: "visible",
    "text-overflow": "clip",
    "white-space": "normal",
  })
  setStylesForSelector(root, ".inspection-category-header h4 > span", {
    display: "block",
    "line-height": "1",
    transform: "translateY(-1px)",
  })
  setStylesForSelector(root, ".inspection-item-card__header", {
    "align-items": "center",
    "background-color": SAFE_WHITE,
    "box-sizing": "border-box",
    display: "flex",
    "justify-content": "space-between",
    "min-height": "64px",
    padding: "0 14px",
  })
  setStylesForSelector(root, ".inspection-item-title-wrap", {
    "align-items": "center",
    display: "flex",
    "flex-wrap": "wrap",
    gap: "8px",
    "min-height": "32px",
  })
  setStylesForSelector(root, ".inspection-item-risk-chip", {
    "align-items": "center",
    "box-sizing": "border-box",
    display: "inline-flex",
    "font-size": "11px",
    "font-weight": "650",
    height: "28px",
    "line-height": "1",
    "min-height": "28px",
    padding: "0 9px",
    "vertical-align": "middle",
    "white-space": "nowrap",
  })
  setStylesForSelector(root, ".inspection-item-risk-chip__text", {
    display: "block",
    "line-height": "1",
    transform: "translateY(-3px)",
  })
  setStylesForSelector(root, ".inspection-item-title-wrap h5", {
    "align-items": "center",
    display: "flex",
    "line-height": "1.15",
    margin: "0",
    "min-height": "32px",
    transform: "none",
  })
  setStylesForSelector(root, ".inspection-item-title-wrap h5 > span", {
    display: "block",
    "line-height": "1.15",
    transform: "translateY(-3px)",
  })
  setStylesForSelector(root, ".inspection-item-score", {
    "align-items": "center",
    "background-color": SAFE_WHITE,
    border: `1px solid ${SAFE_BORDER_COLOR}`,
    "box-sizing": "border-box",
    display: "inline-flex",
    gap: "6px",
    height: "32px",
    "justify-content": "space-between",
    "min-height": "32px",
    "min-width": "72px",
    padding: "0 10px",
    "white-space": "nowrap",
  })
  setStylesForSelector(root, ".inspection-item-score span", {
    "align-items": "center",
    color: SAFE_MUTED_COLOR,
    display: "inline-flex",
    "font-size": "10px",
    "line-height": "1",
    transform: "none",
  })
  setStylesForSelector(root, ".inspection-item-score strong", {
    "align-items": "center",
    color: SAFE_TEXT_COLOR,
    display: "inline-flex",
    "font-size": "12px",
    "line-height": "1",
    transform: "none",
  })
  setStylesForSelector(root, ".inspection-item-score span > span, .inspection-item-score strong > span", {
    display: "block",
    "line-height": "1",
    transform: "translateY(-3px)",
  })
  setStylesForSelector(root, ".inspection-item-field-grid", {
    display: "grid",
    gap: "10px",
    "grid-template-columns": "repeat(2, minmax(0, 1fr))",
  })
  setStylesForSelector(root, ".inspection-item-field", {
    "background-color": "#fbfaf8",
    border: `1px solid ${SAFE_BORDER_COLOR}`,
    padding: "4px 12px 10px",
  })
  setStylesForSelector(root, ".inspection-item-field span", {
    color: SAFE_MUTED_COLOR,
    display: "block",
    "font-size": "10px",
    "line-height": "14px",
    "margin-bottom": "4px",
    transform: "translateY(-2px)",
  })
  setStylesForSelector(root, ".report-item-content, .inspection-item-ai__content", {
    color: "#374151",
    "font-size": "12px",
    "line-height": "1.55",
    margin: "0",
    transform: "translateY(-2px)",
  })
  setStylesForSelector(root, ".inspection-item-ai__title", {
    transform: "translateY(-2px)",
  })

  applyRiskTone(root, ".inspection-risk-level--danger", "#dc2626", "rgba(220, 38, 38, 0.12)", "rgba(220, 38, 38, 0.2)")
  applyRiskTone(root, ".inspection-risk-level--warning", "#d97706", "rgba(217, 119, 6, 0.12)", "rgba(217, 119, 6, 0.2)")
  applyRiskTone(root, ".inspection-risk-level--success", "#16a34a", "rgba(22, 163, 74, 0.12)", "rgba(22, 163, 74, 0.2)")
  applyRiskTone(root, ".inspection-risk-level--neutral", "#64748b", "rgba(100, 116, 139, 0.12)", "rgba(100, 116, 139, 0.2)")
}

function insertPdfPageSpacers(root: HTMLElement, scale: number) {
  const pageHeight = getPdfPageHeightPx(root, scale)

  if (pageHeight <= 0) {
    return
  }

  forcePdfModulePageBreaks(root, pageHeight)

  for (let passIndex = 0; passIndex < PDF_PAGINATION_MAX_PASSES; passIndex += 1) {
    let movedElement = false

    getPdfPaginationAnchors(root).forEach((anchor) => {
      movedElement = moveBlockToNextPageIfNeeded(root, anchor.element, anchor.keepTogetherElements, pageHeight) || movedElement
    })

    if (!movedElement) {
      break
    }
  }
}

function getPdfPageHeightPx(root: HTMLElement, scale: number) {
  const rootWidth = root.getBoundingClientRect().width || root.scrollWidth
  const normalizedScale = Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_SCALE
  const canvasWidth = Math.floor(Math.ceil(rootWidth) * normalizedScale)
  const pageCanvasHeight = Math.floor((A4_HEIGHT_MM * canvasWidth) / A4_WIDTH_MM)

  return pageCanvasHeight / normalizedScale
}

function getPdfPaginationAnchors(root: HTMLElement) {
  const anchors: Array<{
    element: HTMLElement
    keepTogetherElements: HTMLElement[]
  }> = []

  root.querySelectorAll<HTMLElement>(".risk-level-header").forEach((header) => {
    const riskLevel = header.closest<HTMLElement>(".inspection-risk-level")

    anchors.push({
      element: header,
      keepTogetherElements: compactElements([
        header,
        riskLevel?.querySelector<HTMLElement>(".inspection-category-header"),
        riskLevel?.querySelector<HTMLElement>(".inspection-report-item"),
      ]),
    })
  })

  root.querySelectorAll<HTMLElement>(".inspection-category-header").forEach((header) => {
    const category = header.closest<HTMLElement>(".inspection-category-block")

    anchors.push({
      element: header,
      keepTogetherElements: compactElements([
        header,
        category?.querySelector<HTMLElement>(".inspection-report-item"),
      ]),
    })
  })

  root.querySelectorAll<HTMLElement>(".inspection-report-item").forEach((item) => {
    anchors.push({
      element: item,
      keepTogetherElements: [item],
    })
  })

  return anchors.sort((current, next) => {
    if (current.element === next.element) {
      return 0
    }

    return current.element.compareDocumentPosition(next.element) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1
  })
}

function forcePdfModulePageBreaks(root: HTMLElement, pageHeight: number) {
  root
    .querySelectorAll<HTMLElement>(PDF_FORCE_NEW_PAGE_SELECTORS.join(","))
    .forEach((element) => {
      moveElementToNextPage(root, element, pageHeight)
    })
}

function compactElements(elements: Array<HTMLElement | null | undefined>) {
  return elements.filter((element): element is HTMLElement => Boolean(element))
}

function moveElementToNextPage(root: HTMLElement, element: HTMLElement, pageHeight: number) {
  if (!element.parentElement) {
    return false
  }

  const rootTop = root.getBoundingClientRect().top
  const blockTop = getElementTop(element, rootTop)
  const currentPageTop = getPdfCurrentPageTop(blockTop, pageHeight)
  const distanceFromPageTop = blockTop - currentPageTop

  if (isAtPdfPageTop(distanceFromPageTop)) {
    return false
  }

  insertSpacerBefore(element, Math.ceil(currentPageTop + pageHeight - blockTop) + PDF_PAGE_BREAK_SPACER_EXTRA_PX)
  return true
}

function moveBlockToNextPageIfNeeded(
  root: HTMLElement,
  element: HTMLElement,
  keepTogetherElements: HTMLElement[],
  pageHeight: number,
) {
  if (!element.parentElement || keepTogetherElements.length === 0) {
    return false
  }

  const rootTop = root.getBoundingClientRect().top
  const blockTop = getElementTop(element, rootTop)
  const blockBottom = Math.max(...keepTogetherElements.map(item => getElementBottom(item, rootTop)))
  const blockHeight = blockBottom - blockTop

  if (blockHeight <= 0) {
    return false
  }

  if (blockHeight >= pageHeight - PDF_PAGE_BREAK_SAFE_GAP_PX) {
    return false
  }

  const currentPageTop = getPdfCurrentPageTop(blockTop, pageHeight)
  const currentPageBottom = currentPageTop + pageHeight
  const distanceFromPageTop = blockTop - currentPageTop
  const wouldCrossPage = blockBottom > currentPageBottom - PDF_PAGE_BREAK_SAFE_GAP_PX

  if (!wouldCrossPage) {
    return false
  }

  if (isAtPdfPageTop(distanceFromPageTop)) {
    return false
  }

  insertSpacerBefore(element, Math.ceil(currentPageBottom - blockTop) + PDF_PAGE_BREAK_SPACER_EXTRA_PX)
  return true
}

function getPdfCurrentPageTop(blockTop: number, pageHeight: number) {
  return Math.floor(Math.max(0, blockTop) / pageHeight) * pageHeight
}

function isAtPdfPageTop(distanceFromPageTop: number) {
  return distanceFromPageTop >= 0 && distanceFromPageTop <= PDF_PAGE_TOP_TOLERANCE_PX + PDF_PAGE_BREAK_SPACER_EXTRA_PX
}

function getElementTop(element: HTMLElement, rootTop: number) {
  return element.getBoundingClientRect().top - rootTop
}

function getElementBottom(element: HTMLElement, rootTop: number) {
  return element.getBoundingClientRect().bottom - rootTop
}

function insertSpacerBefore(element: HTMLElement, height: number) {
  const spacer = element.ownerDocument.createElement("div")

  element.style.setProperty("margin-top", "0", "important")
  spacer.setAttribute("data-pdf-page-spacer", "true")
  spacer.style.setProperty("background", SAFE_WHITE, "important")
  spacer.style.setProperty("border", "0", "important")
  spacer.style.setProperty("box-shadow", "none", "important")
  spacer.style.setProperty("display", "block", "important")
  spacer.style.setProperty("height", `${Math.max(1, height)}px`, "important")
  spacer.style.setProperty("margin", "0", "important")
  spacer.style.setProperty("min-height", `${Math.max(1, height)}px`, "important")
  spacer.style.setProperty("padding", "0", "important")
  spacer.style.setProperty("width", "100%", "important")

  element.parentElement?.insertBefore(spacer, element)
}

function applyRiskTone(root: HTMLElement, selector: string, color: string, surface: string, border: string) {
  setStylesForSelector(root, `${selector} .inspection-item-risk-chip`, {
    "background-color": surface,
    "border-color": border,
    color,
  })
  setStylesForSelector(root, `${selector} .inspection-item-risk-chip *`, {
    color,
  })
  setStylesForSelector(root, `${selector} .inspection-report-item`, {
    "border-left-color": color,
  })
}

function setStylesForSelector(root: HTMLElement, selector: string, styles: Record<string, string>) {
  root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    setImportantStyle(element, styles)
  })
}

function setImportantStyle(element: HTMLElement, styles: Record<string, string>) {
  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(property, value, "important")
  })
}
