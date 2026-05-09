<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { toast } from "vue-sonner"

import SettingsPageHeader from "@/components/settings/SettingsPageHeader.vue"
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
const updateDialogOpen = ref(false)

const releaseForm = reactive<AppReleaseDraft>({
  hasUpdate: true,
  versionName: "",
  versionCode: 0,
  title: "",
  description: "",
  forceUpdate: false,
  downloadUrl: "",
  appStoreUrl: "",
  packageType: "apk",
  platform: "android",
})

const releases = computed(() => props.state.appReleases)
const selectedRelease = computed(() => {
  return releases.value.find(release => release.id === selectedReleaseId.value)
    ?? releases.value[0]
    ?? null
})

const currentPayload = computed(() => JSON.stringify(props.state.appRelease, null, 2))
const distributionHint = computed(() => {
  if (!selectedRelease.value) {
    return "-"
  }

  return selectedRelease.value.platform === "android"
    ? selectedRelease.value.downloadUrl || "-"
    : selectedRelease.value.appStoreUrl || selectedRelease.value.downloadUrl || "-"
})

function formatPlatform(platform: AppReleaseDraft["platform"]) {
  return platform === "ios" ? "iOS" : "Android"
}

function getReleaseId(release: AppReleaseDraft) {
  return `${release.platform}-${release.versionName.trim()}-${release.versionCode || 0}`
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

function updateReleaseForm<K extends keyof AppReleaseDraft>(field: K, value: AppReleaseDraft[K]) {
  releaseForm[field] = value
}

function resetReleaseForm() {
  const current = selectedRelease.value ?? props.state.appRelease

  Object.assign(releaseForm, {
    hasUpdate: true,
    versionName: current.versionName,
    versionCode: current.versionCode,
    title: current.title,
    description: current.description,
    forceUpdate: current.forceUpdate,
    downloadUrl: current.downloadUrl,
    appStoreUrl: current.appStoreUrl,
    packageType: current.packageType,
    platform: current.platform,
  })
}

function openUpdateDialog() {
  resetReleaseForm()
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
    versionCode: Number(releaseForm.versionCode) || 0,
    updatedAt: getNowText(),
  }
  const existingIndex = props.state.appReleases.findIndex(release => release.id === nextRelease.id)

  if (existingIndex >= 0) {
    props.state.appReleases.splice(existingIndex, 1, nextRelease)
  } else {
    props.state.appReleases.unshift(nextRelease)
  }

  selectedReleaseId.value = nextRelease.id
  syncCurrentRelease(nextRelease)
  updateDialogOpen.value = false

  toast.success(existingIndex >= 0 ? "版本信息已更新" : "新版本已添加")
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <SettingsPageHeader
      title="应用更新"
      description="维护移动平台用户端 app 的版本号、更新日志和分发地址。"
    />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-4">
      <section class="mx-auto w-full max-w-4xl">
        <div class="mb-3 flex items-center justify-between gap-4 border-b pb-3">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-foreground">
              版本管理
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
              共 {{ releases.length }} 个版本，选择左侧版本号查看详情。
            </p>
          </div>

          <Button
            size="sm"
            class="h-8 shrink-0 px-3"
            @click="openUpdateDialog"
          >
            <i class="ri-add-line text-base" />
            <span>更新版本</span>
          </Button>
        </div>

        <div class="grid grid-cols-[240px_minmax(0,1fr)]">
          <aside class="border-r pr-4">
            <div class="mb-2 px-3 text-xs font-medium text-muted-foreground">
              版本号条目
            </div>

            <div class="divide-y">
              <button
                v-for="release in releases"
                :key="release.id"
                type="button"
                class="flex min-h-14 w-full min-w-0 items-center justify-between gap-3 border-l-2 px-3 py-2 text-left transition-[background-color,border-color,transform] duration-180 ease-out active:scale-[0.96]"
                :class="release.id === selectedRelease?.id ? 'border-primary bg-muted/55' : 'border-transparent hover:bg-muted/40'"
                @click="selectRelease(release)"
              >
                <span class="min-w-0">
                  <span class="block truncate font-mono text-sm font-semibold text-foreground">
                    {{ release.versionName }}
                  </span>
                  <span class="mt-1 block truncate text-xs text-muted-foreground">
                    {{ formatPlatform(release.platform) }} · build {{ release.versionCode || "-" }}
                  </span>
                </span>

                <Badge
                  variant="secondary"
                  class="shrink-0"
                >
                  {{ release.forceUpdate ? "强更" : "普通" }}
                </Badge>
              </button>
            </div>
          </aside>

          <main class="min-w-0 pl-5">
            <template v-if="selectedRelease">
              <div class="border-b pb-4">
                <div class="min-w-0">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    <Badge>{{ formatPlatform(selectedRelease.platform) }}</Badge>
                    <Badge
                      v-if="selectedRelease.hasUpdate"
                      variant="outline"
                    >
                      有更新
                    </Badge>
                    <Badge
                      v-if="selectedRelease.forceUpdate"
                      variant="destructive"
                    >
                      强制更新
                    </Badge>
                  </div>

                  <h2 class="text-xl font-semibold tracking-normal text-foreground">
                    {{ selectedRelease.versionName }}
                  </h2>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {{ selectedRelease.title }}
                  </p>
                </div>
              </div>

              <dl class="grid border-b py-1 sm:grid-cols-2 sm:gap-x-8">
                <div class="flex min-w-0 items-center justify-between gap-4 border-b py-3 sm:border-b-0">
                  <dt class="shrink-0 text-sm text-muted-foreground">
                    版本号
                  </dt>
                  <dd class="min-w-0 truncate font-mono text-sm font-medium text-foreground">
                    {{ selectedRelease.versionCode || "-" }}
                  </dd>
                </div>

                <div class="flex min-w-0 items-center justify-between gap-4 border-b py-3 sm:border-b-0">
                  <dt class="shrink-0 text-sm text-muted-foreground">
                    分发包类型
                  </dt>
                  <dd class="min-w-0 truncate font-mono text-sm font-medium text-foreground">
                    {{ selectedRelease.packageType }}
                  </dd>
                </div>

                <div class="flex min-w-0 items-center justify-between gap-4 border-b py-3 sm:border-b-0">
                  <dt class="shrink-0 text-sm text-muted-foreground">
                    更新时间
                  </dt>
                  <dd class="min-w-0 truncate font-mono text-sm font-medium text-foreground">
                    {{ selectedRelease.updatedAt }}
                  </dd>
                </div>

                <div class="flex min-w-0 items-center justify-between gap-4 py-3">
                  <dt class="shrink-0 text-sm text-muted-foreground">
                    分发地址
                  </dt>
                  <dd class="min-w-0 truncate text-sm font-medium text-foreground">
                    {{ distributionHint }}
                  </dd>
                </div>
              </dl>

              <div class="grid gap-6 py-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <section class="min-w-0">
                  <h3 class="mb-2 text-sm font-semibold text-foreground">
                    更新日志
                  </h3>
                  <div class="min-h-36 whitespace-pre-wrap border-y py-3 text-sm leading-6 text-foreground">
                    {{ selectedRelease.description }}
                  </div>
                </section>

                <section class="min-w-0">
                  <h3 class="mb-2 text-sm font-semibold text-foreground">
                    接口预览
                  </h3>
                  <pre class="max-h-56 overflow-auto whitespace-pre-wrap break-all border-y bg-muted/20 py-3 text-xs leading-6 text-muted-foreground">{{ currentPayload }}</pre>
                </section>
              </div>
            </template>
          </main>
        </div>
      </section>
    </div>

    <Dialog :open="updateDialogOpen" @update:open="updateDialogOpen = $event">
      <DialogContent stack-above-sticky-header class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>更新版本</DialogTitle>
          <DialogDescription>
            填写版本号、更新标题和更新日志，提交后生成新的版本条目。
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent="submitRelease">
          <div class="grid gap-4 sm:grid-cols-2">
            <Field class="gap-2">
              <FieldLabel for="release-platform">平台</FieldLabel>
              <Select
                :model-value="releaseForm.platform"
                @update:model-value="updateReleaseForm('platform', $event === 'ios' ? 'ios' : 'android')"
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
              <FieldLabel for="release-version-code">构建号</FieldLabel>
              <Input
                id="release-version-code"
                :model-value="String(releaseForm.versionCode || '')"
                inputmode="numeric"
                placeholder="103"
                @update:model-value="updateReleaseForm('versionCode', Number($event) || 0)"
              />
            </Field>

            <Field class="gap-2">
              <FieldLabel for="release-package-type">分发包类型</FieldLabel>
              <Select
                :model-value="releaseForm.packageType"
                @update:model-value="updateReleaseForm('packageType', $event === 'app-store' ? 'app-store' : 'apk')"
              >
                <SelectTrigger id="release-package-type" class="h-9 w-full min-w-0 rounded-md bg-background text-sm">
                  <SelectValue placeholder="选择包类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apk">
                    apk
                  </SelectItem>
                  <SelectItem value="app-store">
                    app-store
                  </SelectItem>
                </SelectContent>
              </Select>
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

          <div class="grid gap-4 sm:grid-cols-2">
            <Field class="gap-2">
              <FieldLabel for="release-download-url">下载地址</FieldLabel>
              <Input
                id="release-download-url"
                :model-value="releaseForm.downloadUrl"
                placeholder="https://example.com/app.apk"
                @update:model-value="updateReleaseForm('downloadUrl', String($event))"
              />
            </Field>

            <Field class="gap-2">
              <FieldLabel for="release-app-store-url">App Store 地址</FieldLabel>
              <Input
                id="release-app-store-url"
                :model-value="releaseForm.appStoreUrl"
                placeholder="https://apps.apple.com/app/idxxxx"
                @update:model-value="updateReleaseForm('appStoreUrl', String($event))"
              />
            </Field>
          </div>

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
            保存版本
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
