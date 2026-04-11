import { reactive, ref } from "vue"

import { getApiErrorMessage } from "@/lib/api-errors"
import { fetchCurrentUserInfo, type CurrentUserInfoResult, type CurrentUserRole } from "@/lib/current-user-api"
import {
  DEFAULT_AVATAR_KEY,
  DEFAULT_AVATAR_STORAGE_KEY,
  getDefaultAvatarSrc,
  isDefaultAvatarKey,
  type DefaultAvatarKey,
} from "@/lib/default-avatars"

export type CurrentUserState = {
  avatarKey: DefaultAvatarKey
  avatarSrc: string
  corpName: string
  departmentName: string
  email: string
  id: number | null
  missingProfileMessage: string
  name: string
  phone: string
  position: string
  roles: CurrentUserRole[]
  type: number | null
  uuid: string
}

const initialAvatarKey = readStoredAvatarKey()

const currentUser = reactive<CurrentUserState>({
  avatarKey: initialAvatarKey,
  avatarSrc: getDefaultAvatarSrc(initialAvatarKey),
  corpName: "",
  departmentName: "",
  email: "",
  id: null,
  missingProfileMessage: "",
  name: "当前用户",
  phone: "",
  position: "",
  roles: [],
  type: null,
  uuid: "",
})

const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref<string | null>(null)

let pendingRequest: Promise<void> | null = null

export async function loadCurrentUser(options: { force?: boolean; throwOnError?: boolean } = {}) {
  if (pendingRequest && !options.force) {
    return pendingRequest
  }

  pendingRequest = (async () => {
    isLoading.value = true
    error.value = null

    try {
      const profile = await fetchCurrentUserInfo()
      setCurrentUser(profile)
    } catch (requestError) {
      error.value = getApiErrorMessage(requestError, "当前用户信息加载失败，请稍后重试。")

      if (!hasLoaded.value) {
        resetCurrentUser()
      }

      if (options.throwOnError) {
        throw requestError
      }
    } finally {
      isLoading.value = false
      pendingRequest = null
    }
  })()

  return pendingRequest
}

export function useCurrentUser() {
  if (!hasLoaded.value && !isLoading.value && typeof window !== "undefined") {
    void loadCurrentUser()
  }

  return {
    currentUser,
    error,
    hasLoaded,
    isLoading,
    loadCurrentUser,
  }
}

export function clearCurrentUser() {
  hasLoaded.value = false
  error.value = null
  isLoading.value = false
  pendingRequest = null
  resetCurrentUser()
}

export function setCurrentUser(profile: CurrentUserInfoResult) {
  applyCurrentUser(profile)
  hasLoaded.value = true
  error.value = null
}

export function setCurrentUserAvatar(avatarKey: DefaultAvatarKey) {
  writeStoredAvatarKey(avatarKey)
  syncCurrentUserAvatar(avatarKey)
}

function applyCurrentUser(profile: CurrentUserInfoResult) {
  const employee = profile.EmployeeInfo
  const customer = profile.CustomerInfo
  const resolvedName = employee?.Name?.trim() || customer?.Name?.trim() || buildFallbackName(profile)
  const resolvedPhone = employee?.Phone?.trim() || customer?.Phone?.trim() || ""

  syncCurrentUserAvatar(readStoredAvatarKey())
  currentUser.uuid = profile.Uuid?.trim() ?? ""
  currentUser.id = typeof profile.Id === "number" ? profile.Id : null
  currentUser.type = typeof profile.Type === "number" ? profile.Type : null
  currentUser.missingProfileMessage = buildMissingProfileMessage(profile)
  currentUser.name = resolvedName
  currentUser.phone = resolvedPhone
  currentUser.email = resolvedPhone
  currentUser.departmentName = employee?.DepartmentName?.trim() ?? ""
  currentUser.position = employee?.Position?.trim() ?? ""
  currentUser.roles = Array.isArray(employee?.Roles) ? employee.Roles : []
  currentUser.corpName = customer?.CorpName?.trim() ?? ""
}

function resetCurrentUser() {
  syncCurrentUserAvatar(readStoredAvatarKey())
  currentUser.uuid = ""
  currentUser.id = null
  currentUser.type = null
  currentUser.missingProfileMessage = ""
  currentUser.name = "当前用户"
  currentUser.phone = ""
  currentUser.email = ""
  currentUser.departmentName = ""
  currentUser.position = ""
  currentUser.roles = []
  currentUser.corpName = ""
}

function buildFallbackName(profile: CurrentUserInfoResult) {
  const idSuffix = typeof profile.Id === "number" ? ` #${profile.Id}` : ""

  if (profile.Type === 1) {
    return `员工账号${idSuffix}`
  }

  if (profile.Type === 2) {
    return `客户账号${idSuffix}`
  }

  return idSuffix ? `用户${idSuffix}` : "当前用户"
}

function buildMissingProfileMessage(profile: CurrentUserInfoResult) {
  if (profile.EmployeeInfo?.Name?.trim() || profile.CustomerInfo?.Name?.trim()) {
    return ""
  }

  if (profile.Type === 1) {
    return "当前账号未绑定员工档案"
  }

  if (profile.Type === 2) {
    return "当前账号未绑定客户档案"
  }

  return "当前账号未绑定用户档案"
}

function syncCurrentUserAvatar(avatarKey: DefaultAvatarKey) {
  currentUser.avatarKey = avatarKey
  currentUser.avatarSrc = getDefaultAvatarSrc(avatarKey)
}

function readStoredAvatarKey(): DefaultAvatarKey {
  if (typeof window === "undefined") {
    return DEFAULT_AVATAR_KEY
  }

  const stored = window.localStorage.getItem(DEFAULT_AVATAR_STORAGE_KEY)
  return isDefaultAvatarKey(stored) ? stored : DEFAULT_AVATAR_KEY
}

function writeStoredAvatarKey(avatarKey: DefaultAvatarKey) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(DEFAULT_AVATAR_STORAGE_KEY, avatarKey)
}
