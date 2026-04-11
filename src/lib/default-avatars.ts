import avatarBlue from "@/assets/avatar-blue.png"
import avatarGray from "@/assets/avatar-gray.png"
import avatarGreen from "@/assets/avatar-green.png"
import avatarPink from "@/assets/avatar-pink.png"
import avatarPurple from "@/assets/avatar-purple.png"
import avatarYellow from "@/assets/avatar-yellow.png"

export const DEFAULT_AVATAR_STORAGE_KEY = "buildguard:selected-avatar"
export const DEFAULT_AVATAR_KEY = "green" as const

export const DEFAULT_AVATAR_OPTIONS = [
  { key: "pink", label: "粉色", src: avatarPink },
  { key: "gray", label: "灰色", src: avatarGray },
  { key: "yellow", label: "黄色", src: avatarYellow },
  { key: "blue", label: "蓝色", src: avatarBlue },
  { key: "green", label: "绿色", src: avatarGreen },
  { key: "purple", label: "紫色", src: avatarPurple },
] as const

export type DefaultAvatarKey = (typeof DEFAULT_AVATAR_OPTIONS)[number]["key"]
export type DefaultAvatarOption = (typeof DEFAULT_AVATAR_OPTIONS)[number]

const defaultAvatarSrcMap: Record<DefaultAvatarKey, string> = {
  pink: avatarPink,
  gray: avatarGray,
  yellow: avatarYellow,
  blue: avatarBlue,
  green: avatarGreen,
  purple: avatarPurple,
}

export function isDefaultAvatarKey(value: unknown): value is DefaultAvatarKey {
  return typeof value === "string" && value in defaultAvatarSrcMap
}

export function getDefaultAvatarSrc(key?: string | null) {
  if (key && isDefaultAvatarKey(key)) {
    return defaultAvatarSrcMap[key]
  }

  return defaultAvatarSrcMap[DEFAULT_AVATAR_KEY]
}
