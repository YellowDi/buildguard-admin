import { ref } from "vue"
import type { RouteLocationRaw } from "vue-router"

type DetailBreadcrumbItem = {
  title: string
  to?: string | RouteLocationRaw
}

/**
 * 详情页用于覆盖面包屑最后一项标题的共享状态。
 * 页面进入时写入，离开时清空；头部面包屑优先读取这个值。
 */
export const detailBreadcrumbTitle = ref<string | null>(null)

/**
 * 详情页用于覆盖整条面包屑（例如「客户 / {客户名} / {园区名}」）。
 * 有值时优先于 route.meta.breadcrumb；离开页面时需要清空。
 */
export const detailBreadcrumbItems = ref<DetailBreadcrumbItem[] | null>(null)
