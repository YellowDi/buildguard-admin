<script setup lang="ts">
import { computed, ref } from "vue"
import { useClipboard } from "@vueuse/core"
import { toast } from "vue-sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  TooltipWrap,
} from "@/components/ui/tooltip"
import SettingsPageHeader from "@/components/settings/SettingsPageHeader.vue"
import SettingsSection from "@/components/settings/SettingsSection.vue"
import { SETTINGS_TABLE_PAGE_CLASS } from "@/components/settings/settingsTablePageClass"
import TablePageTable from "@/components/table-page/TablePageTable.vue"
import type { TableColumn } from "@/components/table-page/types"
import type {
  SettingsActionKey,
} from "@/components/settings/types"

interface Device {
  id: string
  name: string
  isCurrent: boolean
  lastActive: string
  location: string
}

const props = defineProps<{
  // User info
  userName: string
  userEmail: string
  avatarSrc?: string
  avatarFallback: string
  preferredName: string
  userId: string
  // Security
  supportAccessEnabled: boolean
}>()

const emit = defineEmits<{
  action: [actionKey: SettingsActionKey]
  "update:preferredName": [value: string]
  "update:supportAccessEnabled": [value: boolean]
}>()

// Local state for input
const localPreferredName = ref(props.preferredName)

// Clipboard for user ID
const { copy } = useClipboard()

function handleCopyUserId() {
  copy(props.userId)
  toast.success("已复制到剪贴板")
}

// Mock devices data (will be replaced by API later)
const devices = ref<Device[]>([
  {
    id: "1",
    name: "macOS",
    isCurrent: true,
    lastActive: "现在",
    location: "Singapore",
  },
  {
    id: "2",
    name: "macOS",
    isCurrent: false,
    lastActive: "2024年4月22日 14:31",
    location: "Singapore",
  },
  {
    id: "3",
    name: "macOS",
    isCurrent: false,
    lastActive: "2026年2月27日 21:37",
    location: "MY-08, Malaysia",
  },
])

const deviceRows = computed(() =>
  devices.value.map(device => ({
    ...device,
    isCurrentLabel: device.isCurrent ? "此设备" : "",
  })),
)

const deviceColumns: TableColumn[] = [
  {
    key: "name",
    label: "设备名称",
    filterType: "text",
    cellRenderer: {
      kind: "dual-inline",
      primaryKey: "name",
      secondaryKey: "isCurrentLabel",
      primaryClass: "font-medium text-foreground",
      secondaryClass: "text-primary",
    },
  },
  {
    key: "lastActive",
    label: "上次活动",
    filterType: "text",
    tone: "muted",
  },
  {
    key: "location",
    label: "位置",
    filterType: "text",
    tone: "muted",
  },
  {
    key: "actions",
    label: "",
    filterType: "none",
    slot: "cell-actions",
    cellClass: "text-right",
  },
]

function asDeviceRow(row: unknown) {
  return row as Device & { isCurrentLabel: string }
}

function handleSavePreferredName() {
  emit("update:preferredName", localPreferredName.value)
  toast.success("偏好名称已更新")
}

function handleDeviceLogout(deviceId: string) {
  devices.value = devices.value.filter(d => d.id !== deviceId)
  toast.success("设备已登出")
}

function handleLogoutAllDevices() {
  emit("action", "logout-all-devices")
}

