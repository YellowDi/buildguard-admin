import type { TableStatusOption } from "@/components/table-page/types"

export const processStatusMap = {
  待复核: { tone: "orange", icon: "clock" },
  处理中: { tone: "red", icon: "alert" },
  已派单: { tone: "green", icon: "check" },
  已完成: { tone: "green", icon: "check" },
  已处理: { tone: "green", icon: "check" },
  已关闭: { tone: "gray", icon: "minus" },
} satisfies Record<string, TableStatusOption>

export const practitionerStatusMap = {
  在岗: { tone: "green", icon: "check" },
  待复核: { tone: "orange", icon: "clock" },
  停用: { tone: "gray", icon: "minus" },
  离岗: { tone: "gray", icon: "minus" },
  异常: { tone: "red", icon: "alert" },
} satisfies Record<string, TableStatusOption>

export const archiveStatusMap = {
  已归档: { tone: "green", icon: "check" },
  待复盘: { tone: "orange", icon: "clock" },
  已撤销: { tone: "gray", icon: "minus" },
  归档异常: { tone: "red", icon: "alert" },
} satisfies Record<string, TableStatusOption>

export const outboundTaskStatusMap = {
  待执行: { tone: "orange", icon: "clock" },
  执行中: { tone: "red", icon: "alert" },
  已完成: { tone: "green", icon: "check" },
  已取消: { tone: "gray", icon: "minus" },
} satisfies Record<string, TableStatusOption>

export const workOrderStatusMap = {
  待处理: { tone: "gray", icon: "dot" },
  待指派: { tone: "gray", icon: "dot" },
  待开始: { tone: "purple", icon: "clock" },
  处理中: { tone: "orange", icon: "clock" },
  进行中: { tone: "green", icon: "clock" },
  报告生成中: { tone: "blue", icon: "clock" },
  已完成: { tone: "green", icon: "check" },
  已结单: { tone: "green", icon: "check" },
  已关闭: { tone: "gray", icon: "minus" },
} satisfies Record<string, TableStatusOption>
