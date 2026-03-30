/**
 * 地图与接口经纬度约定
 *
 * 本前端接入高德地图 JS API 2.0，底图与拾取坐标均为 GCJ-02（国测局、火星坐标）。
 * 请与后端约定：`Latitude` / `Longitude` 入库与回传使用同一坐标系；若为 WGS-84 或 BD-09，
 * 需在服务端或独立转换层处理后再写入，避免重复偏移。
 *
 * 空值策略：无坐标时不展示地图或提示「暂无坐标」；仅允许用户通过选点或手工输入补全。
 */

/** 高德默认示例中心（北京天安门附近），无坐标时作为选点地图初始视野 */
export const DEFAULT_MAP_CENTER = { lat: 39.90923, lng: 116.397428 }

export type ParsedLatLng = { lat: number; lng: number }

/**
 * 从接口字符串解析经纬度；非法或缺失时返回 null。
 */
export function parseLatLng(latitude: unknown, longitude: unknown): ParsedLatLng | null {
  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    return null
  }

  const lat = typeof latitude === "number" ? latitude : Number.parseFloat(String(latitude).trim())
  const lng = typeof longitude === "number" ? longitude : Number.parseFloat(String(longitude).trim())

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }

  return { lat, lng }
}

export function hasValidLatLng(latitude: unknown, longitude: unknown): boolean {
  return parseLatLng(latitude, longitude) !== null
}
