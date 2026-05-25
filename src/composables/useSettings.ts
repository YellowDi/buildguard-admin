import { computed, reactive, ref, watch } from "vue"
import { toast } from "vue-sonner"

import { useAppTheme } from "@/composables/useAppTheme"
import { setCurrentUserAvatar, useCurrentUser } from "@/composables/useCurrentUser"
import { loadSettingsSnapshot } from "@/lib/settings-api"
import {
  type SettingsActionKey,
  type SettingsCategory,
  type SettingsCategoryKey,
  type SettingsState,
} from "@/components/settings/types"

const { sidebarColor, sidebarColorOptions, themeMode } = useAppTheme()
const { currentUser } = useCurrentUser()

const state = reactive<SettingsState>({
  accountName: currentUser.name,
  accountEmail: currentUser.email,
  enterKeyStartsNewLine: true,
  language: "zh-CN",
  numberFormat: "default",
  bidirectionalTextControl: false,
  weekStartsOnMonday: true,
  dateFormat: "relative",
  autoTimezoneByLocation: true,
  timezone: "asia-shanghai",
  themeMode: themeMode.value,
  sidebarColor: sidebarColor.value,
  compactTables: false,
  reducedMotion: true,
  showCommandHints: true,
  usageDiagnostics: false,
  cookiePreference: "custom",
  viewHistoryVisible: true,
  profileDiscoverable: true,
  memberDefaultRole: "member",
  inviteApprovalRequired: true,
  allowExternalMembers: false,
  appRelease: {
    hasUpdate: true,
    versionName: "1.0.1",
    title: "发现新版本",
    description: "1. 修复问题\n2. 优化体验",
    forceUpdate: false,
    downloadUrl: "https://example.com/app.apk",
    appStoreUrl: "",
    platform: "android",
  },
  appReleases: [
    {
      id: "android-1.0.1",
      hasUpdate: true,
      versionName: "1.0.1",
      title: "发现新版本",
      description: "1. 修复问题\n2. 优化体验",
      forceUpdate: false,
      downloadUrl: "https://example.com/app.apk",
      appStoreUrl: "",
      platform: "android",
      updatedAt: "2026-05-09 10:30",
    },
    {
      id: "android-1.0.0",
      hasUpdate: false,
      versionName: "1.0.0",
      title: "稳定版本",
      description: "1. 优化登录稳定性\n2. 调整首页加载体验",
      forceUpdate: false,
      downloadUrl: "https://example.com/app-1.0.0.apk",
      appStoreUrl: "",
      platform: "android",
      updatedAt: "2026-04-22 16:10",
    },
    {
      id: "android-0.9.8",
      hasUpdate: false,
      versionName: "0.9.8",
      title: "体验优化",
      description: "1. 优化巡检列表筛选\n2. 修复部分机型页面回退异常",
      forceUpdate: false,
      downloadUrl: "https://example.com/app-0.9.8.apk",
      appStoreUrl: "",
      platform: "android",
      updatedAt: "2026-04-02 11:25",
    },
    {
      id: "android-0.9.5",
      hasUpdate: false,
      versionName: "0.9.5",
      title: "灰度版本",
      description: "1. 新增工单附件预览\n2. 修复消息提醒状态同步",
      forceUpdate: true,
      downloadUrl: "https://example.com/app-0.9.5.apk",
      appStoreUrl: "",
      platform: "android",
      updatedAt: "2026-03-12 09:40",
    },
    {
      id: "ios-1.0.0",
      hasUpdate: false,
      versionName: "1.0.0",
      title: "基础版本",
      description: "1. 上线账号登录\n2. 支持工单和巡检基础能力",
      forceUpdate: false,
      downloadUrl: "",
      appStoreUrl: "https://apps.apple.com/app/idxxxx",
      platform: "ios",
      updatedAt: "2026-04-18 15:20",
    },
    {
      id: "ios-0.9.7",
      hasUpdate: false,
      versionName: "0.9.7",
      title: "审核版本",
      description: "1. 优化媒体内容播放\n2. 调整账号安全提示",
      forceUpdate: false,
      downloadUrl: "",
      appStoreUrl: "https://apps.apple.com/app/idxxxx",
      platform: "ios",
      updatedAt: "2026-03-30 14:50",
    },
    {
      id: "ios-0.9.3",
      hasUpdate: false,
      versionName: "0.9.3",
      title: "内测版本",
      description: "1. 新增基础巡检能力\n2. 修复工单状态刷新问题",
      forceUpdate: false,
      downloadUrl: "",
      appStoreUrl: "https://apps.apple.com/app/idxxxx",
      platform: "ios",
      updatedAt: "2026-03-05 18:15",
    },
  ],
  preferredName: currentUser.name,
  selectedAvatarKey: currentUser.avatarKey,
  userId: currentUser.uuid,
})

