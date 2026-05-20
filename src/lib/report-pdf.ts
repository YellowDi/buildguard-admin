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
const PDF_PAGE_BREAK_SAFE_GAP_PX = 8
const PDF_PAGE_TOP_TOLERANCE_PX = 2

export type GenerateReportPdfOptions = {
  fileName?: string
  scale?: number
}

export async function generateReportPdfBlob(
  element: HTMLElement,
  options: GenerateReportPdfOptions = {},
): Promise<Blob> {
  await waitForReportAssets(element)

  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: options.scale ?? DEFAULT_SCALE,
    useCORS: true,
    windowHeight: element.scrollHeight,
    windowWidth: element.scrollWidth,
    onclone: (_clonedDocument, clonedElement) => {
      sanitizePdfCloneForHtml2Canvas(clonedElement)
      insertPdfPageSpacers(clonedElement)
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

  applyRiskTone(root, ".inspection-risk-level--danger", "#dc2626", "rgba(220, 38, 38, 0.12)", "rgba(220, 38, 38, 0.2)")
  applyRiskTone(root, ".inspection-risk-level--warning", "#d97706", "rgba(217, 119, 6, 0.12)", "rgba(217, 119, 6, 0.2)")
  applyRiskTone(root, ".inspection-risk-level--success", "#16a34a", "rgba(22, 163, 74, 0.12)", "rgba(22, 163, 74, 0.2)")
  applyRiskTone(root, ".inspection-risk-level--neutral", "#64748b", "rgba(100, 116, 139, 0.12)", "rgba(100, 116, 139, 0.2)")
}

function insertPdfPageSpacers(root: HTMLElement) {
  const pageHeight = getPdfPageHeightPx(root)

  if (pageHeight <= 0) {
    return
  }

  const anchors = getPdfPaginationAnchors(root)

  anchors.forEach((anchor) => {
    moveBlockToNextPageIfNeeded(root, anchor.element, anchor.keepTogetherElements, pageHeight)
  })
}

function getPdfPageHeightPx(root: HTMLElement) {
  const rootWidth = root.getBoundingClientRect().width || root.scrollWidth

  return (rootWidth * A4_HEIGHT_MM) / A4_WIDTH_MM
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

function compactElements(elements: Array<HTMLElement | null | undefined>) {
  return elements.filter((element): element is HTMLElement => Boolean(element))
}

function moveBlockToNextPageIfNeeded(
  root: HTMLElement,
  element: HTMLElement,
  keepTogetherElements: HTMLElement[],
  pageHeight: number,
) {
  if (!element.parentElement || keepTogetherElements.length === 0) {
    return
  }

  const rootTop = root.getBoundingClientRect().top
  const blockTop = getElementTop(element, rootTop)
  const blockBottom = Math.max(...keepTogetherElements.map(item => getElementBottom(item, rootTop)))
  const blockHeight = blockBottom - blockTop

  if (blockHeight <= 0) {
    return
  }

  const currentPageTop = Math.floor((blockTop + PDF_PAGE_TOP_TOLERANCE_PX) / pageHeight) * pageHeight
  const currentPageBottom = currentPageTop + pageHeight
  const distanceFromPageTop = blockTop - currentPageTop
  const wouldCrossPage = blockBottom > currentPageBottom - PDF_PAGE_BREAK_SAFE_GAP_PX

  if (!wouldCrossPage) {
    return
  }

  if (distanceFromPageTop <= PDF_PAGE_TOP_TOLERANCE_PX) {
    return
  }

  insertSpacerBefore(element, Math.ceil(currentPageBottom - blockTop) + 1)
}

function getElementTop(element: HTMLElement, rootTop: number) {
  return element.getBoundingClientRect().top - rootTop
}

function getElementBottom(element: HTMLElement, rootTop: number) {
  return element.getBoundingClientRect().bottom - rootTop
}

function insertSpacerBefore(element: HTMLElement, height: number) {
  const spacer = element.ownerDocument.createElement("div")

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
  setStylesForSelector(root, `${selector} .risk-level-icon, ${selector} .inspection-item-risk-chip`, {
    "background-color": surface,
    "border-color": border,
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
