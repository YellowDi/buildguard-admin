<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { toast } from "vue-sonner"

import TopTabSwitch from "@/components/layout/TopTabSwitch.vue"
import SettingsPageHeader from "@/components/settings/SettingsPageHeader.vue"
import SettingsToolbarRow from "@/components/settings/SettingsToolbarRow.vue"
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
  FieldDescription,
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type {
  AppReleaseDraft,
  AppReleaseEntry,
  SettingsState,
} from "@/components/settings/types"

const props = defineProps<{
  state: SettingsState
}>()

const selectedReleaseId = ref(props.state.appReleases[0]?.id ?? "")
const activePlatform = ref<AppReleaseDraft["platform"]>(props.state.appReleases[0]?.platform ?? "android")
const updateDialogOpen = ref(false)

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
  return selectedRelease.value?.platform === "ios" ? "App Store 地址" : "下载地址"
})
const distributionHint = computed(() => {
  if (!selectedRelease.value) {
    return "-"
  }

  return selectedRelease.value.platform === "android"
    ? selectedRelease.value.downloadUrl || "-"
    : selectedRelease.value.appStoreUrl || "-"
})
const isAndroidReleaseForm = computed(() => releaseForm.platform === "android")

function formatPlatform(platform: AppReleaseDraft["platform"]) {
  return platform === "ios" ? "iOS" : "Android"
}

function getReleaseId(release: AppReleaseDraft) {
  return `${release.platform}-${release.versionName.trim()}`
}

function getNowText() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function syncCurrentRelease(release: AppReleaseEntry) {
  const { id: _id, updatedAt: _updatedAt, ...payload } = release
  Object.assign(props.state.appRelease, payload)
}

function selectRelease(release: AppReleaseEntry) {
  selectedReleaseId.value = release.id
  syncCurrentRelease(release)
}

function selectPlatform(platform: AppReleaseDraft["platform"]) {
  activePlatform.value = platform
  const firstRelease = releases.value.find(release => release.platform === platform)

  if (firstRelease) {
    selectRelease(firstRelease)
  }
}

function updateReleaseForm<K extends keyof AppReleaseDraft>(field: K, value: AppReleaseDraft[K]) {
  releaseForm[field] = value
}

function updateReleasePlatform(platform: AppReleaseDraft["platform"]) {
  releaseForm.platform = platform

  if (platform === "ios") {
    releaseForm.downloadUrl = ""
  } else {
    releaseForm.appStoreUrl = ""
  }
}

function resetReleaseForm(platform = activePlatform.value) {
  const current = selectedRelease.value?.platform === platform
    ? selectedRelease.value
    : releases.value.find(release => release.platform === platform)

  Object.assign(releaseForm, {
    hasUpdate: true,
    versionName: current?.versionName ?? "",
    title: current?.title ?? "",
    description: current?.description ?? "",
    forceUpdate: current?.forceUpdate ?? false,
    downloadUrl: platform === "android" ? current?.downloadUrl ?? "" : "",
    appStoreUrl: platform === "ios" ? current?.appStoreUrl ?? "" : "",
    platform,
  })
}

function openUpdateDialog() {
  resetReleaseForm(activePlatform.value)
  updateDialogOpen.value = true
}