watch(
  () => [currentUser.name, currentUser.email] as const,
  ([nextName, nextEmail], previousValues) => {
    const [previousName = "", previousEmail = ""] = previousValues ?? []

    if (state.accountName === previousName) {
      state.accountName = nextName
    }

    if (state.accountEmail === previousEmail) {
      state.accountEmail = nextEmail
    }
  },
  { immediate: true },
)

watch(() => currentUser.uuid, (value) => {
  state.userId = value
}, { immediate: true })

watch(() => currentUser.avatarKey, (value) => {
  if (state.selectedAvatarKey !== value) {
    state.selectedAvatarKey = value
  }
}, { immediate: true })

watch(() => state.selectedAvatarKey, (value) => {
  if (currentUser.avatarKey !== value) {
    setCurrentUserAvatar(value)
  }
}, { immediate: true })

watch(themeMode, (value) => {
  if (state.themeMode !== value) {
    state.themeMode = value
  }
}, { immediate: true })

watch(() => state.themeMode, (value) => {
  if (themeMode.value !== value) {
    themeMode.value = value
  }
})

watch(sidebarColor, (value) => {
  if (state.sidebarColor !== value) {
    state.sidebarColor = value
  }
}, { immediate: true })

watch(() => state.sidebarColor, (value) => {
  if (sidebarColor.value !== value) {
    sidebarColor.value = value
  }
})

