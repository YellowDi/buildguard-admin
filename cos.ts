import { getTencentCosSts, type TencentCosStsResponse } from "@/api/tencent";
// #ifdef MP-WEIXIN
import COSWX from "cos-wx-sdk-v5";
// #endif
// #ifndef MP-WEIXIN
import COSWeb from "cos-js-sdk-v5";
// #endif

type CosUploadSource = {
  filePath: string;
  fileName?: string;
  fileType?: string;
};

type CachedCosStsPayload = TencentCosStsResponse & {
  expiredTime: number;
  startTime: number;
};

/**
 * 读取本地文件扩展名，用于生成对象 key。
 */
function getFileExtension(fileName = "", filePath = "") {
  const sourceName = fileName || filePath.split("?")[0] || "";
  const matchedExtension = sourceName.match(/\.([a-zA-Z0-9]+)$/);
  return matchedExtension?.[1]?.toLowerCase() || "";
}

/**
 * 根据时间和随机串生成 COS 对象 key。
 */
function buildCosObjectKey(source: CosUploadSource) {
  const now = new Date();
  const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const extension = getFileExtension(source.fileName, source.filePath);
  const randomSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `repair/${datePrefix}/${randomSuffix}${extension ? `.${extension}` : ""}`;
}

/**
 * 将本地文件路径读取为 ArrayBuffer，兼容 App、小程序和 H5。
 */
async function readLocalFileAsArrayBuffer(filePath: string) {
  // #ifdef MP-WEIXIN
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const fileSystemManager = uni.getFileSystemManager?.();
    if (!fileSystemManager) {
      reject(new Error("当前环境不支持文件读取"));
      return;
    }
    fileSystemManager.readFile({
      filePath,
      success: (result) => {
        resolve(result.data as ArrayBuffer);
      },
      fail: () => {
        reject(new Error("读取文件失败"));
      },
    });
  });
  // #endif

  // #ifdef APP-PLUS
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    plus.io.resolveLocalFileSystemURL(
      filePath,
      (entry) => {
        const fileEntry = entry as unknown as {
          file: (success: (file: unknown) => void, fail?: () => void) => void;
        };
        fileEntry.file((file) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as ArrayBuffer);
          };
          reader.onerror = () => {
            reject(new Error("读取文件失败"));
          };
          reader.readAsArrayBuffer(file as Blob);
        }, () => {
          reject(new Error("读取文件失败"));
        });
      },
      () => {
        reject(new Error("读取文件失败"));
      },
    );
  });
  // #endif

  // #ifndef APP-PLUS || MP-WEIXIN
  const response = await fetch(filePath);
  return await response.arrayBuffer();
  // #endif
}

/**
 * 解析 STS 的过期时间和起始时间。
 */
function parseCosStsTime(stsPayload: TencentCosStsResponse) {
  const expirationTime = Math.floor(new Date(stsPayload.Sts?.Expiration ?? "").getTime() / 1000);
  const expiredTime = Number.isFinite(expirationTime) && expirationTime > 0
    ? expirationTime
    : Math.floor(Date.now() / 1000) + 1800;
  const startTime = Math.max(0, Math.floor(Date.now() / 1000) - 60);
  return {
    expiredTime,
    startTime,
  };
}

/**
 * 每次上传前都重新拉取一份 COS STS。
 */
async function getFreshCosStsPayload() {
  const stsPayload = await getTencentCosSts();
  const { expiredTime, startTime } = parseCosStsTime(stsPayload);
  return {
    ...stsPayload,
    expiredTime,
    startTime,
  };
}

/**
 * 基于当前这次上传拿到的 STS 创建 COS 客户端。
 */
function createCosClient(stsPayload: CachedCosStsPayload) {
  let COSCtor: any;
  // #ifdef MP-WEIXIN
  COSCtor = COSWX;
  // #endif
  // #ifndef MP-WEIXIN
  COSCtor = COSWeb;
  // #endif
  return new COSCtor({
    getAuthorization: (_: unknown, callback: (authData: Record<string, any>) => void) => {
      callback({
        TmpSecretId: String(stsPayload.Sts?.AccessKeyId ?? ""),
        TmpSecretKey: String(stsPayload.Sts?.AccessKeySecret ?? ""),
        SecurityToken: String(stsPayload.Sts?.SecurityToken ?? ""),
        StartTime: stsPayload.startTime,
        ExpiredTime: stsPayload.expiredTime,
      });
    },
  });
}

/**
 * 组装最终可访问的对象 URL。
 */
function buildCosObjectUrl(stsPayload: TencentCosStsResponse, objectKey: string) {
  const domain = String(stsPayload.Domain ?? "").trim();
  if (domain) {
    if (/^https?:\/\//.test(domain)) {
      return `${domain.replace(/\/$/, "")}/${objectKey}`;
    }
    return `https://${domain.replace(/\/$/, "")}/${objectKey}`;
  }
  const bucketName = String(stsPayload.BucketName ?? "").trim();
  const region = String(stsPayload.Region ?? "").trim();
  return `https://${bucketName}.cos.${region}.myqcloud.com/${objectKey}`;
}

/**
 * 将本地文件上传到腾讯云 COS，并返回最终访问地址。
 */
export async function uploadFileToTencentCos(source: CosUploadSource) {
  const stsPayload = await getFreshCosStsPayload();
  const cosClient = createCosClient(stsPayload);
  const bucketName = String(stsPayload.BucketName ?? "").trim();
  const region = String(stsPayload.Region ?? "").trim();

  if (!bucketName || !region) {
    throw new Error("COS 配置缺失");
  }

  const objectKey = buildCosObjectKey(source);
  // #ifdef MP-WEIXIN
  await (cosClient as any).uploadFile({
    Bucket: bucketName,
    Region: region,
    Key: objectKey,
    FilePath: source.filePath,
    ContentType: source.fileType,
    SliceSize: 1024 * 1024,
  });
  // #endif

  // #ifndef MP-WEIXIN
  const body = await readLocalFileAsArrayBuffer(source.filePath);
  await cosClient.uploadFile({
    Bucket: bucketName,
    Region: region,
    Key: objectKey,
    Body: body as any,
    ContentLength: body.byteLength,
    ContentType: source.fileType,
    SliceSize: 1024 * 1024,
  });
  // #endif

  return buildCosObjectUrl(stsPayload, objectKey);
}

/**
 * 基于 COS 数据万象参数生成视频封面图地址。
 */
export function buildCosVideoSnapshotUrl(
  videoUrl: string,
  options: {
    time?: number;
    format?: string;
    width?: number;
    height?: number;
  } = {},
) {
  const normalizedVideoUrl = String(videoUrl ?? "").trim();
  if (!normalizedVideoUrl) {
    return "";
  }
  const {
    time = 5,
    format = "jpg",
    width = 375,
    height = 0,
  } = options;
  const queryPrefix = normalizedVideoUrl.includes("?") ? "&" : "?";
  return `${normalizedVideoUrl}${queryPrefix}ci-process=snapshot&time=${time}&format=${format}&width=${width}&height=${height}`;
}
