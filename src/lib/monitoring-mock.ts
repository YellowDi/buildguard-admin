import type { TableStatusCellRenderer } from "@/components/table-page/types"

export type MonitoringDeviceStatus = "online" | "unstable" | "offline"

export type MonitoringDeviceRecord = {
  id: string
  deviceName: string
  platform: string
  deviceId: string
  customerUuid: string
  customerName: string
  parkUuid: string
  parkName: string
  buildingUuid: string
  buildingName: string
  status: MonitoringDeviceStatus
  statusLabel: string
  streamUrl: string
  fallbackStreamUrl: string
  lastOnlineAt: string
  remark?: string
}

export type MonitoringLinkedAsset = {
  customerUuid: string
  customerName: string
  parkUuid: string
  parkName: string
  buildingUuid: string
  buildingName: string
}

export const MONITORING_PRIMARY_STREAM_URL = "http://211.249.12.147:1935/live/video15.stream/playlist.m3u8"
export const MONITORING_FALLBACK_STREAM_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"

const monitoringDeviceTemplates: Array<{
  suffix: string
  platform: string
  status: MonitoringDeviceStatus
  statusLabel: string
}> = [
  { suffix: "主入口枪机", platform: "海康互联", status: "online", statusLabel: "在线" },
  { suffix: "消防通道球机", platform: "萤石云", status: "online", statusLabel: "在线" },
  { suffix: "设备区全景", platform: "宇视云", status: "unstable", statusLabel: "波动" },
  { suffix: "后勤通道半球机", platform: "大华云睿", status: "online", statusLabel: "在线" },
]

export const monitoringStatusRenderer = {
  kind: "status",
  map: {
    在线: { tone: "green", icon: "check" },
    波动: { tone: "orange", icon: "clock" },
    离线: { tone: "gray", icon: "minus" },
  },
  fallback: { tone: "gray", icon: "dot" },
} satisfies TableStatusCellRenderer

export const monitoringDevices: MonitoringDeviceRecord[] = [
  {
    id: "mon-south-gate-01",
    deviceName: "南门出入口枪机",
    platform: "海康互联",
    deviceId: "MON-HIK-ENTRY-001",
    customerUuid: "",
    customerName: "宝京物业",
    parkUuid: "",
    parkName: "总部园区",
    buildingUuid: "",
    buildingName: "南门岗亭",
    status: "online",
    statusLabel: "在线",
    streamUrl: MONITORING_PRIMARY_STREAM_URL,
    fallbackStreamUrl: MONITORING_FALLBACK_STREAM_URL,
    lastOnlineAt: "2026-05-29 14:18",
  },
  {
    id: "mon-fire-room-02",
    deviceName: "消防控制室球机",
    platform: "萤石云",
    deviceId: "MON-EZVIZ-FIRE-002",
    customerUuid: "",
    customerName: "宝京物业",
    parkUuid: "",
    parkName: "总部园区",
    buildingUuid: "",
    buildingName: "2号楼",
    status: "online",
    statusLabel: "在线",
    streamUrl: MONITORING_PRIMARY_STREAM_URL,
    fallbackStreamUrl: MONITORING_FALLBACK_STREAM_URL,
    lastOnlineAt: "2026-05-29 14:11",
  },
  {
    id: "mon-garage-03",
    deviceName: "地下车库入口枪机",
    platform: "宇视云",
    deviceId: "MON-UNV-GARAGE-003",
    customerUuid: "",
    customerName: "明湖商业",
    parkUuid: "",
    parkName: "明湖广场",
    buildingUuid: "",
    buildingName: "地下车库",
    status: "unstable",
    statusLabel: "波动",
    streamUrl: MONITORING_PRIMARY_STREAM_URL,
    fallbackStreamUrl: MONITORING_FALLBACK_STREAM_URL,
    lastOnlineAt: "2026-05-29 13:56",
  },
  {
    id: "mon-rooftop-04",
    deviceName: "屋面设备区全景",
    platform: "大华云睿",
    deviceId: "MON-DAHUA-ROOF-004",
    customerUuid: "",
    customerName: "明湖商业",
    parkUuid: "",
    parkName: "明湖广场",
    buildingUuid: "",
    buildingName: "A座屋面",
    status: "online",
    statusLabel: "在线",
    streamUrl: MONITORING_PRIMARY_STREAM_URL,
    fallbackStreamUrl: MONITORING_FALLBACK_STREAM_URL,
    lastOnlineAt: "2026-05-29 14:20",
  },
  {
    id: "mon-service-passage-05",
    deviceName: "后勤通道半球机",
    platform: "海康互联",
    deviceId: "MON-HIK-SERVICE-005",
    customerUuid: "",
    customerName: "云栖科技",
    parkUuid: "",
    parkName: "云栖产业园",
    buildingUuid: "",
    buildingName: "研发楼",
    status: "offline",
    statusLabel: "离线",
    streamUrl: MONITORING_PRIMARY_STREAM_URL,
    fallbackStreamUrl: MONITORING_FALLBACK_STREAM_URL,
    lastOnlineAt: "2026-05-29 09:42",
  },
  {
    id: "mon-west-yard-06",
    deviceName: "西侧装卸区球机",
    platform: "宇视云",
    deviceId: "MON-UNV-YARD-006",
    customerUuid: "",
    customerName: "云栖科技",
    parkUuid: "",
    parkName: "云栖产业园",
    buildingUuid: "",
    buildingName: "仓储中心",
    status: "online",
    statusLabel: "在线",
    streamUrl: MONITORING_PRIMARY_STREAM_URL,
    fallbackStreamUrl: MONITORING_FALLBACK_STREAM_URL,
    lastOnlineAt: "2026-05-29 14:07",
  },
]

