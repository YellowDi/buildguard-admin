import { loadAmap } from "@/lib/load-amap"

/**
 * 逆地理编码：根据 GCJ-02 经纬度解析格式化地址（依赖高德 Geocoder）。
 */
export async function reverseGeocodeFormatted(lat: number, lng: number): Promise<string | null> {
  const AMap = await loadAmap()

  return new Promise((resolve) => {
    const done = (status: string, result: { regeocode?: { formattedAddress?: string } }) => {
      if (status === "complete" && result?.regeocode?.formattedAddress) {
        const text = String(result.regeocode.formattedAddress).trim()
        resolve(text || null)
        return
      }
      resolve(null)
    }

    AMap.plugin("AMap.Geocoder", () => {
      try {
        const geocoder = new AMap.Geocoder()
        geocoder.getAddress([lng, lat], done)
      }
      catch {
        resolve(null)
      }
    })
  })
}
