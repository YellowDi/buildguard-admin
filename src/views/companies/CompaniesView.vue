<script setup lang="ts">
import { computed, ref } from "vue"

import CompaniesHeader from "@/components/companies/CompaniesHeader.vue"

type CompanyRecord = {
  id: number
  name: string
  type: string
  district: string
  vehicles: number
  legalPerson: string
  phone: string
  serviceDays: number
  lastUpdated: string
  note: string
}

const tabs = [
  { label: "全部", count: 550, active: true },
  { label: "道路旅客运输", count: 212, active: false },
  { label: "道路危险货物运输", count: 338, active: false },
]

const sortDirection = ref<"asc" | "desc">("desc")
const showControls = ref(true)

const fields = computed(() => [
  {
    icon: sortDirection.value === "desc" ? "ri-sort-desc" : "ri-sort-asc",
    label: "服务剩余时长",
    accent: true,
    arrow: true,
    kind: "sort",
  },
  { icon: "ri-text", label: "企业名称", arrow: false, kind: "filter" },
  { icon: "ri-user-line", label: "法人信息", arrow: true, kind: "filter" },
  { icon: "ri-checkbox-multiple-blank-line", label: "在页项中", arrow: true, kind: "filter" },
  { icon: "ri-calendar-line", label: "日期", arrow: true, kind: "filter" },
])

