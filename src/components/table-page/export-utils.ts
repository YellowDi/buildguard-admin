import type { TableColumn, TableStatusCellRenderer } from "@/components/table-page/types"

export type TableExportScope = "selected" | "page" | "filtered"
export type TableExportFormat = "csv" | "xlsx"
export type TableExportRowsResolverPayload = {
  scope: TableExportScope
  format: TableExportFormat
  defaultRows: Record<string, unknown>[]
}
export type TableExportRowsResolver = (
  payload: TableExportRowsResolverPayload
) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>

type ExportMatrix = {
  headers: string[]
  rows: string[][]
}

type ZipFileInput = {
  path: string
  content: string | Uint8Array
}

export const SUPPORTED_TABLE_EXPORT_FORMATS = ["xlsx", "csv"] as const satisfies TableExportFormat[]

const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const CSV_MIME_TYPE = "text/csv;charset=utf-8;"
const ZIP_UTF8_FLAG = 0x0800
const ZIP_STORE_METHOD = 0
const XLSX_SHEET_NAME = "导出数据"
const CRC32_TABLE = createCrc32Table()

export function exportTableData<Row extends Record<string, unknown>>(payload: {
  title: string
  columns: TableColumn[]
  rows: Row[]
  format: TableExportFormat
}) {
  const exportMatrix = buildExportMatrix(payload.rows, payload.columns)
  const fileName = getExportFileName(payload.title, payload.format)

  if (payload.format === "csv") {
    downloadTextFile(fileName, serializeMatrixToCsv(exportMatrix), CSV_MIME_TYPE)
    return { fileName, rowCount: exportMatrix.rows.length }
  }

  if (payload.format === "xlsx") {
    downloadBlobFile(fileName, serializeMatrixToXlsxBlob(exportMatrix, payload.title), XLSX_MIME_TYPE)
    return { fileName, rowCount: exportMatrix.rows.length }
  }

  throw new Error("当前导出格式暂不支持。")
}

export function buildExportRows<Row extends Record<string, unknown>>(rows: Row[], columns: TableColumn[]) {
  const matrix = buildExportMatrix(rows, columns)

  return matrix.rows.map(row => Object.fromEntries(
    matrix.headers.map((header, index) => [header, row[index] ?? ""]),
  ))
}

export function getExportFileName(title: string, format: TableExportFormat) {
  const stamp = formatDateStamp(new Date())
  const safeTitle = sanitizeFileName(title)
  return `${safeTitle}-${stamp}.${format}`
}

function buildExportMatrix<Row extends Record<string, unknown>>(rows: Row[], columns: TableColumn[]): ExportMatrix {
  const exportColumns = columns.filter(column => Boolean(column.key && column.label))

  return {
    headers: exportColumns.map(column => column.label),
    rows: rows.map(row => exportColumns.map(column => formatColumnExportValue(row, column))),
  }
}

function formatColumnExportValue(row: Record<string, unknown>, column: TableColumn) {
  const renderer = column.cellRenderer
  const rawValue = getColumnValue(row, column.key)

  if (!renderer || renderer.kind === "text" || renderer.kind === "note") {
    return stringifyValue(rawValue)
  }

  if (renderer.kind === "dual-inline" || renderer.kind === "dual-stack") {
    return [
      stringifyValue(getColumnValue(row, renderer.primaryKey)),
      stringifyValue(getColumnValue(row, renderer.secondaryKey)),
    ].filter(Boolean).join(" ")
  }

  if (renderer.kind === "array" || renderer.kind === "tags") {
    return toStringArray(rawValue).join("、")
  }

  if (renderer.kind === "progress") {
    return stringifyValue(getColumnValue(row, renderer.valueKey ?? column.key))
  }

  if (renderer.kind === "metric-unit") {
    const value = stringifyValue(getColumnValue(row, renderer.valueKey ?? column.key))
    return value ? `${value}${renderer.unit}` : ""
  }

  if (renderer.kind === "status") {
    return formatStatusExportValue(row, column.key, renderer)
  }

  return stringifyValue(rawValue)
}

function formatStatusExportValue(row: Record<string, unknown>, key: string, renderer: TableStatusCellRenderer) {
  const statusValue = stringifyValue(getColumnValue(row, renderer.valueKey ?? key))
  const option = renderer.map[statusValue] ?? renderer.fallback
  return option?.label ?? statusValue
}

