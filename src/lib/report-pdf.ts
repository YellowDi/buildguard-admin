import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const DEFAULT_SCALE = 2
const PDF_IMAGE_QUALITY = 0.92

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
