<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { toast } from "vue-sonner"

import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import SettingsPageHeader from "@/components/settings/SettingsPageHeader.vue"
import SettingsToolbarRefreshSlot from "@/components/settings/SettingsToolbarRefreshSlot.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
import SettingsToolbarSearchInput from "@/components/settings/SettingsToolbarSearchInput.vue"
import FileUploadField from "@/components/upload/FileUploadField.vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type {
  AppReleaseDraft,
  AppReleaseEntry,
  SettingsState,
} from "@/components/settings/types"
import { useCurrentUserPermissions } from "@/composables/useCurrentUserPermissions"
import { getApiErrorMessage, handleApiError } from "@/lib/api-errors"
import {
  createAppVersion,
  deleteAppVersion,
  fetchAppVersionDetail,
  fetchAppVersions,
  updateAppVersion,
  type AppVersionDetail,
} from "@/lib/app-versions-api"
import { PERMISSION_CODES } from "@/lib/permission-codes"
import { uploadTencentCosFile } from "@/lib/tencent-cos-upload"

const props = defineProps<{
  state: SettingsState
}>()

const { canButton } = useCurrentUserPermissions()

const selectedReleaseId = ref(props.state.appReleases[0]?.id ?? "")
const activePlatform = ref<AppReleaseDraft["platform"]>(props.state.appReleases[0]?.platform ?? "android")
const updateDialogOpen = ref(false)
const uploadingApkFile = ref(false)
const releaseApkFileName = ref("")
const loading = ref(false)
const detailLoading = ref(false)
const releaseSubmitting = ref(false)
const deleteDialogOpen = ref(false)
const deleting = ref(false)
const errorMessage = ref("")
const searchExpanded = ref(false)
const versionQuery = ref("")
const releaseDialogMode = ref<"create" | "edit">("create")
const releaseTargetUuid = ref("")
const releaseVersionCode = ref("")
const listPageNum = ref(1)
const listPageSize = ref(100)
const canCreateAppVersion = computed(() => canButton(PERMISSION_CODES.appVersionAdd))
const canEditAppVersion = computed(() => canButton(PERMISSION_CODES.appVersionEdit))
const canDeleteAppVersion = computed(() => canButton(PERMISSION_CODES.appVersionDelete))
const canUploadAppVersionApk = computed(() => canButton(PERMISSION_CODES.appVersionApkUpload))
let latestListRequestId = 0
let latestDetailRequestId = 0
let searchTimer: ReturnType<typeof setTimeout> | null = null

const releaseForm = reactive<AppReleaseDraft>({
  hasUpdate: true,
  versionName: "",
  title: "",
  description: "",
  forceUpdate: false,
  downloadUrl: "",
  appStoreUrl: "",
  platform: "android",
})

const releases = computed(() => props.state.appReleases)
const platformTabs = computed(() => [
  {
    id: "android",
    label: "Android",
    icon: "ri-android-line",
    badge: releases.value.filter(release => release.platform === "android").length,
  },
  {
    id: "ios",
    label: "iOS",
    icon: "ri-apple-line",
    badge: releases.value.filter(release => release.platform === "ios").length,
  },
])
const filteredReleases = computed(() => {
  return releases.value.filter(release => release.platform === activePlatform.value)
})
const selectedRelease = computed(() => {
  return filteredReleases.value.find(release => release.id === selectedReleaseId.value)
    ?? filteredReleases.value[0]
    ?? null
})

const distributionLabel = computed(() => {
  return selectedRelease.value?.platform === "ios" ? "App Store 地址" : "APK 安装包"
})
const distributionUrl = computed(() => {
  if (!selectedRelease.value) {
    return ""
  }

  return selectedRelease.value.platform === "android"
    ? selectedRelease.value.downloadUrl
    : selectedRelease.value.appStoreUrl
})
const isAndroidReleaseForm = computed(() => releaseForm.platform === "android")