function serializeMatrixToCsv(matrix: ExportMatrix) {
  const lines = [
    matrix.headers.map(escapeCsvCell).join(","),
    ...matrix.rows.map(row => matrix.headers.map((_, index) => escapeCsvCell(row[index] ?? "")).join(",")),
  ]

  return `\uFEFF${lines.join("\r\n")}`
}

function serializeMatrixToXlsxBlob(matrix: ExportMatrix, title: string) {
  const workbookTitle = sanitizeSheetName(title) || XLSX_SHEET_NAME
  const files: ZipFileInput[] = [
    { path: "[Content_Types].xml", content: buildContentTypesXml() },
    { path: "_rels/.rels", content: buildRootRelationshipsXml() },
    { path: "docProps/app.xml", content: buildAppPropertiesXml() },
    { path: "docProps/core.xml", content: buildCorePropertiesXml(title) },
    { path: "xl/workbook.xml", content: buildWorkbookXml(workbookTitle) },
    { path: "xl/_rels/workbook.xml.rels", content: buildWorkbookRelationshipsXml() },
    { path: "xl/styles.xml", content: buildStylesXml() },
    { path: "xl/worksheets/sheet1.xml", content: buildWorksheetXml(matrix) },
  ]

  return new Blob([createZipArchive(files)], { type: XLSX_MIME_TYPE })
}

function escapeCsvCell(value: string) {
  const normalizedValue = escapeCsvFormula(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  if (/[",\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, "\"\"")}"`
  }

  return normalizedValue
}

function escapeCsvFormula(value: string) {
  const trimmedValue = value.trimStart()

  if (/^[=+@]/.test(trimmedValue) || /^-(?!\d+(?:[.,]\d+)?$)/.test(trimmedValue)) {
    return `'${value}`
  }

  return value
}

function buildWorksheetXml(matrix: ExportMatrix) {
  const rows = [matrix.headers, ...matrix.rows]
  const lastColumn = columnIndexToName(Math.max(1, matrix.headers.length))
  const lastRow = Math.max(1, rows.length)
  const dimension = `A1:${lastColumn}${lastRow}`
  const columnsXml = buildWorksheetColumnsXml(matrix)
  const rowsXml = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1
    const cellsXml = row.map((value, columnIndex) => buildWorksheetCellXml({
      value,
      rowNumber,
      columnIndex,
      isHeader: rowIndex === 0,
    })).join("")

    return `<row r="${rowNumber}">${cellsXml}</row>`
  }).join("")

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">",
    `<dimension ref="${dimension}"/>`,
    "<sheetViews><sheetView workbookViewId=\"0\"/></sheetViews>",
    "<sheetFormatPr defaultRowHeight=\"16\"/>",
    columnsXml,
    `<sheetData>${rowsXml}</sheetData>`,
    "<pageMargins left=\"0.7\" right=\"0.7\" top=\"0.75\" bottom=\"0.75\" header=\"0.3\" footer=\"0.3\"/>",
    "</worksheet>",
  ].join("")
}

function buildWorksheetColumnsXml(matrix: ExportMatrix) {
  if (!matrix.headers.length) {
    return ""
  }

  const sampleRows = matrix.rows.slice(0, 100)
  const columnsXml = matrix.headers.map((header, index) => {
    const maxLength = [header, ...sampleRows.map(row => row[index] ?? "")]
      .reduce((max, value) => Math.max(max, [...value].length), 0)
    const width = Math.max(10, Math.min(48, maxLength + 2))
    const columnNumber = index + 1

    return `<col min="${columnNumber}" max="${columnNumber}" width="${width}" customWidth="1"/>`
  }).join("")

  return `<cols>${columnsXml}</cols>`
}

function buildWorksheetCellXml(payload: {
  value: string
  rowNumber: number
  columnIndex: number
  isHeader: boolean
}) {
  const reference = `${columnIndexToName(payload.columnIndex + 1)}${payload.rowNumber}`
  const style = payload.isHeader ? " s=\"1\"" : ""
  const preserveSpace = /^\s|\s$|\n/.test(payload.value) ? " xml:space=\"preserve\"" : ""

  return `<c r="${reference}"${style} t="inlineStr"><is><t${preserveSpace}>${escapeXmlText(payload.value)}</t></is></c>`
}

