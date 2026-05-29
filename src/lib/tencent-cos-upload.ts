import type { UploadTencentCosFilePayload, UploadTencentCosFileResult } from "@/lib/tencent-cos-sdk"

export async function uploadTencentCosFile(payload: UploadTencentCosFilePayload): Promise<UploadTencentCosFileResult> {
  const { uploadTencentCosFile: uploadFile } = await import("@/lib/tencent-cos-sdk")

  return uploadFile(payload)
}