export const monitoringPlatformOptions = Array.from(new Set(monitoringDevices.map(device => device.platform))).map(platform => ({
  value: platform,
  label: platform,
}))

export const monitoringStatusOptions = [
  { value: "在线", label: "在线" },
  { value: "波动", label: "波动" },
  { value: "离线", label: "离线" },
]

export function getMonitoringDeviceById(id: string) {
  return readMonitoringLocalDevices().find(device => device.id === id)
    ?? monitoringDevices.find(device => device.id === id)
    ?? null
}

export function mergeMonitoringLocalDevices(devices: MonitoringDeviceRecord[]) {
  const deviceMap = new Map(devices.map(device => [device.id, device]))

  for (const device of readMonitoringLocalDevices()) {
    deviceMap.set(device.id, device)
  }

  return Array.from(deviceMap.values())
}

export function saveMonitoringLocalDevice(device: MonitoringDeviceRecord) {
  const devices = readMonitoringLocalDevices()
  const nextDevice = normalizeMonitoringDeviceRecord(device)
  const existingIndex = devices.findIndex(item => item.id === nextDevice.id)

  if (existingIndex >= 0) {
    devices.splice(existingIndex, 1, nextDevice)
  } else {
    devices.push(nextDevice)
  }

  writeMonitoringLocalDevices(devices)
}

export function createMonitoringLocalDeviceId() {
  return `mon-local-${Date.now().toString(36)}`
}

export function buildMonitoringDevicesFromLinkedAssets(assets: MonitoringLinkedAsset[]): MonitoringDeviceRecord[] {
  return assets
    .filter(asset => asset.buildingUuid && asset.buildingName)
    .map((asset, index) => {
      const template = monitoringDeviceTemplates[index % monitoringDeviceTemplates.length]
      const normalizedBuildingId = asset.buildingUuid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()

      return {
        id: `${asset.buildingUuid}-monitoring-${index + 1}`,
        deviceName: `${asset.buildingName}${template.suffix}`,
        platform: template.platform,
        deviceId: `MON-${normalizedBuildingId || String(index + 1).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`,
        customerUuid: asset.customerUuid,
        customerName: asset.customerName,
        parkUuid: asset.parkUuid,
        parkName: asset.parkName,
        buildingUuid: asset.buildingUuid,
        buildingName: asset.buildingName,
        status: template.status,
        statusLabel: template.statusLabel,
        streamUrl: MONITORING_PRIMARY_STREAM_URL,
        fallbackStreamUrl: MONITORING_FALLBACK_STREAM_URL,
        lastOnlineAt: getMockLastOnlineAt(index),
      }
    })
}

export function buildMonitoringSearchText(device: MonitoringDeviceRecord) {
  return [
    device.deviceName,
    device.platform,
    device.deviceId,
    device.customerName,
    device.parkName,
    device.buildingName,
    device.statusLabel,
  ].join(" ").toLowerCase()
}

function getMockLastOnlineAt(index: number) {
  const minute = Math.max(0, 20 - (index * 7) % 58)
  return `2026-05-29 ${String(14 - (index % 4)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

const MONITORING_LOCAL_STORAGE_KEY = "buildguard.monitoring.local-devices"

function readMonitoringLocalDevices(): MonitoringDeviceRecord[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(MONITORING_LOCAL_STORAGE_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : []

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .map(item => normalizeMonitoringDeviceRecord(item))
      .filter(device => device.id && device.deviceName && device.deviceId)
  } catch {
    return []
  }
}

function writeMonitoringLocalDevices(devices: MonitoringDeviceRecord[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(MONITORING_LOCAL_STORAGE_KEY, JSON.stringify(devices))
}

function normalizeMonitoringDeviceRecord(value: unknown): MonitoringDeviceRecord {
  const source: Record<string, unknown> = isRecord(value) ? value : {}
  const status = normalizeMonitoringDeviceStatus(source.status)

  return {
    id: normalizeText(source.id),
    deviceName: normalizeText(source.deviceName),
    platform: normalizeText(source.platform),
    deviceId: normalizeText(source.deviceId),
    customerUuid: normalizeText(source.customerUuid),
    customerName: normalizeText(source.customerName, "未关联客户"),
    parkUuid: normalizeText(source.parkUuid),
    parkName: normalizeText(source.parkName, "未关联园区"),
    buildingUuid: normalizeText(source.buildingUuid),
    buildingName: normalizeText(source.buildingName, "未关联建筑"),
    status,
    statusLabel: getMonitoringStatusLabel(status),
    streamUrl: normalizeText(source.streamUrl, MONITORING_PRIMARY_STREAM_URL),
    fallbackStreamUrl: normalizeText(source.fallbackStreamUrl, MONITORING_FALLBACK_STREAM_URL),
    lastOnlineAt: normalizeText(source.lastOnlineAt, "-"),
    remark: normalizeText(source.remark),
  }
}

function normalizeMonitoringDeviceStatus(value: unknown): MonitoringDeviceStatus {
  if (value === "online" || value === "unstable" || value === "offline") {
    return value
  }

  return "online"
}

function getMonitoringStatusLabel(status: MonitoringDeviceStatus) {
  if (status === "online") return "在线"
  if (status === "unstable") return "波动"
  return "离线"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object")
}

function normalizeText(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value.trim() || fallback
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}
