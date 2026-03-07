# Resource List Pages

本项目中的后台表格页统一使用资源页 schema 驱动，不再直接在业务页面里手写 `ListPage + useListController` 这一层协议。

标准目标只有一个：让开发者新建一个列表页时，只需要关心数据结构、页面 schema 和少量展示差异，而不需要理解资源层内部状态机。

## 标准写法
单表格页统一使用下面这条链路：

1. 定义行类型
2. 准备数据数组
3. 声明 `ResourceListSchema<Row>`
4. 调用 `useResourceList(schema)`
5. 模板只渲染 `<ResourceListPage :page="page" />`

参考：

- [UsersView.vue](/Users/Rolly/buildguard-admin/src/views/UsersView.vue)
- [CompaniesView.vue](/Users/Rolly/buildguard-admin/src/views/CompaniesView.vue)

多表格页也使用同样的资源 schema，只是在页面顶层维护多个 schema，然后切换当前激活的资源页：

1. 分别定义多个 `ResourceListSchema`
2. 分别调用 `useResourceList`
3. 用顶层 tab 决定当前激活的 page
4. 模板渲染 `<ResourceTabbedPage :active-page="activePage" />`

参考：

- [VehiclesView.vue](/Users/Rolly/buildguard-admin/src/views/VehiclesView.vue)

## schema 怎么拆
一个 `ResourceListSchema` 里最常维护的是这几块：

- `title`: 页面标题
- `rowKey`: 表格行主键
- `data`: 当前页面的数据数组
- `columns`: 列定义，同时也是搜索、筛选、排序的主要声明区
- `filters`: 不适合挂在单列上的附加筛选
- `sort`: 默认排序和本地持久化
- `tabs`: 顶部标签页分组方式

判断规则很简单：

- 如果某个能力跟一列强相关，优先放在 `columns`
- 如果某个筛选是“跨列”或“页面级”的，放在 `filters`
- 如果只是切换数据分组，放在 `tabs`
- 如果只是决定默认排序和排序记忆，放在 `sort`

## columns 负责什么
`columns` 不只是“表头长什么样”，它还是列表行为的主入口。

一个典型列通常会维护这些字段：

- `key`: 对应哪一个数据字段
- `label`: 表头文案
- `filterType`: 表格列的筛选类型表现
- `searchable`: 是否参与全文搜索
- `filter`: 是否生成筛选项，以及筛选如何取值
- `sort`: 是否进入排序面板，以及排序如何取值
- `cellRenderer`: 单元格如何渲染

优先使用默认能力，只有必要时再自定义函数：

- `searchable: true` 时，默认按该列原始值参与搜索
- `filter.value` 不写时，默认按该列原始值筛选
- `sort: true` 时，默认按该列原始值排序
- `tag` 类型筛选项默认会从当前数据去重生成

适合自定义函数的情况：

- 一列展示两个字段，如“姓名 + 手机号”
- 排序值和展示值不同，如 `"99.2%"` 需要转成数字
- 筛选值和展示值不同，如“法人信息”实际要匹配 `legalPerson + phone`

## filters / sort / tabs 什么时候用
`filters` 只放页面级附加筛选。例如“在页面中”这种并不对应某一列，但要参与列表过滤。

`sort` 只负责排序面板和默认排序：

- `storageKey`: 本地持久化 key
- `initialField`: 默认排序字段
- `initialDirection`: 默认排序方向

`tabs` 用来描述顶部标签页，当前标准支持按枚举值自动生成：

- `mode: "enum"`
- `all`: 全部标签配置
- `field`: 按哪个字段分组

如果只是“按状态分组”“按类型分组”，不要自己写 tab 统计逻辑，直接用 `tabs.field`。

## 单表格页开发流程
新增一个普通列表页时，按下面顺序做：

1. 先定义行类型，确保字段含义清晰
2. 准备数据，必要时在页面顶部做一次轻量转换
3. 先把表格列跑通，只写 `key + label + cellRenderer`
4. 再逐列补 `searchable / filter / sort`
5. 最后补页面级 `filters`、默认 `sort`、顶部 `tabs`
6. 模板保持极薄，只保留 `<ResourceListPage :page="page" />`

不要这样做：

- 不要重新引入 `useListController`
- 不要在页面里手写 `buildSearchText`
- 不要在页面里手写 `getFilterValue`
- 不要在页面里手写 `compareSort`
- 不要在页面里手写长串事件透传

## 多表格页开发流程
像车辆页这种“一个页面多个表格”的场景，不是例外架构，只是页面顶层多了一层资源切换。

推荐方式：

1. 为每个子表定义独立 schema
2. 每个 schema 单独 `useResourceList`
3. 用一个简单的 `pageRegistry` 管理多个 page
4. 顶层 tab 只负责切换 `activePage`
5. 表格内部的搜索、筛选、排序仍然完全由各自 page 管理

不要这样做：

- 不要把多个表的筛选状态硬塞进一个 controller
- 不要在顶层页面手动桥接每一种筛选更新事件
- 不要为了多表切换回退到旧的页面配置协议

## 维护原则
资源层组件和 hooks 位于：

- [useResourceList.ts](/Users/Rolly/buildguard-admin/src/components/resource/useResourceList.ts)
- [ResourceListPage.vue](/Users/Rolly/buildguard-admin/src/components/resource/ResourceListPage.vue)
- [ResourceTabbedPage.vue](/Users/Rolly/buildguard-admin/src/components/resource/ResourceTabbedPage.vue)
- [types.ts](/Users/Rolly/buildguard-admin/src/components/resource/types.ts)

维护时遵守两条原则：

1. 业务页面只写 schema，不直接拼控制器内部协议
2. 新能力如果能抽成 schema 语义，就不要把逻辑再压回业务页面

如果未来要扩展服务端分页、批量操作、操作列、URL 同步，优先在资源层扩展公共能力，再由业务页面通过 schema 使用。