function handleDeleteAccount() {
  emit("action", "delete-account")
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="shrink-0 px-3 pt-4 pb-3 sm:px-4">
      <SettingsPageHeader
        title="我"
        description="管理你的档案、登录信息和设备"
      />
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-4">
      <div class="space-y-6">
        <!-- 账号 -->
        <SettingsSection
          title="账号"
          description=""
          :show-header="true"
        >
          <div class="flex items-start gap-6 py-4">
            <!-- Avatar -->
            <div class="flex flex-col items-center">
              <Avatar class="size-16 rounded-sm">
                <AvatarImage
                  v-if="avatarSrc"
                  :src="avatarSrc"
                  :alt="userName"
                  class="object-cover"
                />
                <AvatarFallback class="rounded-sm bg-avatar-placeholder text-xl font-semibold">
                  {{ avatarFallback }}
                </AvatarFallback>
              </Avatar>
            </div>

            <!-- Preferred Name -->
            <div class="flex-1 space-y-2">
              <label class="text-sm font-medium text-foreground">
                偏好名称
              </label>
              <div class="flex gap-2">
                <Input
                  v-model="localPreferredName"
                  placeholder="输入偏好名称"
                  class="h-9 max-w-[280px]"
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        <!-- 账号安全 -->
        <SettingsSection
          title="账号安全"
          description=""
          :show-header="true"
        >
          <div class="space-y-0">
            <!-- 邮件地址 -->
            <div class="flex min-w-0 flex-row items-center gap-4 sm:gap-6 lg:gap-8">
              <div class="min-w-0 flex-1 gap-1.5">
                <div class="text-sm font-medium text-foreground">
                  邮件地址
                </div>
                <div class="text-sm leading-5 text-muted-foreground">
                  {{ userEmail }}
                </div>
              </div>
              <div class="flex w-[196px] shrink-0 items-center justify-end xl:w-[220px]">
                <Button
                  variant="outline"
                  class="h-9 shrink-0 rounded-md px-3.5"
                  @click="emit('action', 'manage-email')"
                >
                  管理电子邮件地址
                </Button>
              </div>
            </div>

            <div class="h-6" />

            <!-- 密码 -->
            <div class="flex min-w-0 flex-row items-center gap-4 sm:gap-6 lg:gap-8">
              <div class="min-w-0 flex-1 gap-1.5">
                <div class="text-sm font-medium text-foreground">
                  密码
                </div>
                <div class="text-sm leading-5 text-muted-foreground">
                  更改用于登录的密码
                </div>
              </div>
              <div class="flex w-[196px] shrink-0 items-center justify-end xl:w-[220px]">
                <Button
                  variant="outline"
                  class="h-9 shrink-0 rounded-md px-3.5"
                  @click="emit('action', 'change-password')"
                >
                  更改密码
                </Button>
              </div>
            </div>

            <div class="h-6" />

            <!-- 两步验证 -->
            <div class="flex min-w-0 flex-row items-center gap-4 sm:gap-6 lg:gap-8">
              <div class="min-w-0 flex-1 gap-1.5">
                <div class="text-sm font-medium text-foreground">
                  两步验证
                </div>
                <div class="text-sm leading-5 text-muted-foreground">
                  为你的账号多加一层安全保障
                </div>
              </div>
              <div class="flex w-[196px] shrink-0 items-center justify-end xl:w-[220px]">
                <Button
                  variant="outline"
                  class="h-9 shrink-0 rounded-md px-3.5"
                  @click="emit('action', 'add-2fa')"
                >
                  添加验证方法
                </Button>
              </div>
            </div>

            <div class="h-6" />

            <!-- 密钥 -->
            <div class="flex min-w-0 flex-row items-center gap-4 sm:gap-6 lg:gap-8">
              <div class="min-w-0 flex-1 gap-1.5">
                <div class="text-sm font-medium text-foreground">
                  密钥
                </div>
                <div class="text-sm leading-5 text-muted-foreground">
                  使用设备上的生物识别验证信息登录
                </div>
              </div>
              <div class="flex w-[196px] shrink-0 items-center justify-end xl:w-[220px]">
                <Button
                  variant="outline"
                  class="h-9 shrink-0 rounded-md px-3.5"
                  @click="emit('action', 'add-passkey')"
                >
                  添加密钥
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

        <!-- 支持 -->
        <SettingsSection
          title="支持"
          description=""
          :show-header="true"
        >
          <div class="space-y-0">
            <!-- 支持访问权限 -->
            <div class="flex min-w-0 flex-row items-center gap-4 sm:gap-6 lg:gap-8">
              <div class="min-w-0 flex-1 gap-1.5">
                <div class="text-sm font-medium text-foreground">
                  支持访问权限
                </div>
                <div class="text-sm leading-5 text-muted-foreground">
                  授予支持团队对你账号的临时访问权限，以便代表你解决问题或恢复内容。你可以随时撤销访问权限。
                </div>
              </div>
              <div class="flex shrink-0 items-center justify-end">
                <Switch
                  :checked="supportAccessEnabled"
                  @update:checked="emit('update:supportAccessEnabled', $event)"
                />
              </div>
            </div>

            <div class="h-6" />

            <!-- 删除我的账号 -->
            <div class="flex min-w-0 flex-row items-center gap-4 sm:gap-6 lg:gap-8">
              <div class="min-w-0 flex-1 gap-1.5">
                <div class="text-sm font-medium text-foreground">
                  删除我的账号
                </div>
                <div class="text-sm leading-5 text-muted-foreground">
                  永久删除你的账号。你将无法再访问你的页面和你所属的任何工作空间。
                </div>
              </div>
              <div class="flex shrink-0 items-center justify-end">
                <Button
                  variant="outline"
                  class="h-9 shrink-0 rounded-md border-destructive/30 bg-background px-3.5 font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
                  @click="handleDeleteAccount"
                >
                  删除我的账号
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

        <!-- 设备 -->
        <SettingsSection
          title="设备"
          description=""
          :show-header="true"
        >
          <div class="space-y-0">
            <!-- 从所有设备登出 -->
            <div class="flex min-w-0 flex-row items-center gap-4 sm:gap-6 lg:gap-8">
              <div class="min-w-0 flex-1 gap-1.5">
                <div class="text-sm font-medium text-foreground">
                  从所有设备登出
                </div>
                <div class="text-sm leading-5 text-muted-foreground">
                  登出其他设备上的所有活动会话（当前设备除外）
                </div>
              </div>
              <div class="flex shrink-0 items-center justify-end">
                <Button
                  variant="outline"
                  class="h-9 shrink-0 rounded-md border-destructive/30 bg-background px-3.5 font-medium text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
                  @click="handleLogoutAllDevices"
                >
                  从所有设备登出
                </Button>
              </div>
            </div>

            <div class="h-6" />

            <!-- 设备表格 -->
            <TablePageTable
              show-index
              sticky-header
              :end-spacer="false"
              :show-index-checkbox="false"
              :edge-gutter="false"
              :show-row-action-icons="true"
              :columns="deviceColumns"
              :rows="deviceRows"
              row-key="id"
              :table-class="SETTINGS_TABLE_PAGE_CLASS"
            >
              <template #cell-name="{ row: rawRow }">
                <div class="flex items-center gap-2">
                  <i class="ri-computer-line text-lg text-muted-foreground" />
                  <div>
                    <div class="text-sm font-medium text-foreground">
                      {{ asDeviceRow(rawRow).name }}
                    </div>
                    <div
                      v-if="asDeviceRow(rawRow).isCurrent"
                      class="text-xs text-primary"
                    >
                      此设备
                    </div>
                  </div>
                </div>
              </template>

              <template #cell-actions="{ row: rawRow }">
                <Button
                  v-if="!asDeviceRow(rawRow).isCurrent"
                  variant="outline"
                  size="sm"
                  class="h-8 gap-1 rounded-md px-2.5 text-[13px]"
                  @click="handleDeviceLogout(asDeviceRow(rawRow).id)"
                >
                  登出
                </Button>
              </template>
            </TablePageTable>

            <!-- 加载更多 -->
            <div class="py-2">
              <Button
                variant="ghost"
                size="sm"
                class="h-8 gap-1 text-muted-foreground"
              >
                <i class="ri-arrow-down-s-line" />
                加载 2 个其他设备
              </Button>
            </div>
          </div>
        </SettingsSection>

        <!-- 用户 ID -->
        <SettingsSection
          title="用户 ID"
          description=""
          :show-header="true"
        >
          <div class="flex min-w-0 flex-row items-center gap-4 py-4 sm:gap-6 lg:gap-8">
            <div class="min-w-0 flex-1 gap-1.5">
              <div class="text-sm font-medium text-foreground">
                用户 ID
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <code class="rounded bg-muted px-2 py-1 text-sm text-muted-foreground">
                {{ userId }}
              </code>
              <TooltipWrap content="复制用户 ID">
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8"
                  @click="handleCopyUserId"
                >
                  <i class="ri-file-copy-line" />
                </Button>
              </TooltipWrap>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  </div>
</template>
