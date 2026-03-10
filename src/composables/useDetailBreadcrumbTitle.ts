import { ref } from "vue"

/**
 * 用于详情页覆盖面包屑最后一项的标题（如企业名称）。
 * 详情页在挂载时设置，离开时清空；AppHeader 读取并优先使用。
 */
export const detailBreadcrumbTitle = ref<string | null>(null)