const companies: CompanyRecord[] = [
  {
    id: 1,
    name: "宁波企丰科技有限公司",
    type: "道路旅客运输",
    district: "海曙区",
    vehicles: 875,
    legalPerson: "陈经理",
    phone: "15212545896",
    serviceDays: 128,
    lastUpdated: "2026-03-05 14:20",
    note: "重点企业，月度回访中",
  },
  {
    id: 2,
    name: "宁波兴达交通服务有限公司",
    type: "道路旅客运输",
    district: "鄞州区",
    vehicles: 426,
    legalPerson: "徐总",
    phone: "13867452319",
    serviceDays: 86,
    lastUpdated: "2026-03-04 09:10",
    note: "营运证年审待补材料",
  },
  {
    id: 3,
    name: "宁波北仑安运物流有限公司",
    type: "道路危险货物运输",
    district: "北仑区",
    vehicles: 252,
    legalPerson: "刘经理",
    phone: "18958231472",
    serviceDays: 63,
    lastUpdated: "2026-03-06 11:48",
    note: "新增 12 辆挂车",
  },
  {
    id: 4,
    name: "宁海纵横危运有限公司",
    type: "道路危险货物运输",
    district: "宁海县",
    vehicles: 118,
    legalPerson: "陈总",
    phone: "13780024518",
    serviceDays: 51,
    lastUpdated: "2026-03-03 16:32",
    note: "电子签章待开通",
  },
  {
    id: 5,
    name: "慈溪城际客运集团",
    type: "道路旅客运输",
    district: "慈溪市",
    vehicles: 391,
    legalPerson: "唐主任",
    phone: "13616547820",
    serviceDays: 145,
    lastUpdated: "2026-03-05 08:55",
    note: "春运保障名单",
  },
  {
    id: 6,
    name: "余姚安泰危货运输有限公司",
    type: "道路危险货物运输",
    district: "余姚市",
    vehicles: 204,
    legalPerson: "王经理",
    phone: "13586793422",
    serviceDays: 39,
    lastUpdated: "2026-03-07 10:05",
    note: "服务到期前 40 天提醒",
  },
  {
    id: 7,
    name: "奉化通联运输有限公司",
    type: "道路旅客运输",
    district: "奉化区",
    vehicles: 167,
    legalPerson: "周总",
    phone: "18657431288",
    serviceDays: 92,
    lastUpdated: "2026-03-06 18:12",
    note: "车载终端批量更新",
  },
  {
    id: 8,
    name: "象山蓝海危运服务有限公司",
    type: "道路危险货物运输",
    district: "象山县",
    vehicles: 143,
    legalPerson: "何经理",
    phone: "13967852341",
    serviceDays: 74,
    lastUpdated: "2026-03-02 13:27",
    note: "夜间线路已备案",
  },
  {
    id: 9,
    name: "宁波港兴客运发展有限公司",
    type: "道路旅客运输",
    district: "江北区",
    vehicles: 312,
    legalPerson: "许经理",
    phone: "13810234567",
    serviceDays: 121,
    lastUpdated: "2026-03-01 09:12",
    note: "季度复核通过",
  },
  {
    id: 10,
    name: "镇海安顺危货物流有限公司",
    type: "道路危险货物运输",
    district: "镇海区",
    vehicles: 156,
    legalPerson: "郭总",
    phone: "13910234568",
    serviceDays: 58,
    lastUpdated: "2026-03-01 11:42",
    note: "车辆台账已更新",
  },
  {
    id: 11,
    name: "宁波海联运输集团有限公司",
    type: "道路旅客运输",
    district: "海曙区",
    vehicles: 504,
    legalPerson: "蒋经理",
    phone: "13710234569",
    serviceDays: 134,
    lastUpdated: "2026-03-02 10:18",
    note: "春季巡检完成",
  },
  {
    id: 12,
    name: "北仑盛安危险品运输有限公司",
    type: "道路危险货物运输",
    district: "北仑区",
    vehicles: 97,
    legalPerson: "朱主任",
    phone: "13610234570",
    serviceDays: 44,
    lastUpdated: "2026-03-02 15:09",
    note: "证照即将到期",
  },
  {
    id: 13,
    name: "奉化新城客运服务有限公司",
    type: "道路旅客运输",
    district: "奉化区",
    vehicles: 228,
    legalPerson: "沈总",
    phone: "13510234571",
    serviceDays: 88,
    lastUpdated: "2026-03-03 08:45",
    note: "新增班线待备案",
  },
  {
    id: 14,
    name: "慈溪远程危货运输有限公司",
    type: "道路危险货物运输",
    district: "慈溪市",
    vehicles: 183,
    legalPerson: "陆经理",
    phone: "13410234572",
    serviceDays: 77,
    lastUpdated: "2026-03-03 13:24",
    note: "安全培训待补录",
  },
  {
    id: 15,
    name: "余姚城乡客运有限公司",
    type: "道路旅客运输",
    district: "余姚市",
    vehicles: 276,
    legalPerson: "丁经理",
    phone: "13310234573",
    serviceDays: 119,
    lastUpdated: "2026-03-03 17:31",
    note: "班次优化中",
  },
  {
    id: 16,
    name: "宁海宏达危险货运有限公司",
    type: "道路危险货物运输",
    district: "宁海县",
    vehicles: 141,
    legalPerson: "曹总",
    phone: "13210234574",
    serviceDays: 36,
    lastUpdated: "2026-03-04 09:56",
    note: "重点监管企业",
  },
  {
    id: 17,
    name: "象山海天客运有限公司",
    type: "道路旅客运输",
    district: "象山县",
    vehicles: 194,
    legalPerson: "韩经理",
    phone: "13110234575",
    serviceDays: 107,
    lastUpdated: "2026-03-04 12:16",
    note: "电子围栏已启用",
  },
  {
    id: 18,
    name: "鄞州安泰危运有限公司",
    type: "道路危险货物运输",
    district: "鄞州区",
    vehicles: 165,
    legalPerson: "冯经理",
    phone: "13010234576",
    serviceDays: 52,
    lastUpdated: "2026-03-04 16:40",
    note: "月报待提交",
  },
  {
    id: 19,
    name: "宁波东海客运集团有限公司",
    type: "道路旅客运输",
    district: "江北区",
    vehicles: 438,
    legalPerson: "魏总",
    phone: "13920234567",
    serviceDays: 142,
    lastUpdated: "2026-03-05 09:04",
    note: "线路调整完成",
  },
  {
    id: 20,
    name: "镇海蓝盾危货科技运输有限公司",
    type: "道路危险货物运输",
    district: "镇海区",
    vehicles: 122,
    legalPerson: "陶经理",
    phone: "13820234568",
    serviceDays: 61,
    lastUpdated: "2026-03-05 10:52",
    note: "数据接入正常",
  },
  {
    id: 21,
    name: "海曙快捷客运服务有限公司",
    type: "道路旅客运输",
    district: "海曙区",
    vehicles: 259,
    legalPerson: "姜主任",
    phone: "13720234569",
    serviceDays: 95,
    lastUpdated: "2026-03-05 14:22",
    note: "月检待安排",
  },
  {
    id: 22,
    name: "北仑联发危险品运输有限公司",
    type: "道路危险货物运输",
    district: "北仑区",
    vehicles: 148,
    legalPerson: "钱经理",
    phone: "13620234570",
    serviceDays: 49,
    lastUpdated: "2026-03-05 18:36",
    note: "运单抽查通过",
  },
  {
    id: 23,
    name: "奉化顺行客运有限公司",
    type: "道路旅客运输",
    district: "奉化区",
    vehicles: 207,
    legalPerson: "严总",
    phone: "13520234571",
    serviceDays: 109,
    lastUpdated: "2026-03-06 08:18",
    note: "新增司机待审核",
  },
  {
    id: 24,
    name: "慈溪信安危货运输有限公司",
    type: "道路危险货物运输",
    district: "慈溪市",
    vehicles: 171,
    legalPerson: "华经理",
    phone: "13420234572",
    serviceDays: 55,
    lastUpdated: "2026-03-06 11:11",
    note: "年度评估准备中",
  },
  {
    id: 25,
    name: "余姚捷达客运有限公司",
    type: "道路旅客运输",
    district: "余姚市",
    vehicles: 284,
    legalPerson: "金经理",
    phone: "13320234573",
    serviceDays: 127,
    lastUpdated: "2026-03-06 14:54",
    note: "服务合同已续签",
  },
  {
    id: 26,
    name: "宁海顺泰危货物流有限公司",
    type: "道路危险货物运输",
    district: "宁海县",
    vehicles: 133,
    legalPerson: "石总",
    phone: "13220234574",
    serviceDays: 41,
    lastUpdated: "2026-03-06 17:20",
    note: "需补充应急预案",
  },
  {
    id: 27,
    name: "象山蓝湾客运服务有限公司",
    type: "道路旅客运输",
    district: "象山县",
    vehicles: 216,
    legalPerson: "崔经理",
    phone: "13120234575",
    serviceDays: 101,
    lastUpdated: "2026-03-07 08:33",
    note: "旺季排班中",
  },
  {
    id: 28,
    name: "鄞州宏远危险货物运输有限公司",
    type: "道路危险货物运输",
    district: "鄞州区",
    vehicles: 159,
    legalPerson: "邵经理",
    phone: "13020234576",
    serviceDays: 47,
    lastUpdated: "2026-03-07 09:27",
    note: "高风险车辆复核",
  },
  {
    id: 29,
    name: "宁波城运客运有限公司",
    type: "道路旅客运输",
    district: "江北区",
    vehicles: 367,
    legalPerson: "熊总",
    phone: "13930234567",
    serviceDays: 138,
    lastUpdated: "2026-03-07 10:44",
    note: "监控在线率 100%",
  },
  {
    id: 30,
    name: "镇海恒安危货运输有限公司",
    type: "道路危险货物运输",
    district: "镇海区",
    vehicles: 145,
    legalPerson: "白经理",
    phone: "13830234568",
    serviceDays: 53,
    lastUpdated: "2026-03-07 11:18",
    note: "审计记录已归档",
  },
]

