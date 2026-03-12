import { computed, reactive, ref, watch } from "vue"
import { toast } from "vue-sonner"

import { useAppTheme } from "@/composables/useAppTheme"
import type {
  SettingsActionKey,
  SettingsCategory,
  SettingsCategoryKey,
  SettingsState,
} from "@/components/settings/types"

const { themeMode } = useAppTheme()

const state = reactive<SettingsState>({
  displayName: "BuildGuard Admin",
  supportEmail: "ops@buildguard.cn",
  startupView: "dashboard",
  timezone: "asia-shanghai",
  themeMode: themeMode.value,
  compactTables: false,
  reducedMotion: true,
  showCommandHints: true,
  criticalAlerts: true,
  browserNotifications: false,
  digestFrequency: "daily",
  twoFactorEnabled: true,
  sessionTimeout: "30",
})

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

const categories: SettingsCategory[] = [
  {
    key: "general",
    label: "常规",
    description: "工作区基础信息、界面偏好和默认行为。",
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
          {
            key: "startupView",
            type: "select",
            modelKey: "startupView",
            label: "默认启动视图",
            description: "登录后优先进入的主界面。",
            options: [
              { label: "工作台", value: "dashboard" },
              { label: "企业列表", value: "companies" },
              { label: "车辆列表", value: "vehicles" },
              { label: "报警查询", value: "alarm-queries" },
            ],
          },
        ],
      },
      {
        key: "regional",
        title: "区域与时间",
        description: "保持导出、日报和操作记录的时间语义一致。",
        items: [
          {
            key: "timezone",
            type: "select",
            modelKey: "timezone",
            label: "默认时区",
            description: "用于列表筛选、日报生成和调度提醒时间显示。",
            options: [
              { label: "上海 (UTC+08:00)", value: "asia-shanghai" },
              { label: "新加坡 (UTC+08:00)", value: "asia-singapore" },
              { label: "洛杉矶 (UTC-07:00)", value: "america-los-angeles" },
              { label: "伦敦 (UTC+00:00)", value: "europe-london" },
            ],
          },
        ],
      },
      {
        key: "theme",
        title: "界面样式",
        description: "让设置窗口和主界面保持一致的桌面应用观感。",
        items: [
          {
            key: "themeMode",
            type: "select",
            modelKey: "themeMode",
            label: "主题模式",
            description: "在系统、浅色和深色模式之间切换。",
            options: [
              { label: "跟随系统", value: "system" },
              { label: "浅色", value: "light" },
              { label: "深色", value: "dark" },
            ],
          },
          {
            key: "compactTables",
            type: "toggle",
            modelKey: "compactTables",
            label: "紧凑表格",
            description: "减少列表行高，提升高密度信息场景的浏览效率。",
          },
          {
            key: "showCommandHints",
            type: "toggle",
            modelKey: "showCommandHints",
            label: "显示快捷提示",
            description: "在关键按钮旁显示命令提示和快捷键标识。",
          },
          {
            key: "reducedMotion",
            type: "toggle",
            modelKey: "reducedMotion",
            label: "减少动效",
            description: "关闭非必要位移动画，保留必要反馈。",
          },
        ],
      },
    ],
  },
  {
    key: "notifications",
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
    key: "security",
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
]

const isOpen = ref(false)
const activeKey = ref<SettingsCategoryKey>("general")

const activeCategory = computed(
  () => categories.find(category => category.key === activeKey.value) ?? categories[0],
)

function openSettingsDialog(nextKey?: SettingsCategoryKey) {
  if (nextKey) {
    activeKey.value = nextKey
  }
  isOpen.value = true
}

function closeSettingsDialog() {
  isOpen.value = false
}

function setSettingsDialogOpen(value: boolean) {
  isOpen.value = value
}

function setActiveKey(nextKey: SettingsCategoryKey) {
  activeKey.value = nextKey
}

function runAction(actionKey: SettingsActionKey) {
  if (actionKey === "save-profile") {
    toast.success("设置已保存", {
      description: "工作区资料和默认偏好已更新。",
    })
    return
  }

  if (actionKey === "send-test-notification") {
    toast.success("测试通知已发送", {
      description: "请检查浏览器通知和消息中心是否已收到。",
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

  toast.error("删除工作区未开放", {
    description: "危险操作入口已预留，接入前端确认流后再启用。",
  })
}

export function useSettingsDialog() {
  return {
    activeCategory,
    activeKey,
    categories,
    closeSettingsDialog,
    isOpen,
    openSettingsDialog,
    runAction,
    setActiveKey,
    setSettingsDialogOpen,
    state,
  }
}
