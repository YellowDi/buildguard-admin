# Table Pages

本项目中的后台表格页统一使用 table-page schema 驱动，不再直接在业务页面里手写 `Page + useListController` 这一层协议。

标准目标只有一个：让开发者新建一个列表页时，只需要关心数据结构、页面 schema 和少量展示差异，而不需要理解 table-page 层内部状态机。

## 标准写法
单表格页统一使用下面这条链路：

1. 定义行类型
2. 准备数据数组
3. 声明 `TablePageSchema<Row>`
4. 调用 `useTablePage(schema)`
5. 模板只渲染 `<TablePage :page="page" />`

参考：

- [UsersListView.vue](/Users/Rolly/buildguard-admin/src/views/list/UsersListView.vue)
- [CompaniesListView.vue](/Users/Rolly/buildguard-admin/src/views/list/CompaniesListView.vue)

多表格页也使用同样的 table-page schema，只是在页面顶层维护多个 schema，然后切换当前激活的表格页：

1. 分别定义多个 `TablePageSchema`
2. 分别调用 `useTablePage`
3. 用顶层 tab 决定当前激活的 page
4. 模板渲染 `<TabbedTablePage :active-page="activePage" />`

参考：

- [VehiclesListView.vue](/Users/Rolly/buildguard-admin/src/views/list/VehiclesListView.vue)

## schema 怎么拆
一个 `TablePageSchema` 里最常维护的是这几块：

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
- `tone / emphasis / format / width`: 列样式的语义表达
- `filter`: 是否生成筛选项，以及筛选如何取值
- `sort`: 是否进入排序面板，以及排序如何取值
- `cellRenderer`: 单元格如何渲染

优先使用默认能力，只有必要时再自定义函数：

- `filter.value` 不写时，默认按该列原始值筛选
- `sort: true` 时，默认按该列原始值排序
- `tag` 类型筛选项默认会从当前数据去重生成

适合自定义函数的情况：

- 一列展示两个字段，如“姓名 + 手机号”
- 排序值和展示值不同，如 `"99.2%"` 需要转成数字
- 筛选值和展示值不同，如“法人信息”实际要匹配 `legalPerson + phone`

## 样式写法
表格样式优先使用 table-page 层语义，不要直接在页面里堆 `cellClass/headerClass`。

当前推荐优先使用这些字段：

- `tone`: `default | primary | muted | accent | warning`
- `emphasis`: `default | strong`
- `format`: `default | numeric | note`
- `width`: `auto | fill`
- `variant`: `default | contact | note | metric`

常见映射：

- 主标识列：`tone: "primary", emphasis: "strong"`
- 数字或日期列：`format: "numeric"`
- 备注列：`variant: "note", format: "note", tone: "muted", width: "fill"`
- 强调数值列：`tone: "accent"`
- 风险或告警状态列：`tone: "warning"`

状态类单元格优先走 `cellRenderer: { kind: "status" }`，不要在业务页重复写 slot：

- 用 `map` 声明状态值到 Notion 色盘的映射：`default | gray | brown | orange | yellow | green | blue | purple | pink | red`
- 需要兜底时补 `fallback`
- 适合“处理状态 / 人员状态 / 归档状态”这类“图标 + 文案”的统一展示
- 视觉实现统一复用 [StatusBadge.vue](/Users/Rolly/buildguard-admin/src/components/ui/status-badge/StatusBadge.vue)

只有在 table-page 层语义确实表达不了时，才允许保留 `cellClass/headerClass` 作为 escape hatch。

不要这样做：

- 不要在每个页面重复写 `wrapperClass` / `tableClass`
- 不要把主列加粗、备注灰度、日期列数字字体这些主题级样式散落在页面里
- 不要把页面里的 class 当作常规能力使用

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
4. 再逐列补 `filter / sort`
5. 最后补页面级 `filters`、默认 `sort`、顶部 `tabs`
6. 模板保持极薄，只保留 `<TablePage :page="page" />`

不要这样做：

- 不要重新引入 `useListController`
- 不要在页面里手写 `getFilterValue`
- 不要在页面里手写 `compareSort`
- 不要在页面里手写长串事件透传

## 多表格页开发流程
像车辆页这种“一个页面多个表格”的场景，不是例外架构，只是页面顶层多了一层表格页切换。

推荐方式：

1. 为每个子表定义独立 schema
2. 每个 schema 单独 `useTablePage`
3. 用一个简单的 `pageRegistry` 管理多个 page
4. 顶层 tab 只负责切换 `activePage`
5. 表格内部的筛选、排序仍然完全由各自 page 管理

不要这样做：

- 不要把多个表的筛选状态硬塞进一个 controller
- 不要在顶层页面手动桥接每一种筛选更新事件
- 不要为了多表切换回退到旧的页面配置协议

## 维护原则
table-page 层组件和 hooks 位于：

- [useTablePage.ts](/Users/Rolly/buildguard-admin/src/components/table-page/useTablePage.ts)
- [TablePage.vue](/Users/Rolly/buildguard-admin/src/components/table-page/TablePage.vue)
- [TabbedTablePage.vue](/Users/Rolly/buildguard-admin/src/components/table-page/TabbedTablePage.vue)
- [types.ts](/Users/Rolly/buildguard-admin/src/components/table-page/types.ts)

维护时遵守两条原则：

1. 业务页面只写 schema，不直接拼控制器内部协议
2. 新能力如果能抽成 schema 语义，就不要把逻辑再压回业务页面

表格视觉统一入口位于：

- [tableTheme.ts](/Users/Rolly/buildguard-admin/src/components/table-page/tableTheme.ts)
- [TablePageTable.vue](/Users/Rolly/buildguard-admin/src/components/table-page/TablePageTable.vue)

如果未来要扩展服务端分页、批量操作、操作列、URL 同步，优先在 table-page 层扩展公共能力，再由业务页面通过 schema 使用。