const sortedCompanies = computed(() => {
  return [...companies].sort((a, b) => {
    return sortDirection.value === "desc"
      ? b.serviceDays - a.serviceDays
      : a.serviceDays - b.serviceDays
  })
})

function toggleSort() {
  sortDirection.value = sortDirection.value === "desc" ? "asc" : "desc"
}

function handleFieldClick(kind: string) {
  if (kind === "sort") {
    toggleSort()
  }
}
</script>

<template>
  <section class="-mx-4 flex min-h-[calc(100vh-5.25rem)] flex-col bg-white">
    <div class="pb-3 pt-3">
      <div class="flex flex-col">
        <CompaniesHeader
          title="企业"
          :count="550"
          :tabs="tabs"
          :fields="fields"
          :show-controls="showControls"
          @field-click="handleFieldClick"
          @toggle-controls="showControls = !showControls"
        />

        <div class="overflow-auto">
          <div class="inline-block min-w-full pr-8 align-top">
            <table class="min-w-full w-max table-auto border-collapse bg-white text-[14px]">
              <thead class="text-[#7A7A7A]">
                <tr>
                  <th class="sticky top-0 z-10 w-8 min-w-8 bg-white py-2 pr-2 text-right font-normal"></th>
                  <th class="sticky top-0 z-10 border-b border-[#ECECEC] bg-white px-3 py-2 text-left font-normal whitespace-nowrap transition-colors hover:bg-[#F7F7F7]">企业名称</th>
                  <th class="sticky top-0 z-10 border-b border-[#ECECEC] bg-white px-3 py-2 text-left font-normal whitespace-nowrap transition-colors hover:bg-[#F7F7F7]">企业类型</th>
                  <th class="sticky top-0 z-10 border-b border-[#ECECEC] bg-white px-3 py-2 text-left font-normal whitespace-nowrap transition-colors hover:bg-[#F7F7F7]">行政区域</th>
                  <th class="sticky top-0 z-10 border-b border-[#ECECEC] bg-white px-3 py-2 text-left font-normal whitespace-nowrap transition-colors hover:bg-[#F7F7F7]">车辆总数</th>
                  <th class="sticky top-0 z-10 border-b border-[#ECECEC] bg-white px-3 py-2 text-left font-normal whitespace-nowrap transition-colors hover:bg-[#F7F7F7]">法人信息</th>
                  <th class="sticky top-0 z-10 border-b border-[#ECECEC] bg-white px-3 py-2 text-left font-normal whitespace-nowrap transition-colors hover:bg-[#F7F7F7]">服务剩余时长</th>
                  <th class="sticky top-0 z-10 w-full border-b border-[#ECECEC] bg-white px-3 py-2 text-left font-normal whitespace-nowrap transition-colors hover:bg-[#F7F7F7]">备注</th>
                </tr>
              </thead>

              <tbody class="text-[#2F2F2F]">
                <tr
                  v-for="(company, index) in sortedCompanies"
                  :key="company.id"
                  class="transition hover:bg-[#FBFBFB]"
                >
                  <td class="w-8 min-w-8 py-3 pr-2 text-right text-[#A0A0A0] whitespace-nowrap">{{ index + 1 }}</td>
                  <td class="border-b border-[#F0F0F0] px-3 py-3 font-medium text-[#1F1F1F] whitespace-nowrap">{{ company.name }}</td>
                  <td class="border-b border-l border-[#F0F0F0] px-3 py-3 text-[#3F3F3F] whitespace-nowrap">{{ company.type }}</td>
                  <td class="border-b border-l border-[#F0F0F0] px-3 py-3 text-[#3F3F3F] whitespace-nowrap">{{ company.district }}</td>
                  <td class="border-b border-l border-[#F0F0F0] px-3 py-3 tabular-nums text-[#2F2F2F] whitespace-nowrap">{{ company.vehicles }}</td>
                  <td class="border-b border-l border-[#F0F0F0] px-3 py-3 whitespace-nowrap">
                    <span class="text-[#1F1F1F]">{{ company.legalPerson }}</span>
                    <span class="ml-1 text-[#9A9A9A]">{{ company.phone }}</span>
                  </td>
                  <td class="border-b border-l border-[#F0F0F0] px-3 py-3 text-[#3559E0] tabular-nums whitespace-nowrap">{{ company.serviceDays }} 天</td>
                  <td class="w-full border-b border-l border-[#F0F0F0] px-3 py-3 text-[#6E6E6E] whitespace-nowrap">{{ company.note }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="px-3 py-3 text-[13px] text-[#9B9B9B]">
              显示 30 条企业记录，支持按企业名称、法人信息、服务剩余时长进行筛选与排序。
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