function buildContentTypesXml() {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">",
    "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>",
    "<Default Extension=\"xml\" ContentType=\"application/xml\"/>",
    "<Override PartName=\"/docProps/app.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.extended-properties+xml\"/>",
    "<Override PartName=\"/docProps/core.xml\" ContentType=\"application/vnd.openxmlformats-package.core-properties+xml\"/>",
    "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>",
    "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>",
    "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>",
    "</Types>",
  ].join("")
}

function buildRootRelationshipsXml() {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">",
    "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>",
    "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties\" Target=\"docProps/core.xml\"/>",
    "<Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties\" Target=\"docProps/app.xml\"/>",
    "</Relationships>",
  ].join("")
}

function buildWorkbookRelationshipsXml() {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">",
    "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>",
    "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>",
    "</Relationships>",
  ].join("")
}

function buildWorkbookXml(sheetName: string) {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">",
    "<sheets>",
    `<sheet name="${escapeXmlAttribute(sheetName)}" sheetId="1" r:id="rId1"/>`,
    "</sheets>",
    "</workbook>",
  ].join("")
}

function buildStylesXml() {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">",
    "<fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Arial\"/></font><font><b/><sz val=\"11\"/><name val=\"Arial\"/></font></fonts>",
    "<fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills>",
    "<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>",
    "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>",
    "<cellXfs count=\"2\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\"/></cellXfs>",
    "<cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles>",
    "</styleSheet>",
  ].join("")
}

function buildAppPropertiesXml() {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\" xmlns:vt=\"http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes\">",
    "<Application>BuildGuard Admin</Application>",
    "</Properties>",
  ].join("")
}

function buildCorePropertiesXml(title: string) {
  const createdAt = new Date().toISOString()

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" xmlns:dcmitype=\"http://purl.org/dc/dcmitype/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">",
    `<dc:title>${escapeXmlText(title || XLSX_SHEET_NAME)}</dc:title>`,
    "<dc:creator>BuildGuard Admin</dc:creator>",
    `<dcterms:created xsi:type=\"dcterms:W3CDTF\">${createdAt}</dcterms:created>`,
    `<dcterms:modified xsi:type=\"dcterms:W3CDTF\">${createdAt}</dcterms:modified>`,
    "</cp:coreProperties>",
  ].join("")
}

function createZipArchive(files: ZipFileInput[]) {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const centralDirectoryChunks: Uint8Array[] = []
  const timestamp = getDosDateTime(new Date())
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.path)
    const contentBytes = typeof file.content === "string" ? encoder.encode(file.content) : file.content
    const crc = crc32(contentBytes)
    const localHeaderOffset = offset
    const localHeader = createZipLocalHeader({
      nameBytes,
      contentBytes,
      crc,
      timestamp,
    })

    chunks.push(localHeader, contentBytes)
    offset += localHeader.length + contentBytes.length

    centralDirectoryChunks.push(createZipCentralDirectoryHeader({
      nameBytes,
      contentBytes,
      crc,
      timestamp,
      localHeaderOffset,
    }))
  }

  const centralDirectoryOffset = offset
  const centralDirectorySize = centralDirectoryChunks.reduce((size, chunk) => size + chunk.length, 0)
  const endRecord = createZipEndOfCentralDirectoryRecord({
    fileCount: files.length,
    centralDirectorySize,
    centralDirectoryOffset,
  })

  return concatUint8Arrays([...chunks, ...centralDirectoryChunks, endRecord])
}

function createZipLocalHeader(payload: {
  nameBytes: Uint8Array
  contentBytes: Uint8Array
  crc: number
  timestamp: { time: number; date: number }
}) {
  const header = new Uint8Array(30 + payload.nameBytes.length)
  const view = new DataView(header.buffer)

  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, ZIP_UTF8_FLAG, true)
  view.setUint16(8, ZIP_STORE_METHOD, true)
  view.setUint16(10, payload.timestamp.time, true)
  view.setUint16(12, payload.timestamp.date, true)
  view.setUint32(14, payload.crc, true)
  view.setUint32(18, payload.contentBytes.length, true)
  view.setUint32(22, payload.contentBytes.length, true)
  view.setUint16(26, payload.nameBytes.length, true)
  view.setUint16(28, 0, true)
  header.set(payload.nameBytes, 30)

  return header
}

