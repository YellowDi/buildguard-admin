/**
 * Mock 数据：结构参考《国民经济行业分类》（GB/T 4754）及国家统计局公开目录中的「大类」与下属行业名称，仅用于前端联调与展示。
 * 正式环境应由接口返回；大类在业务上仅作分组，不作为客户可选值。
 */

export type IndustryMajorCategorySeed = {
  /** 国标大类代码（两位数字） */
  code: string
  /** 行业大类名称 */
  name: string
}

export type IndustryCategorySeed = {
  /** 对应大类的国标代码 */
  majorCode: string
  /** 具体行业名称（归类至该大类下，供客户选择） */
  name: string
}

/**
 * 行业大类（节选）：与国标目录中的大类条目对应，用于分组。
 */
export const MOCK_INDUSTRY_MAJORS: IndustryMajorCategorySeed[] = [
  { code: "01", name: "农业" },
  { code: "02", name: "林业" },
  { code: "03", name: "畜牧业" },
  { code: "04", name: "渔业" },
  { code: "05", name: "农、林、牧、渔专业及辅助性活动" },
  { code: "06", name: "煤炭开采和洗选业" },
  { code: "07", name: "石油和天然气开采业" },
  { code: "08", name: "黑色金属矿采选业" },
  { code: "13", name: "农副食品加工业" },
  { code: "14", name: "食品制造业" },
  { code: "15", name: "酒、饮料和精制茶制造业" },
  { code: "17", name: "纺织业" },
  { code: "25", name: "石油、煤炭及其他燃料加工业" },
  { code: "26", name: "化学原料和化学制品制造业" },
  { code: "27", name: "医药制造业" },
  { code: "35", name: "专用设备制造业" },
  { code: "36", name: "汽车制造业" },
  { code: "37", name: "铁路、船舶、航空航天和其他运输设备制造业" },
  { code: "38", name: "电气机械和器材制造业" },
  { code: "47", name: "房屋建筑业" },
  { code: "48", name: "土木工程建筑业" },
  { code: "49", name: "建筑安装业" },
  { code: "50", name: "建筑装饰、装修和其他建筑业" },
  { code: "51", name: "批发业" },
  { code: "52", name: "零售业" },
  { code: "53", name: "铁路运输业" },
  { code: "54", name: "道路运输业" },
  { code: "58", name: "互联网和相关服务" },
  { code: "59", name: "软件和信息技术服务业" },
  { code: "70", name: "房地产业" },
  { code: "72", name: "商务服务业" },
]

/**
 * 行业分类（节选）：具体行业名称归属至对应大类，供客户等业务场景选择。
 */
export const MOCK_INDUSTRY_CATEGORIES: IndustryCategorySeed[] = [
  { majorCode: "01", name: "谷物种植" },
  { majorCode: "01", name: "豆类、油料和薯类种植" },
  { majorCode: "01", name: "棉、麻、糖、烟草种植" },
  { majorCode: "01", name: "蔬菜、食用菌及园艺作物种植" },
  { majorCode: "02", name: "林木育种和育苗" },
  { majorCode: "02", name: "造林和更新" },
  { majorCode: "02", name: "森林经营、管护和改培" },
  { majorCode: "03", name: "牲畜饲养" },
  { majorCode: "03", name: "家禽饲养" },
  { majorCode: "04", name: "水产养殖" },
  { majorCode: "04", name: "水产捕捞" },
  { majorCode: "06", name: "烟煤和无烟煤开采洗选" },
  { majorCode: "06", name: "褐煤开采洗选" },
  { majorCode: "07", name: "石油开采" },
  { majorCode: "07", name: "天然气开采" },
  { majorCode: "13", name: "谷物磨制" },
  { majorCode: "13", name: "饲料加工" },
  { majorCode: "13", name: "植物油加工" },
  { majorCode: "14", name: "焙烤食品制造" },
  { majorCode: "14", name: "糖果、巧克力及蜜饯制造" },
  { majorCode: "15", name: "酒的制造" },
  { majorCode: "15", name: "精制茶加工" },
  { majorCode: "17", name: "棉纺织及印染精加工" },
  { majorCode: "17", name: "针织或钩针编织物及其制品制造" },
  { majorCode: "26", name: "基础化学原料制造" },
  { majorCode: "26", name: "肥料制造" },
  { majorCode: "27", name: "化学药品原料药制造" },
  { majorCode: "27", name: "生物药品制品制造" },
  { majorCode: "36", name: "汽车整车制造" },
  { majorCode: "36", name: "汽车零部件及配件制造" },
  { majorCode: "38", name: "电机制造" },
  { majorCode: "38", name: "输配电及控制设备制造" },
  { majorCode: "47", name: "住宅房屋建筑" },
  { majorCode: "48", name: "铁路、道路、隧道和桥梁工程建筑" },
  { majorCode: "51", name: "农、林、牧、渔产品批发" },
  { majorCode: "51", name: "食品、饮料及烟草制品批发" },
  { majorCode: "52", name: "综合零售" },
  { majorCode: "52", name: "食品、饮料及烟草制品专门零售" },
  { majorCode: "58", name: "互联网接入及相关服务" },
  { majorCode: "58", name: "互联网信息服务" },
  { majorCode: "59", name: "软件开发" },
  { majorCode: "59", name: "信息系统集成和物联网技术服务" },
  { majorCode: "70", name: "房地产开发经营" },
  { majorCode: "70", name: "物业管理" },
  { majorCode: "72", name: "组织管理服务" },
  { majorCode: "72", name: "咨询与调查" },
]

export function buildIndustryPresetsFromMock(): {
  majors: Array<{
    id: number
    code: string
    name: string
  }>
  categories: Array<{
    id: number
    majorCategoryId: number
    name: string
  }>
  nextMajorId: number
  nextCategoryId: number
} {
  const majors = MOCK_INDUSTRY_MAJORS.map((row, index) => ({
    id: index + 1,
    code: row.code,
    name: row.name,
  }))

  const codeToId = new Map(majors.map(m => [m.code, m.id]))

  const categories = MOCK_INDUSTRY_CATEGORIES.map((row, index) => {
    const majorCategoryId = codeToId.get(row.majorCode)
    if (majorCategoryId === undefined) {
      throw new Error(`Mock 数据错误：未找到大类代码 ${row.majorCode}`)
    }
    return {
      id: index + 1,
      majorCategoryId,
      name: row.name,
    }
  })

  return {
    majors,
    categories,
    nextMajorId: majors.length + 1,
    nextCategoryId: categories.length + 1,
  }
}
