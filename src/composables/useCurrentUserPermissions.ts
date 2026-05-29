import { computed, ref } from "vue"

import { useCurrentUser } from "@/composables/useCurrentUser"
import { ApiError, getApiErrorMessage } from "@/lib/api-errors"
import { fetchUserPermissionTree, type PermissionTreeNode } from "@/lib/current-user-permissions-api"
import { fetchSystemButtons, type SystemResourceRecord } from "@/lib/system-resources-api"

type PermissionSnapshot = {
  buttonCodes: Set<string>
  buttonUuids: Set<string>
  menuPaths: Set<string>
  menuUuids: Set<string>
}

type LoadPermissionsOptions = {
  force?: boolean
  throwOnError?: boolean
}

const permissions = ref<PermissionSnapshot>(createEmptySnapshot())
const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref<string | null>(null)

const hasMenuPermissions = computed(() => permissions.value.menuPaths.size > 0)
const hasButtonPermissions = computed(() => permissions.value.buttonCodes.size > 0)

let pendingRequest: Promise<void> | null = null
let loadedUserUuid = ""

export function useCurrentUserPermissions() {
  return {
    buttonCodes: computed(() => permissions.value.buttonCodes),
    buttonUuids: computed(() => permissions.value.buttonUuids),
    canButton,
    canMenu,
    clearCurrentUserPermissions,
    error,
    hasButtonPermissions,
    hasLoaded,
    hasMenuPermissions,
    isLoading,
    loadCurrentUserPermissions,
    menuPaths: computed(() => permissions.value.menuPaths),
    menuUuids: computed(() => permissions.value.menuUuids),
  }
}

export async function loadCurrentUserPermissions(options: LoadPermissionsOptions = {}) {
  const { currentUser, loadCurrentUser } = useCurrentUser()

  if (!currentUser.uuid) {
    await loadCurrentUser({
      throwOnError: options.throwOnError,
    })
  }

  const userUuid = currentUser.uuid.trim()

  if (!userUuid) {
    clearCurrentUserPermissions()

    if (options.throwOnError) {
      throw new ApiError("当前用户缺少 Uuid，无法加载权限。")
    }

    return
  }

  if (pendingRequest && !options.force) {
    return pendingRequest
  }

  if (hasLoaded.value && loadedUserUuid === userUuid && !options.force) {
    return
  }

  pendingRequest = loadPermissionSnapshot(userUuid, options)
  return pendingRequest
}

export function clearCurrentUserPermissions() {
  permissions.value = createEmptySnapshot()
  hasLoaded.value = false
  error.value = null
  loadedUserUuid = ""
  pendingRequest = null
}

export function canMenu(path: string) {
  const normalizedPath = normalizePath(path)

  if (!normalizedPath) {
    return true
  }

  if (!hasLoaded.value || !hasMenuPermissions.value) {
    return false
  }

  return permissions.value.menuPaths.has(normalizedPath)
}

export function canButton(code: string) {
  const normalizedCode = code.trim()

  if (!normalizedCode) {
    return true
  }

  if (!hasLoaded.value || !hasButtonPermissions.value) {
    return false
  }

  return permissions.value.buttonCodes.has(normalizedCode)
}

async function loadPermissionSnapshot(userUuid: string, options: LoadPermissionsOptions) {
  isLoading.value = true
  error.value = null

  try {
    const permissionTree = await fetchUserPermissionTree({
      Uuid: userUuid,
    })
    const buttons = await loadButtonCodeResources()

    permissions.value = buildPermissionSnapshot(permissionTree.Nodes, buttons)
    loadedUserUuid = userUuid
    hasLoaded.value = true
  } catch (requestError) {
    const message = getApiErrorMessage(requestError, "用户权限加载失败，请稍后重试。")
    clearCurrentUserPermissions()
    error.value = message

    if (options.throwOnError) {
      throw requestError
    }
  } finally {
    isLoading.value = false
    pendingRequest = null
  }
}

async function loadButtonCodeResources() {
  try {
    const result = await fetchSystemButtons({
      PageNum: 0,
      PageSize: 0,
    })

    return result.list
  } catch {
    return [] as SystemResourceRecord[]
  }
}

function buildPermissionSnapshot(nodes: PermissionTreeNode[], buttons: SystemResourceRecord[]) {
  const snapshot = createEmptySnapshot()
  const buttonCodeByUuid = buildButtonCodeIndex(buttons)

  walkPermissionNodes(nodes, (node) => {
    const record = node as Record<string, unknown>
    const uuid = getText(record.Uuid, record.uuid)
    const nodeType = getText(record.Type, record.type, record.NodeType, record.nodeType).toLowerCase()
    const path = getNodePath(record)
    const code = getText(record.Code, record.code)
    const isButton = nodeType === "button" || Boolean(code)
    const isMenu = nodeType === "menu" || (!isButton && Boolean(path))

    if (isMenu) {
      if (uuid) {
        snapshot.menuUuids.add(uuid)
      }

      if (path) {
        snapshot.menuPaths.add(path)
      }
    }

    if (isButton) {
      if (uuid) {
        snapshot.buttonUuids.add(uuid)
      }

      const resolvedCode = code || buttonCodeByUuid.get(uuid) || ""

      if (resolvedCode) {
        snapshot.buttonCodes.add(resolvedCode)
      }
    }
  })

  return snapshot
}

function buildButtonCodeIndex(buttons: SystemResourceRecord[]) {
  const index = new Map<string, string>()

  buttons.forEach((button) => {
    const uuid = getText(button.Uuid, button.uuid)
    const code = getText(button.Code, button.code)

    if (uuid && code) {
      index.set(uuid, code)
    }
  })

  return index
}

function walkPermissionNodes(nodes: PermissionTreeNode[], visit: (node: PermissionTreeNode) => void) {
  nodes.forEach((node) => {
    visit(node)

    const record = node as Record<string, unknown>
    const children = [
      ...getNodeArray(record.Children),
      ...getNodeArray(record.children),
      ...getNodeArray(record.Buttons),
      ...getNodeArray(record.buttons),
    ]

    walkPermissionNodes(children, visit)
  })
}

function getNodePath(record: Record<string, unknown>) {
  return normalizePath(getText(
    record.Path,
    record.path,
    record.MenuPath,
    record.menuPath,
    record.RoutePath,
    record.routePath,
    record.Url,
    record.url,
  ))
}

function getNodeArray(value: unknown) {
  return Array.isArray(value) ? value as PermissionTreeNode[] : []
}

function createEmptySnapshot(): PermissionSnapshot {
  return {
    buttonCodes: new Set<string>(),
    buttonUuids: new Set<string>(),
    menuPaths: new Set<string>(),
    menuUuids: new Set<string>(),
  }
}

function normalizePath(path: string) {
  const trimmedPath = path.trim().split(/[?#]/)[0]?.replace(/\/+$/, "") ?? ""

  if (!trimmedPath) {
    return ""
  }

  return trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`
}

function getText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return ""
}
