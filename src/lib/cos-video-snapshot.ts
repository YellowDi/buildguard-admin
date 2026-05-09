/**
 * 基于 COS 数据万象参数生成视频封面图地址。
 */
export function buildCosVideoSnapshotUrl(
  videoUrl: string,
  options: {
    time?: number
    format?: string
    width?: number
    height?: number
  } = {},
) {
  const normalizedVideoUrl = String(videoUrl ?? "").trim()
  if (!normalizedVideoUrl) {
    return ""
  }

  const {
    time = 5,
    format = "jpg",
    width = 375,
    height = 0,
  } = options
  const queryPrefix = normalizedVideoUrl.includes("?") ? "&" : "?"

  return `${normalizedVideoUrl}${queryPrefix}ci-process=snapshot&time=${time}&format=${format}&width=${width}&height=${height}`
}
