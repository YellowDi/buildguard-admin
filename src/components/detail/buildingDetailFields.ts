import type { DetailFieldSection } from "@/components/detail/types"
import type { BuildingListItem } from "@/lib/buildings-api"
import { hasValidLatLng } from "@/lib/map-coordinates"

export type BuildingDetailSectionsOptions = {
  /** 有坐标时在「地址」行右侧展示「在地图中查看」 */
  onOpenMap?: () => void
}

export function buildBuildingDetailSections(
  building: BuildingListItem | null,
  options?: BuildingDetailSectionsOptions,
): DetailFieldSection[] {
  if (!building) {
    return []
  }

  const addressRow = {
    key: "address",
    label: "地址",
    value: toText(building.Address, "-"),
    truncate: false,
    valueClass: "leading-6",
    ...(hasValidLatLng(building.Latitude, building.Longitude) && options?.onOpenMap
      ? {
          suffixAction: {
            label: "在地图中查看",
            onClick: options.onOpenMap,
          },
        }
      : {}),
  }

  return [
    {
      key: "building-info",
      title: "建筑基础信息",
      rows: [
        { key: "name", label: "建筑名称", value: toText(building.Name, "未命名建筑") },
        { key: "building-uuid", label: "建筑 UUID", value: toText(building.Uuid, "-") },
        { key: "park-name", label: "所属园区", value: toText(building.ParkName, "-") },
        { key: "park-uuid", label: "园区 UUID", value: toText(building.ParkUuid, "-") },
        { key: "built-time", label: "建成时间", value: toText(building.BuiltTime, "-") },
        { key: "operation-time", label: "投运时间", value: toText(building.OperationTime, "-") },
        { key: "building-area", label: "建筑面积", value: toText(building.BuildingArea ?? building.BuildArea, "-") },
        { key: "contact-person", label: "联系人", value: toText(building.ContactPerson ?? building.Contact, "未填写") },
        { key: "contact-phone", label: "联系电话", value: toText(building.ContactPhone, "-") },
        addressRow,
        { key: "created-at", label: "创建时间", value: toText(building.CreatedAt, "-") },
        { key: "updated-at", label: "更新时间", value: toText(building.UpdatedAt, "-") },
      ],
    },
  ]
}

export function toText(value: unknown, fallback: string | null = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}
