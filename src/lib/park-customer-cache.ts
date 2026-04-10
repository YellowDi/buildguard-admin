import { fetchParkDetail } from "@/lib/parks-api"

export type ParkCustomerInfo = {
  customerUuid: string
  customerName: string
}

const parkCustomerCache = new Map<string, ParkCustomerInfo>()
const parkCustomerInflight = new Map<string, Promise<ParkCustomerInfo>>()

export function primeParkCustomerCache(parkUuid: string, info: ParkCustomerInfo) {
  const normalizedParkUuid = normalizeText(parkUuid)
  const customerName = normalizeText(info.customerName)

  if (!normalizedParkUuid || !customerName) {
    return
  }

  parkCustomerCache.set(normalizedParkUuid, {
    customerUuid: normalizeText(info.customerUuid),
    customerName,
  })
}

export async function resolveParkCustomerMap(parkUuids: string[]) {
  const uniqueParkUuids = [...new Set(parkUuids.map(normalizeText).filter(Boolean))]
  const resolvedEntries = await Promise.all(
    uniqueParkUuids.map(async parkUuid => [parkUuid, await resolveParkCustomerInfo(parkUuid)] as const),
  )

  return new Map<string, ParkCustomerInfo>(resolvedEntries)
}

async function resolveParkCustomerInfo(parkUuid: string): Promise<ParkCustomerInfo> {
  const normalizedParkUuid = normalizeText(parkUuid)

  if (!normalizedParkUuid) {
    return emptyParkCustomerInfo()
  }

  const cached = parkCustomerCache.get(normalizedParkUuid)

  if (cached) {
    return cached
  }

  const inflight = parkCustomerInflight.get(normalizedParkUuid)

  if (inflight) {
    return inflight
  }

  const request = (async () => {
    try {
      const detail = await fetchParkDetail({ Uuid: normalizedParkUuid })
      const resolved = {
        customerUuid: normalizeText(detail.CustomerUuid),
        customerName: normalizeText(detail.CorpName) || "未关联客户",
      }

      parkCustomerCache.set(normalizedParkUuid, resolved)
      return resolved
    } catch {
      return emptyParkCustomerInfo()
    } finally {
      parkCustomerInflight.delete(normalizedParkUuid)
    }
  })()

  parkCustomerInflight.set(normalizedParkUuid, request)

  return request
}

function emptyParkCustomerInfo(): ParkCustomerInfo {
  return {
    customerUuid: "",
    customerName: "未关联客户",
  }
}

function normalizeText(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return ""
}