function createZipCentralDirectoryHeader(payload: {
  nameBytes: Uint8Array
  contentBytes: Uint8Array
  crc: number
  timestamp: { time: number; date: number }
  localHeaderOffset: number
}) {
  const header = new Uint8Array(46 + payload.nameBytes.length)
  const view = new DataView(header.buffer)

  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, 20, true)
  view.setUint16(8, ZIP_UTF8_FLAG, true)
  view.setUint16(10, ZIP_STORE_METHOD, true)
  view.setUint16(12, payload.timestamp.time, true)
  view.setUint16(14, payload.timestamp.date, true)
  view.setUint32(16, payload.crc, true)
  view.setUint32(20, payload.contentBytes.length, true)
  view.setUint32(24, payload.contentBytes.length, true)
  view.setUint16(28, payload.nameBytes.length, true)
  view.setUint16(30, 0, true)
  view.setUint16(32, 0, true)
  view.setUint16(34, 0, true)
  view.setUint16(36, 0, true)
  view.setUint32(38, 0, true)
  view.setUint32(42, payload.localHeaderOffset, true)
  header.set(payload.nameBytes, 46)

  return header
}

function createZipEndOfCentralDirectoryRecord(payload: {
  fileCount: number
  centralDirectorySize: number
  centralDirectoryOffset: number
}) {
  const record = new Uint8Array(22)
  const view = new DataView(record.buffer)

  view.setUint32(0, 0x06054b50, true)
  view.setUint16(4, 0, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, payload.fileCount, true)
  view.setUint16(10, payload.fileCount, true)
  view.setUint32(12, payload.centralDirectorySize, true)
  view.setUint32(16, payload.centralDirectoryOffset, true)
  view.setUint16(20, 0, true)

  return record
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }

  return output
}

function createCrc32Table() {
  const table = new Uint32Array(256)

  for (let index = 0; index < table.length; index += 1) {
    let crc = index

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1)
    }

    table[index] = crc >>> 0
  }

  return table
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff

  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function getDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear())

  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  downloadBlobFile(fileName, new Blob([content], { type: mimeType }), mimeType)
}

function downloadBlobFile(fileName: string, blob: Blob, mimeType: string) {
  const fileBlob = blob.type ? blob : new Blob([blob], { type: mimeType })
  const url = URL.createObjectURL(fileBlob)
  const link = document.createElement("a")

  link.href = url
  link.download = fileName
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

function getColumnValue(row: Record<string, unknown>, key: string) {
  if (key in row) {
    return row[key]
  }

  if (!key.includes(".")) {
    return undefined
  }

  return key.split(".").reduce<unknown>((value, path) => {
    if (!value || typeof value !== "object") {
      return undefined
    }

    return (value as Record<string, unknown>)[path]
  }, row)
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toLocaleString("zh-CN", { hour12: false })
  }

  if (typeof value === "boolean") {
    return value ? "是" : "否"
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return `${value}`
  }

  try {
    return JSON.stringify(value)
  } catch {
    return `${value}`
  }
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(item => stringifyValue(item)).filter(Boolean)
  }

  const stringValue = stringifyValue(value)
  return stringValue ? [stringValue] : []
}

function sanitizeFileName(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return "table-export"
  }

  return trimmedValue.replace(/[\\/:*?"<>|]/g, "-").slice(0, 120)
}

function sanitizeSheetName(value: string) {
  const trimmedValue = value.trim().replace(/[\\/?*:[\]]/g, " ")
  return trimmedValue.slice(0, 31).trim()
}

function formatDateStamp(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}${month}${day}-${hours}${minutes}`
}

function columnIndexToName(index: number) {
  let currentIndex = index
  let name = ""

  while (currentIndex > 0) {
    const remainder = (currentIndex - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    currentIndex = Math.floor((currentIndex - 1) / 26)
  }

  return name || "A"
}

function escapeXmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escapeXmlAttribute(value: string) {
  return escapeXmlText(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
