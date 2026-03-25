import { reactive, ref } from "vue"

import { getApiErrorMessage } from "@/lib/api-errors"
import { fetchCurrentUserInfo, type CurrentUserInfoResult, type CurrentUserRole } from "@/lib/current-user-api"

export type CurrentUserState = {
  avatarSrc: string
  corpName: string
  departmentName: string
  email: string
  id: number | null
  name: string
  phone: string
  position: string
  roles: CurrentUserRole[]
  type: number | null
  uuid: string
}

const currentUser = reactive<CurrentUserState>({
  avatarSrc: "",
  corpName: "",
  departmentName: "",
  email: "",
  id: null,
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

export async function loadCurrentUser(options: { force?: boolean } = {}) {
  if (pendingRequest && !options.force) {
    return pendingRequest
  }

  pendingRequest = (async () => {
    isLoading.value = true
    error.value = null

    try {
      const profile = await fetchCurrentUserInfo()
      applyCurrentUser(profile)
      hasLoaded.value = true
    } catch (requestError) {
      error.value = getApiErrorMessage(requestError, "当前用户信息加载失败，请稍后重试。")

      if (!hasLoaded.value) {
        resetCurrentUser()
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

function applyCurrentUser(profile: CurrentUserInfoResult) {
  const employee = profile.EmployeeInfo
  const customer = profile.CustomerInfo
  const resolvedName = employee?.Name?.trim() || customer?.Name?.trim() || "当前用户"
  const resolvedPhone = employee?.Phone?.trim() || customer?.Phone?.trim() || ""

  currentUser.uuid = profile.Uuid?.trim() ?? ""
  currentUser.id = typeof profile.Id === "number" ? profile.Id : null
  currentUser.type = typeof profile.Type === "number" ? profile.Type : null
  currentUser.name = resolvedName
  currentUser.phone = resolvedPhone
  currentUser.email = resolvedPhone
  currentUser.departmentName = employee?.DepartmentName?.trim() ?? ""
  currentUser.position = employee?.Position?.trim() ?? ""
  currentUser.roles = Array.isArray(employee?.Roles) ? employee.Roles : []
  currentUser.corpName = customer?.CorpName?.trim() ?? ""
}

function resetCurrentUser() {
  currentUser.uuid = ""
  currentUser.id = null
  currentUser.type = null
  currentUser.name = "当前用户"
  currentUser.phone = ""
  currentUser.email = ""
  currentUser.departmentName = ""
  currentUser.position = ""
  currentUser.roles = []
  currentUser.corpName = ""
}
