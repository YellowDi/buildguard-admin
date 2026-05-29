import { fetchBuildings, type BuildingListItem } from "@/lib/buildings-api"
import { fetchCustomers, type CustomerListItem } from "@/lib/customers-api"
import { buildMonitoringDevicesFromLinkedAssets, type MonitoringDeviceRecord, type MonitoringLinkedAsset } from "@/lib/monitoring-mock"
import { fetchParks, type ParkListItem } from "@/lib/parks-api"

const MONITORING_ASSET_PAGE_SIZE = 500

export async function fetchMonitoringAssetDevices(): Promise<MonitoringDeviceRecord[]> {
  const [buildingsResult, parksResult, customersResult] = await Promise.allSettled([
    fetchBuildings({ PageNum: 1, PageSize: MONITORING_ASSET_PAGE_SIZE }),
    fetchParks({ PageNum: 1, PageSize: MONITORING_ASSET_PAGE_SIZE }),
    fetchCustomers({ PageNum: 1, PageSize: MONITORING_ASSET_PAGE_SIZE }),
  ])

  if (buildingsResult.status === "rejected") {
    throw buildingsResult.reason
  }

  return buildMonitoringDevicesFromLinkedAssets(
    buildMonitoringLinkedAssets(
      buildingsResult.value.list,
      parksResult.status === "fulfilled" ? parksResult.value.list : [],
      customersResult.status === "fulfilled" ? customersResult.value.list : [],
    ),
  )
}

function buildMonitoringLinkedAssets(
  buildings: BuildingListItem[],
  parks: ParkListItem[],
  customers: CustomerListItem[],
): MonitoringLinkedAsset[] {
  const parkMap = new Map<string, ParkListItem>()
  const customerMap = new Map<string, CustomerListItem>()

  for (const park of parks) {
    const uuid = normalizeText(park.Uuid)
    if (uuid) {
      parkMap.set(uuid, park)
    }
  }

  for (const customer of customers) {
    const uuid = normalizeText(customer.Uuid)
    if (uuid) {
      customerMap.set(uuid, customer)
    }
  }

  return buildings.map((building) => {
    const buildingUuid = normalizeText(building.Uuid)
    const parkUuid = normalizeText(building.ParkUuid)
    const park = parkUuid ? parkMap.get(parkUuid) : undefined
    const customerUuid = normalizeText(building.CustomerUuid) || normalizeText(park?.CustomerUuid)
    const customer = customerUuid ? customerMap.get(customerUuid) : undefined

    return {
      customerUuid,
      customerName: normalizeText(building.CustomerName)
        || normalizeText(building.CorpName)
        || normalizeText(park?.CorpName)
        || normalizeText(customer?.CorpName, "未关联客户"),
      parkUuid,
      parkName: normalizeText(building.ParkName) || normalizeText(park?.Name, "未关联园区"),
      buildingUuid,
      buildingName: normalizeText(building.Name, "未命名建筑"),
    }
  })
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