watch(versionQuery, () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(() => {
    listPageNum.value = 1
    void loadReleases()
  }, 300)
})

onMounted(() => {
  void loadReleases()
})

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})

function formatPlatform(platform: AppReleaseDraft["platform"]) {
  return platform === "ios" ? "iOS" : "Android"
}

function platformToType(platform: AppReleaseDraft["platform"]) {
  return platform === "ios" ? 2 : 1
}

function typeToPlatform(type: unknown): AppReleaseDraft["platform"] {
  return Number(type) === 2 ? "ios" : "android"
}

function isMustUpdate(value: unknown) {
  return Number(value) === 1
}

function mapAppVersionToRelease(item: AppVersionDetail): AppReleaseEntry {
  const platform = typeToPlatform(item.Type)
  const versionName = toText(item.Version, "-")
  const url = toText(item.Url)
  const log = toText(item.Log, "-")
  const uuid = toText(item.Uuid)
  const id = uuid || `${platform}-${versionName}-${toText(item.Id)}`

  return {
    id,
    uuid,
    versionCode: toNumber(item.VersionCode),
    hasUpdate: false,
    versionName,
    title: versionName === "-" ? "应用更新" : `版本 ${versionName}`,
    description: log,
    forceUpdate: isMustUpdate(item.IsMust),
    downloadUrl: platform === "android" ? url : "",
    appStoreUrl: platform === "ios" ? url : "",
    platform,
    updatedAt: toText(item.CreatedAt, "-"),
  }
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return fallback
}

function toNumber(value: unknown) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

function sanitizeObjectKeyFileName(value: string) {
  const normalized = value.trim().replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "")

  return normalized || "app-release.apk"
}

function getFileNameFromUrl(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return ""
  }

  try {
    const pathname = new URL(normalized).pathname
    const parts = pathname.split("/").filter(Boolean)
    const name = parts[parts.length - 1]

    return name ? decodeURIComponent(name) : normalized
  } catch {
    const parts = normalized.split("/").filter(Boolean)

    return parts[parts.length - 1] ?? normalized
  }
}

function isApkFile(file: File) {
  return file.name.toLowerCase().endsWith(".apk")
}

function syncCurrentRelease(release: AppReleaseEntry) {
  const { id: _id, updatedAt: _updatedAt, ...payload } = release
  Object.assign(props.state.appRelease, payload)
}

function selectRelease(release: AppReleaseEntry) {
  selectedReleaseId.value = release.id
  syncCurrentRelease(release)
  void loadReleaseDetail(release)
}

function selectPlatform(platform: AppReleaseDraft["platform"]) {
  activePlatform.value = platform
  const firstRelease = releases.value.find(release => release.platform === platform)

  if (firstRelease) {
    selectRelease(firstRelease)
  }
}

function toggleSearch() {
  searchExpanded.value = !searchExpanded.value

  if (!searchExpanded.value && versionQuery.value) {
    versionQuery.value = ""
  }
}

async function copyDistributionUrl() {
  const url = distributionUrl.value.trim()

  if (!url) {
    toast.error(`暂无可复制的${distributionLabel.value}`)
    return
  }

  if (!navigator.clipboard) {
    toast.error("当前浏览器不支持复制")
    return
  }

  try {
    await navigator.clipboard.writeText(url)
    toast.success(`${distributionLabel.value}已复制`)
  } catch {
    toast.error("复制失败，请手动复制链接")
  }
}

function openDistributionUrl() {
  const url = distributionUrl.value.trim()

  if (!url) {
    toast.error(`暂无可打开的${distributionLabel.value}`)
    return
  }

  window.open(url, "_blank", "noopener,noreferrer")
}

async function refreshData() {
  await loadReleases()
}

