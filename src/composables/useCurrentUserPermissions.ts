import { computed, ref } from "vue"

import { useCurrentUser } from "@/composables/useCurrentUser"
import { getApiErrorMessage } from "@/lib/api-errors"
import { fetchUserPermissionTree, type PermissionTreeNode } from "@/lib/current-user-permissions-api"
import { fetchSystemButtons } from "@/lib/system-resources-api"

type PermissionSnapshot = {
  buttonCodes: Set<string>
  buttonUuids: Set<string>
  menuPaths: Set<string>
  menuUuids: Set<string>
  nodeCount: number
}

const emptySnapshot = (): PermissionSnapshot => ({
  buttonCodes: new Set<string>(),
  buttonUuids: new Set<string>(),
  menuPaths: new Set<string>(),
  menuUuids: new Set<string>(),
  nodeCount: 0,
})

const permissions = ref<PermissionSnapshot>(emptySnapshot())
const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref<string | null>(null)

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

export async function loadCurrentUserPermissions(options: { force?: boolean; throwOnError?: boolean } = {}) {
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
      throw new Error("当前用户缺少 Uuid，无法加载权限。")
    }

    return
  }

  if (pendingRequest && !options.force) {
    return pendingRequest
  }

  if (hasLoaded.value && loadedUserUuid === userUuid && !options.force) {
    return
  }

  pendingRequest = (async () => {
    isLoading.value = true
    error.value = null

    try {
      const [permissionTree, buttonResult] = await Promise.all([
        fetchUserPermissionTree({
          Uuid: userUuid,
        }),
        fetchSystemButtons({
          PageNum: 0,
          PageSize: 0,
        }),
      ])

      permissions.value = buildPermissionSnapshot(permissionTree.Nodes, buttonResult.list)
      loadedUserUuid = userUuid
      hasLoaded.value = true
    } catch (requestError) {
      error.value = getApiErrorMessage(requestError, "用户权限加载失败，请稍后重试。")
      clearCurrentUserPermissions()

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

export function clearCurrentUserPermissions() {
  permissions.value = emptySnapshot()
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

  if (!hasMenuPermissions.value) {
    return true
  }

  return permissions.value.menuPaths.has(normalizedPath)
}

export function canButton(code: string) {
  const normalizedCode = code.trim()

  if (!normalizedCode) {
    return true
  }

  if (!hasButtonPermissions.value) {
    return true
  }

  return permissions.value.buttonCodes.has(normalizedCode)
}

function buildPermissionSnapshot(nodes: PermissionTreeNode[], buttons: Array<Record<string, unknown>>) {
  const next = emptySnapshot()
  const buttonCodeByUuid = new Map<string, string>()

  buttons.forEach((button) => {
    const uuid = toText(button.Uuid, button.uuid)
    const code = toText(button.Code, button.code)

    if (uuid && code) {
      buttonCodeByUuid.set(uuid, code)
    }
  })

  walkPermissionNodes(nodes, (node) => {
    next.nodeCount += 1

    const record = node as Record<string, unknown>
    const type = toText(record.Type, record.type, record.NodeType, record.nodeType).toLowerCase()
    const uuid = toText(record.Uuid, record.uuid)
    const path = normalizePath(toText(
      record.Path,
      record.path,
      record.MenuPath,
      record.menuPath,
      record.RoutePath,
      record.routePath,
      record.Url,
      record.url,
    ))
    const code = toText(record.Code, record.code)

    if (type !== "button" && path) {
      next.menuPaths.add(path)
    }

    if (type === "menu" || (type !== "button" && path)) {
      if (uuid) {
        next.menuUuids.add(uuid)
      }
    }

    if (type === "button" || code) {
      if (uuid) {
        next.buttonUuids.add(uuid)
      }

      const resolvedCode = code || buttonCodeByUuid.get(uuid) || ""

      if (resolvedCode) {
        next.buttonCodes.add(resolvedCode)
      }
    }
  })

  return next
}

function walkPermissionNodes(nodes: PermissionTreeNode[], visit: (node: PermissionTreeNode) => void) {
  nodes.forEach((node) => {
    const record = node as Record<string, unknown>
    const childNodes = [
      ...(Array.isArray(record.Children) ? record.Children : []),
      ...(Array.isArray(record.children) ? record.children : []),
      ...(Array.isArray(record.Buttons) ? record.Buttons : []),
      ...(Array.isArray(record.buttons) ? record.buttons : []),
    ] as PermissionTreeNode[]

    visit(node)
    walkPermissionNodes(childNodes, visit)
  })
}

function normalizePath(path: string) {
  const trimmedPath = path.trim().split(/[?#]/)[0]?.replace(/\/+$/, "") ?? ""

  if (!trimmedPath) {
    return ""
  }

  return trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`
}

function toText(...values: unknown[]) {
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

const hasMenuPermissions = computed(() => permissions.value.menuPaths.size > 0)
const hasButtonPermissions = computed(() => permissions.value.buttonCodes.size > 0)
