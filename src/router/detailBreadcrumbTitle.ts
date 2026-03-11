import { ref } from "vue"

/**
 * 详情页用于覆盖面包屑最后一项标题的共享状态。
 * 页面进入时写入，离开时清空；头部面包屑优先读取这个值。
 */
export const detailBreadcrumbTitle = ref<string | null>(null)
