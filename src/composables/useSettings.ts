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
  displayName: "宝京云维",
  supportEmail: "ops@buildguard.cn",
  startupView: "dashboard",
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
  criticalAlerts: true,
  browserNotifications: false,
  digestFrequency: "daily",
  twoFactorEnabled: true,
  sessionTimeout: "30",
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
    key: "general",
    group: "workspace",
    label: "通用",
    description: "工作区基础信息和默认联络方式。",
    icon: "ri-settings-3-line",
    sections: [
      {
        key: "profile",
        title: "工作区资料",
        description: "维护默认展示信息，供导航、通知和协作场景复用。",
        items: [
          {
            key: "displayName",
            type: "input",
            modelKey: "displayName",
            label: "工作区名称",
            description: "显示在顶部标题、系统通知和导出摘要中的名称。",
            placeholder: "输入工作区名称",
          },
          {
            key: "supportEmail",
            type: "input",
            modelKey: "supportEmail",
            label: "通知回邮地址",
            description: "报警、审批和系统提醒默认使用的回复邮箱。",
            placeholder: "ops@company.com",
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
    key: "report-template",
    group: "feature",
    label: "报告模板",
    description: "配置检测报告导出模板、模块顺序和默认展示信息。",
    icon: "ri-file-chart-line",
    pageTitle: "报告模板",
    pageDescription: "调整检测报告 HTML 与 PDF 打印版本的模块、顺序、水印和页脚说明。",
    sections: [],
  },
  {
    key: "notifications",
    group: "feature",
    label: "通知",
    description: "报警推送、摘要频率和浏览器提醒。",
    icon: "ri-notification-3-line",
    sections: [
      {
        key: "delivery",
        title: "投递策略",
        description: "控制哪些事件需要即时触达，哪些进入汇总。",
        items: [
          {
            key: "criticalAlerts",
            type: "toggle",
            modelKey: "criticalAlerts",
            label: "高优先级报警即时提醒",
            description: "对严重报警直接触发横幅和通知中心提醒。",
          },
          {
            key: "browserNotifications",
            type: "toggle",
            modelKey: "browserNotifications",
            label: "浏览器桌面提醒",
            description: "在浏览器被切到后台时，继续接收桌面通知。",
          },
          {
            key: "digestFrequency",
            type: "select",
            modelKey: "digestFrequency",
            label: "摘要频率",
            description: "将非紧急消息合并为固定频率发送。",
            options: [
              { label: "实时", value: "realtime" },
              { label: "每日报告", value: "daily" },
              { label: "每周摘要", value: "weekly" },
              { label: "关闭摘要", value: "off" },
            ],
          },
          {
            key: "sendTestNotification",
            type: "button",
            actionKey: "send-test-notification",
            label: "测试通知链路",
            description: "立即发送一条测试消息，验证当前通知配置是否生效。",
            buttonLabel: "发送测试通知",
            variant: "outline",
          },
        ],
      },
    ],
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
  {
    key: "security",
    group: "admin",
    label: "安全",
    description: "会话管理、登录保护和高风险操作。",
    icon: "ri-shield-keyhole-line",
    sections: [
      {
        key: "session",
        title: "登录保护",
        description: "控制后台访问时效和高风险登录校验强度。",
        items: [
          {
            key: "twoFactorEnabled",
            type: "toggle",
            modelKey: "twoFactorEnabled",
            label: "启用双重验证",
            description: "管理员登录时要求额外验证码确认。",
          },
          {
            key: "sessionTimeout",
            type: "select",
            modelKey: "sessionTimeout",
            label: "会话超时",
            description: "后台无操作达到该时长后自动要求重新登录。",
            options: [
              { label: "15 分钟", value: "15" },
              { label: "30 分钟", value: "30" },
              { label: "1 小时", value: "60" },
              { label: "4 小时", value: "240" },
            ],
          },
          {
            key: "reviewSessions",
            type: "button",
            actionKey: "review-active-sessions",
            label: "查看活跃设备",
            description: "检查当前工作区已登录设备和最近访问记录。",
            buttonLabel: "查看会话",
            variant: "outline",
          },
        ],
      },
      {
        key: "danger-zone",
        title: "危险操作区",
        description: "这些操作不可逆，应只在确认影响范围后执行。",
        tone: "danger",
        items: [
          {
            key: "revokeOthers",
            type: "button",
            actionKey: "revoke-other-sessions",
            label: "退出其他设备",
            description: "强制当前账号在其他浏览器和设备上退出登录。",
            buttonLabel: "全部退出",
            variant: "outline",
          },
          {
            key: "deleteWorkspace",
            type: "button",
            actionKey: "delete-workspace",
            label: "删除当前工作区",
            description: "移除当前工作区及其设置，操作后无法恢复。",
            buttonLabel: "删除工作区",
            variant: "destructive",
          },
        ],
      },
    ],
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
  if (actionKey === "send-test-notification") {
    toast.success("测试通知已发送", {
      description: "请检查浏览器通知和消息中心是否已收到。",
    })
    return
  }

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

  if (actionKey === "review-active-sessions") {
    toast("活跃会话面板待接入", {
      description: "当前先保留交互入口，后续可接真实设备列表。",
    })
    return
  }

  if (actionKey === "revoke-other-sessions") {
    toast.success("已请求退出其他设备", {
      description: "当前设备会保持登录状态。",
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