async function loadReleases() {
  const requestId = ++latestListRequestId

  loading.value = true
  errorMessage.value = ""
  props.state.appReleases.splice(0)

  try {
    const result = await fetchAppVersions({
      PageNum: listPageNum.value,
      PageSize: listPageSize.value,
      Version: versionQuery.value || undefined,
    })

    if (requestId !== latestListRequestId) {
      return
    }

    const nextReleases = result.list.map(item => mapAppVersionToRelease(item))

    props.state.appReleases.splice(0, props.state.appReleases.length, ...nextReleases)

    const selected = nextReleases.find(release => release.id === selectedReleaseId.value)
      ?? nextReleases.find(release => release.platform === activePlatform.value)
      ?? nextReleases[0]

    if (selected) {
      activePlatform.value = selected.platform
      selectedReleaseId.value = selected.id
      syncCurrentRelease(selected)
      void loadReleaseDetail(selected)
    } else {
      selectedReleaseId.value = ""
    }
  } catch (error) {
    if (requestId !== latestListRequestId) {
      return
    }

    selectedReleaseId.value = ""
    errorMessage.value = handleApiError(error, {
      mode: "silent",
      fallback: "应用更新列表加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestListRequestId) {
      loading.value = false
    }
  }
}

async function loadReleaseDetail(release: AppReleaseEntry) {
  if (!release.uuid) {
    return
  }

  const requestId = ++latestDetailRequestId

  detailLoading.value = true

  try {
    const detail = await fetchAppVersionDetail({ Uuid: release.uuid })

    if (requestId !== latestDetailRequestId) {
      return
    }

    const nextRelease = mapAppVersionToRelease(detail)
    const index = props.state.appReleases.findIndex(item => item.id === release.id)

    if (index >= 0) {
      props.state.appReleases.splice(index, 1, nextRelease)
    }

    if (selectedReleaseId.value === release.id) {
      selectedReleaseId.value = nextRelease.id
      syncCurrentRelease(nextRelease)
    }
  } catch (error) {
    handleApiError(error, {
      title: "应用更新详情加载失败",
      fallback: "应用更新详情加载失败，请稍后重试。",
    })
  } finally {
    if (requestId === latestDetailRequestId) {
      detailLoading.value = false
    }
  }
}

function updateReleaseForm<K extends keyof AppReleaseDraft>(field: K, value: AppReleaseDraft[K]) {
  releaseForm[field] = value
}

function updateReleasePlatform(platform: AppReleaseDraft["platform"]) {
  releaseForm.platform = platform

  if (platform === "ios") {
    releaseForm.downloadUrl = ""
    releaseApkFileName.value = ""
  } else {
    releaseForm.appStoreUrl = ""
  }
}

function resetReleaseForm(platform = activePlatform.value, release?: AppReleaseEntry | null) {
  Object.assign(releaseForm, {
    hasUpdate: true,
    versionName: release?.versionName ?? "",
    title: release?.title ?? "",
    description: release?.description ?? "",
    forceUpdate: release?.forceUpdate ?? false,
    downloadUrl: platform === "android" ? release?.downloadUrl ?? "" : "",
    appStoreUrl: platform === "ios" ? release?.appStoreUrl ?? "" : "",
    platform,
  })
  releaseVersionCode.value = release?.versionCode === null || release?.versionCode === undefined
    ? ""
    : String(release.versionCode)
  releaseApkFileName.value = platform === "android" ? getFileNameFromUrl(release?.downloadUrl ?? "") : ""
}

function openCreateDialog() {
  if (!canCreateAppVersion.value) {
    return
  }

  releaseDialogMode.value = "create"
  releaseTargetUuid.value = ""
  resetReleaseForm(activePlatform.value)
  updateDialogOpen.value = true
}

function openEditDialog() {
  if (!canEditAppVersion.value) {
    return
  }

  if (!selectedRelease.value?.uuid) {
    toast.error("版本信息不完整，无法编辑")
    return
  }

  releaseDialogMode.value = "edit"
  releaseTargetUuid.value = selectedRelease.value.uuid
  resetReleaseForm(selectedRelease.value.platform, selectedRelease.value)
  updateDialogOpen.value = true
}

function openDeleteDialog() {
  if (!canDeleteAppVersion.value) {
    return
  }

  if (!selectedRelease.value?.uuid) {
    toast.error("版本信息不完整，无法删除")
    return
  }

  deleteDialogOpen.value = true
}

async function handleApkFiles(files: File[]) {
  if (!canUploadAppVersionApk.value) {
    toast.error("无权上传应用安装包")
    return
  }

  const file = files[0]

  if (!file) {
    return
  }

  if (!isApkFile(file)) {
    toast.error("请上传应用安装包")
    return
  }

  uploadingApkFile.value = true

  try {
    const result = await uploadTencentCosFile({
      file,
      key: `app-releases/android/${Date.now()}-${sanitizeObjectKeyFileName(file.name)}`,
      contentType: file.type || "application/vnd.android.package-archive",
    })

    releaseForm.downloadUrl = result.url
    releaseApkFileName.value = file.name
    toast.success("应用安装包已上传")
  } catch (error) {
    toast.error("应用安装包上传失败", {
      description: getApiErrorMessage(error, "请稍后重试。"),
    })
  } finally {
    uploadingApkFile.value = false
  }
}

function parseVersionCode() {
  const normalizedValue = releaseVersionCode.value.trim()

  if (!normalizedValue) {
    return undefined
  }

  const parsedValue = Number(normalizedValue)

  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : null
}

async function submitRelease() {
  if (releaseDialogMode.value === "edit" && !canEditAppVersion.value) {
    toast.error("无权编辑应用版本")
    return
  }

  if (releaseDialogMode.value === "create" && !canCreateAppVersion.value) {
    toast.error("无权新建应用版本")
    return
  }

  if (uploadingApkFile.value) {
    toast.error("应用安装包正在上传，请稍后保存")
    return
  }

  const versionName = releaseForm.versionName.trim()
  const description = releaseForm.description.trim()
  const url = releaseForm.platform === "android"
    ? releaseForm.downloadUrl.trim()
    : releaseForm.appStoreUrl.trim()
  const versionCode = parseVersionCode()

  if (!versionName || !description) {
    toast.error("请填写版本号和更新日志")
    return
  }

  if (versionCode === null) {
    toast.error("版本码必须是非负整数")
    return
  }

  if (releaseForm.platform === "android" && !url) {
    toast.error("请上传应用安装包")
    return
  }

  releaseSubmitting.value = true

  try {
    const payload = {
      Log: description,
      Type: platformToType(releaseForm.platform),
      Url: url || undefined,
      Version: versionName,
      VersionCode: versionCode,
      IsMust: releaseForm.forceUpdate ? 1 : 2,
    }

    const result = releaseDialogMode.value === "edit"
      ? await updateAppVersion({
          ...payload,
          Uuid: releaseTargetUuid.value,
        })
      : await createAppVersion(payload)

    updateDialogOpen.value = false
    toast.success(releaseDialogMode.value === "edit" ? "版本信息已更新" : "新版本已添加")

    await loadReleases()

    const resultUuid = toText(result.Uuid)
    if (resultUuid) {
      const createdRelease = props.state.appReleases.find(release => release.uuid === resultUuid)
      if (createdRelease) {
        selectRelease(createdRelease)
      }
    }
  } catch (error) {
    handleApiError(error, {
      title: releaseDialogMode.value === "edit" ? "版本编辑失败" : "版本创建失败",
      fallback: releaseDialogMode.value === "edit"
        ? "应用更新编辑失败，请稍后重试。"
        : "应用更新创建失败，请稍后重试。",
    })
  } finally {
    releaseSubmitting.value = false
  }
}

async function confirmDeleteRelease() {
  if (!canDeleteAppVersion.value) {
    toast.error("无权删除应用版本")
    return
  }

  const uuid = selectedRelease.value?.uuid

  if (!uuid) {
    toast.error("版本信息不完整，无法删除")
    return
  }

  deleting.value = true

  try {
    await deleteAppVersion({ Uuid: uuid })
    deleteDialogOpen.value = false
    toast.success("版本已删除")
    await loadReleases()
  } catch (error) {
    handleApiError(error, {
      title: "版本删除失败",
      fallback: "应用更新删除失败，请稍后重试。",
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="relative flex flex-col overflow-visible bg-background">
    <SettingsPageHeader
      title="应用更新"
      description="维护移动平台用户端 app 的版本号、更新日志和分发地址。"
    >
      <SettingsToolbarRow>
        <template #leading>
          <div class="w-fit shrink-0">
            <TopTabSwitch
              :tabs="platformTabs"
              :model-value="activePlatform"
              :collapse-inactive="false"
              tone="default"
              aria-label="切换应用系统"
              @update:model-value="selectPlatform($event === 'ios' ? 'ios' : 'android')"
            />
          </div>
        </template>

        <SettingsToolbarSearchInput
          v-model="versionQuery"
          :expanded="searchExpanded"
          placeholder="搜索版本号"
          @toggle="toggleSearch"
        />

        <SettingsToolbarRefreshSlot :yield-space="searchExpanded">
          <Button variant="ghost" size="sm" class="h-8 rounded-md px-3" :disabled="loading" @click="refreshData">
            <i class="ri-refresh-line text-sm" />
            <span>{{ loading ? "刷新中..." : "刷新列表" }}</span>
          </Button>
        </SettingsToolbarRefreshSlot>

        <Button
          v-if="canCreateAppVersion"
          size="sm"
          class="h-8 rounded-md px-3"
          @click="openCreateDialog"
        >
          <i class="ri-add-line text-base" />
          <span>新建版本</span>
        </Button>
      </SettingsToolbarRow>
    </SettingsPageHeader>

    <div class="px-3 pb-8 sm:px-4">
      <Alert v-if="errorMessage" variant="destructive" class="mx-auto mb-4 max-w-4xl">
        <i class="ri-error-warning-line" />
        <AlertTitle>应用更新接口加载失败</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          <span>{{ errorMessage }}</span>
          <Button size="sm" variant="outline" :disabled="loading" @click="refreshData">
            <i class="ri-refresh-line text-sm" />
            重试
          </Button>
        </AlertDescription>
      </Alert>

      <div class="mx-auto flex w-full max-w-4xl gap-8 overflow-visible">
        <aside class="w-[240px] shrink-0 pt-4">
          <div class="sticky top-[11rem] flex max-h-[calc(100svh-12rem)] flex-col overflow-hidden">
            <div class="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              <button
                v-for="release in filteredReleases"
                :key="release.id"
                type="button"
                class="group flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-left transition-[background-color,transform] duration-180 ease-out active:scale-[0.96]"
                :class="release.id === selectedRelease?.id ? 'bg-accent' : 'hover:bg-accent/50'"
                @click="selectRelease(release)"
              >
                <span class="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:text-foreground">
                  <i :class="[release.platform === 'ios' ? 'ri-apple-line' : 'ri-android-line', 'text-[15px]']" />
                </span>

                <span class="min-w-0 flex-1 py-1">
                  <span class="block truncate font-mono text-sm font-medium text-foreground">
                    {{ release.versionName }}
                  </span>
                  <span class="mt-1 block truncate text-xs text-muted-foreground">
                    {{ formatPlatform(release.platform) }}
                  </span>
                </span>
              </button>

              <div v-if="loading" class="px-2 py-3 text-sm text-muted-foreground">
                正在加载版本列表...
              </div>

              <div v-else-if="filteredReleases.length === 0" class="px-2 py-3 text-sm text-muted-foreground">
                暂无{{ formatPlatform(activePlatform) }}版本
              </div>
            </div>
          </div>
        </aside>

        <main class="min-w-0 flex-1 overflow-visible pt-4">
          <template v-if="selectedRelease">
            <section class="space-y-5">
              <div class="flex min-w-0 items-start justify-between gap-4 border-b pb-4">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-muted-foreground">
                    {{ formatPlatform(selectedRelease.platform) }}
                  </p>

                  <h2 class="text-xl font-semibold tracking-normal text-foreground">
                    {{ selectedRelease.versionName }}
                  </h2>

                  <p v-if="selectedRelease.versionCode !== null && selectedRelease.versionCode !== undefined" class="mt-1 font-mono text-xs text-muted-foreground">
                    VersionCode {{ selectedRelease.versionCode }}
                  </p>
                </div>

                <div class="flex shrink-0 items-center gap-2">
                  <Badge
                    v-if="detailLoading"
                    variant="outline"
                  >
                    加载详情
                  </Badge>

                  <Button v-if="canEditAppVersion" variant="outline" size="sm" class="h-8 rounded-md px-3" @click="openEditDialog">
                    <i class="ri-edit-line text-sm" />
                    编辑
                  </Button>

                  <Button v-if="canDeleteAppVersion" variant="destructive" size="sm" class="h-8 rounded-md px-3" @click="openDeleteDialog">
                    <i class="ri-delete-bin-line text-sm" />
                    删除
                  </Button>
                </div>
              </div>

              <dl class="border-b py-1">
                <div class="flex min-w-0 items-center justify-between gap-4 border-b py-3">
                  <dt class="shrink-0 text-sm text-muted-foreground">
                    更新时间
                  </dt>
                  <dd class="min-w-0 truncate font-mono text-sm font-medium text-foreground">
                    {{ selectedRelease.updatedAt }}
                  </dd>
                </div>

                <div class="flex min-w-0 items-center justify-between gap-4 border-b py-3">
                  <dt class="shrink-0 text-sm text-muted-foreground">
                    版本码
                  </dt>
                  <dd class="min-w-0 truncate font-mono text-sm font-medium text-foreground">
                    {{ selectedRelease.versionCode ?? "-" }}
                  </dd>
                </div>

                <div class="flex min-w-0 items-center justify-between gap-4 border-b py-3">
                  <dt class="shrink-0 text-sm text-muted-foreground">
                    是否强制更新
                  </dt>
                  <dd class="min-w-0 truncate text-sm font-medium text-foreground">
                    {{ selectedRelease.forceUpdate ? "是" : "否" }}
                  </dd>
                </div>

                <div class="flex min-w-0 items-center justify-between gap-4 py-3">
                  <dt class="shrink-0 text-sm text-muted-foreground">
                    {{ distributionLabel }}
                  </dt>
                  <dd class="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-8 rounded-md px-3"
                      :disabled="!distributionUrl"
                      @click="copyDistributionUrl"
                    >
                      <i class="ri-file-copy-line text-sm" />
                      复制
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-8 rounded-md px-3"
                      :disabled="!distributionUrl"
                      @click="openDistributionUrl"
                    >
                      <i class="ri-external-link-line text-sm" />
                      打开
                    </Button>
                  </dd>
                </div>
              </dl>

              <section class="min-w-0">
                <h3 class="mb-2 text-sm font-semibold text-foreground">
                  更新日志
                </h3>
                <div class="min-h-40 whitespace-pre-wrap rounded-md bg-muted/35 px-3 py-3 text-sm leading-6 text-foreground">
                  {{ selectedRelease.description }}
                </div>
              </section>
            </section>
          </template>

          <div v-else class="py-16 text-center text-sm text-muted-foreground">
            {{ loading ? "正在加载应用更新..." : "暂无应用更新数据" }}
          </div>
        </main>
      </div>
    </div>

    <Dialog :open="updateDialogOpen" @update:open="updateDialogOpen = $event">
      <DialogContent stack-above-sticky-header class="max-h-[min(88vh,760px)] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{{ releaseDialogMode === "edit" ? "编辑版本" : "新建版本" }}</DialogTitle>
          <DialogDescription>
            填写版本号、版本码、强制更新、更新日志和下载地址。
          </DialogDescription>
        </DialogHeader>

        <form class="space-y-4" @submit.prevent="submitRelease">
          <div class="grid gap-4 sm:grid-cols-2">
            <Field class="gap-2">
              <FieldLabel for="release-platform">平台</FieldLabel>
              <Select
                :model-value="releaseForm.platform"
                @update:model-value="updateReleasePlatform($event === 'ios' ? 'ios' : 'android')"
              >
                <SelectTrigger id="release-platform" class="h-9 w-full min-w-0 rounded-md bg-background text-sm">
                  <SelectValue placeholder="选择平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="android">
                    Android
                  </SelectItem>
                  <SelectItem value="ios">
                    iOS
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field class="gap-2">
              <FieldLabel for="release-version-name">版本号</FieldLabel>
              <Input
                id="release-version-name"
                :model-value="releaseForm.versionName"
                placeholder="1.0.2"
                @update:model-value="updateReleaseForm('versionName', String($event))"
              />
            </Field>

            <Field class="gap-2">
              <FieldLabel for="release-version-code">版本码</FieldLabel>
              <Input
                id="release-version-code"
                v-model="releaseVersionCode"
                inputmode="numeric"
                placeholder="100"
              />
            </Field>

            <Field class="gap-2">
              <FieldLabel for="release-force-update">是否强制更新</FieldLabel>
              <Select
                :model-value="releaseForm.forceUpdate ? '1' : '2'"
                @update:model-value="updateReleaseForm('forceUpdate', String($event) === '1')"
              >
                <SelectTrigger id="release-force-update" class="h-9 w-full min-w-0 rounded-md bg-background text-sm">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    是
                  </SelectItem>
                  <SelectItem value="2">
                    否
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field class="gap-2">
            <FieldLabel for="release-description">更新日志</FieldLabel>
            <Textarea
              id="release-description"
              :model-value="releaseForm.description"
              class="min-h-32"
              placeholder="1. 修复问题&#10;2. 优化体验"
              @update:model-value="updateReleaseForm('description', String($event))"
            />
          </Field>

          <Field v-if="isAndroidReleaseForm && canUploadAppVersionApk" class="gap-2">
            <FieldLabel>APK 安装包</FieldLabel>
            <FileUploadField
              accept=".apk,application/vnd.android.package-archive"
              :loading="uploadingApkFile"
              title="上传 APK 安装包"
              description="Android 版本必须上传 APK，上传完成后会自动写入安装包地址。"
              :selected-label="releaseApkFileName || releaseForm.downloadUrl || '暂未上传 APK'"
              button-label="上传 APK"
              loading-label="上传中..."
              icon="ri-upload-cloud-2-line"
              compact
              @files-selected="files => { void handleApkFiles(files) }"
            />
          </Field>

          <Field v-else class="gap-2">
            <FieldLabel for="release-app-store-url">地址</FieldLabel>
            <Input
              id="release-app-store-url"
              :model-value="releaseForm.appStoreUrl"
              placeholder="https://apps.apple.com/app/idxxxx"
              @update:model-value="updateReleaseForm('appStoreUrl', String($event))"
            />
          </Field>
        </form>

        <DialogFooter>
          <Button variant="outline" :disabled="releaseSubmitting" @click="updateDialogOpen = false">
            取消
          </Button>
          <Button :disabled="uploadingApkFile || releaseSubmitting" @click="submitRelease">
            <i class="ri-save-line text-sm" />
            <span>{{ releaseSubmitting ? "保存中..." : "保存版本" }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除应用版本</AlertDialogTitle>
          <AlertDialogDescription>
            确认删除版本「{{ selectedRelease?.versionName ?? "-" }}」？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleting">
            取消
          </AlertDialogCancel>
          <AlertDialogAction :disabled="deleting" @click="confirmDeleteRelease">
            {{ deleting ? "删除中..." : "确认删除" }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