const categories = computed<SettingsCategory[]>(() => [
  {
    key: "me",
    group: "account",
    label: currentUser.name,
    description: "管理你的档案和头像",
    pageTitle: "我",
    pageDescription: "管理你的档案和头像",
    icon: "ri-user-line",
    avatarSrc: currentUser.avatarSrc,
    avatarFallback: currentUser.name.charAt(0).toUpperCase(),
    sections: [],
  },
  {
    key: "preferences",
    group: "account",
    label: "偏好",
    description: "主题和侧边栏颜色等个人外观偏好。",
    icon: "ri-equalizer-line",
    sections: [
      {
        key: "appearance",
        title: "外观",
        description: "",
        items: [
          {
            key: "themeMode",
            type: "select",
            modelKey: "themeMode",
            label: "外观",
            description: "在此设备上选择界面外观。",
            options: [
              { label: "跟随系统", value: "system" },
              { label: "浅色", value: "light" },
              { label: "深色", value: "dark" },
            ],
          },
          {
            key: "sidebarColor",
            type: "select",
            modelKey: "sidebarColor",
            label: "颜色",
            description: "调整侧边栏背景颜色。",
            options: sidebarColorOptions,
          },
        ],
      },
    ],
  },
  {
    key: "members",
    group: "workspace",
    label: "成员",
    description: "按部门管理成员、切换角色并处理成员接入。",
    icon: "ri-team-line",
    sections: [
      {
        key: "member-access",
        title: "成员接入",
        description: "控制新成员加入工作区时的默认权限和审批流程。",
        items: [
          {
            key: "memberDefaultRole",
            type: "select",
            modelKey: "memberDefaultRole",
            label: "默认成员角色",
            description: "通过邀请链接加入的成员默认获得的角色。",
            options: [
              { label: "成员", value: "member" },
              { label: "运营", value: "operator" },
              { label: "观察者", value: "viewer" },
            ],
          },
          {
            key: "inviteApprovalRequired",
            type: "toggle",
            modelKey: "inviteApprovalRequired",
            label: "邀请加入需审批",
            description: "新成员接受邀请后，需要管理员确认才能进入工作区。",
          },
          {
            key: "allowExternalMembers",
            type: "toggle",
            modelKey: "allowExternalMembers",
            label: "允许外部联系人加入",
            description: "允许非企业域账号以受限身份加入协作。",
          },
        ],
      },
      {
        key: "member-operations",
        title: "成员管理",
        description: "快速进入成员名册和待处理邀请，便于集中处理。",
        items: [
          {
            key: "openMembersDirectory",
            type: "button",
            actionKey: "open-members-directory",
            label: "查看成员名册",
            description: "查看当前工作区成员、角色分配和最近加入记录。",
            buttonLabel: "打开名册",
            variant: "outline",
          },
          {
            key: "reviewMemberInvites",
            type: "button",
            actionKey: "review-member-invites",
            label: "处理待审批邀请",
            description: "检查邀请状态、补发邀请或撤回未接受的邀请。",
            buttonLabel: "查看邀请",
            variant: "outline",
          },
        ],
      },
    ],
  },
  {
    key: "business-presets",
    group: "feature",
    label: "业务预设",
    description: "集中维护行业分类等基础信息与分类项，统一选项口径，便于录入、管理与统计。",
    icon: "ri-stack-line",
    pageTitle: "业务预设",
    pageDescription: "在此为业务预先配置基础信息与分类，统一预设选项与展示口径，便于日常管理、对比与统计分析。",
    sections: [],
  },
  {
    key: "inspection-items",
    group: "feature",
    label: "检测项",
    description: "维护巡检检测项、分类、检测内容和判定标准。",
    icon: "ri-file-list-3-line",
    pageTitle: "检测项",
    pageDescription: "通过页签切换检测项、分类和模板，统一维护巡检基础数据。",
    sections: [],
  },
  {
    key: "apps",
    group: "admin",
    label: "应用更新",
    description: "维护移动端版本号、更新日志和下载地址。",
    icon: "ri-smartphone-line",
    pageTitle: "应用更新",
    pageDescription: "维护 Android 与 iOS 用户端版本信息，后续可直接对接更新接口。",
    sections: [],
  },
  {
    key: "developer",
    group: "admin",
    label: "开发者",
    description: "查看并维护后台路由、操作权限与接口元数据，支撑权限策略与前后端联调。",
    icon: "ri-braces-line",
    pageTitle: "开发者",
    pageDescription: "查看并维护后台路由、操作权限与接口元数据，支撑权限策略与前后端联调。",
    sections: [],
  },
])

const activeKey = ref<SettingsCategoryKey>("me")
const settingsLoaded = ref(false)

const activeCategory = computed(
  () => categories.value.find(category => category.key === activeKey.value) ?? categories.value[0],
)

async function ensureSettingsLoaded() {
  if (settingsLoaded.value) {
    return
  }

  settingsLoaded.value = true

  try {
    const snapshot = await loadSettingsSnapshot()
    Object.assign(state, snapshot)
    state.userId = currentUser.uuid
  } catch {
    settingsLoaded.value = false
  }
}

function setActiveKey(nextKey: SettingsCategoryKey) {
  activeKey.value = nextKey
}

function runAction(actionKey: SettingsActionKey) {
  if (actionKey === "open-members-directory") {
    toast("成员名册待接入", {
      description: "入口已预留，后续可直接连到成员列表或权限页。",
    })
    return
  }

  if (actionKey === "review-member-invites") {
    toast("邀请审批面板待接入", {
      description: "当前先保留交互入口，后续可接真实邀请流。",
    })
    return
  }

  toast.error("操作未开放", {
    description: "该操作入口已预留，接入前端确认流后再启用。",
  })
}

export function useSettings() {
  return {
    activeCategory,
    activeKey,
    categories,
    ensureSettingsLoaded,
    runAction,
    setActiveKey,
    state,
  }
}