function submitRelease() {
  const versionName = releaseForm.versionName.trim()
  const title = releaseForm.title.trim()
  const description = releaseForm.description.trim()

  if (!versionName || !title || !description) {
    toast.error("请填写版本号、更新标题和更新日志")
    return
  }

  const nextRelease: AppReleaseEntry = {
    ...releaseForm,
    id: getReleaseId({ ...releaseForm, versionName }),
    versionName,
    title,
    description,
    downloadUrl: releaseForm.platform === "android" ? releaseForm.downloadUrl.trim() : "",
    appStoreUrl: releaseForm.platform === "ios" ? releaseForm.appStoreUrl.trim() : "",
    updatedAt: getNowText(),
  }
  const existingIndex = props.state.appReleases.findIndex(release => release.id === nextRelease.id)

  if (existingIndex >= 0) {
    props.state.appReleases.splice(existingIndex, 1, nextRelease)
  } else {
    props.state.appReleases.unshift(nextRelease)
  }

  activePlatform.value = nextRelease.platform
  selectedReleaseId.value = nextRelease.id
  syncCurrentRelease(nextRelease)
  updateDialogOpen.value = false

  toast.success(existingIndex >= 0 ? "版本信息已更新" : "新版本已添加")
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

        <Button
          size="sm"
          class="h-8 rounded-md px-3"
          @click="openUpdateDialog"
        >
          <i class="ri-add-line text-base" />
          <span>更新版本</span>
        </Button>
      </SettingsToolbarRow>
    </SettingsPageHeader>

    <div class="px-3 pb-8 sm:px-4">
      <div class="mx-auto flex w-full max-w-4xl gap-8 overflow-visible">
        <aside class="w-[240px] shrink-0 pt-4">
          <div class="sticky top-[11rem] flex max-h-[calc(100svh-12rem)] flex-col overflow-hidden">
            <div class="mb-2 px-1">
              <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                版本号条目
              </p>
            </div>

            <div class="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              <button
                v-for="release in filteredReleases"
                :key="release.id"
                type="button"
                class="group flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-left transition-[background-color,transform] duration-180 ease-out active:scale-[0.96]"
                :class="release.id === selectedRelease?.id ? 'bg-accent' : 'hover:bg-accent/50'"
                @click="selectRelease(release)"
              >
                <span class="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground">
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
                </div>

                <Badge
                  v-if="selectedRelease.forceUpdate"
                  variant="destructive"
                  class="shrink-0"
                >
                  强制更新
                </Badge>
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

                <div class="flex min-w-0 items-center justify-between gap-4 py-3">
                  <dt class="shrink-0 text-sm text-muted-foreground">
                    {{ distributionLabel }}
                  </dt>
                  <dd class="min-w-0 truncate text-sm font-medium text-foreground">
                    {{ distributionHint }}
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
        </main>
      </div>
    </div>

    <Dialog :open="updateDialogOpen" @update:open="updateDialogOpen = $event">
      <DialogContent stack-above-sticky-header class="max-h-[min(88vh,760px)] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>更新版本</DialogTitle>
          <DialogDescription>
            填写版本号、更新标题和更新日志，提交后生成新的版本条目。
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
          </div>

          <Field class="gap-2">
            <FieldLabel for="release-title">更新标题</FieldLabel>
            <Input
              id="release-title"
              :model-value="releaseForm.title"
              placeholder="发现新版本"
              @update:model-value="updateReleaseForm('title', String($event))"
            />
          </Field>

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

          <Field v-if="isAndroidReleaseForm" class="gap-2">
            <FieldLabel for="release-download-url">下载地址</FieldLabel>
            <Input
              id="release-download-url"
              :model-value="releaseForm.downloadUrl"
              placeholder="https://example.com/app.apk"
              @update:model-value="updateReleaseForm('downloadUrl', String($event))"
            />
          </Field>

          <Field v-else class="gap-2">
            <FieldLabel for="release-app-store-url">App Store 地址</FieldLabel>
            <Input
              id="release-app-store-url"
              :model-value="releaseForm.appStoreUrl"
              placeholder="https://apps.apple.com/app/idxxxx"
              @update:model-value="updateReleaseForm('appStoreUrl', String($event))"
            />
          </Field>

          <div class="grid gap-4 sm:grid-cols-2">
            <Field class="gap-2">
              <FieldLabel>检测到新版本</FieldLabel>
              <FieldDescription>控制接口中的 hasUpdate。</FieldDescription>
              <div class="flex h-9 items-center">
                <Switch
                  :checked="releaseForm.hasUpdate"
                  @update:checked="updateReleaseForm('hasUpdate', Boolean($event))"
                />
              </div>
            </Field>

            <Field class="gap-2">
              <FieldLabel>强制更新</FieldLabel>
              <FieldDescription>控制接口中的 forceUpdate。</FieldDescription>
              <div class="flex h-9 items-center">
                <Switch
                  :checked="releaseForm.forceUpdate"
                  @update:checked="updateReleaseForm('forceUpdate', Boolean($event))"
                />
              </div>
            </Field>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" @click="updateDialogOpen = false">
            取消
          </Button>
          <Button @click="submitRelease">
            <i class="ri-save-line text-sm" />
            <span>保存版本</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
