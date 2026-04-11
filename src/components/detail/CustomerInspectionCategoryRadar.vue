<script setup lang="ts">
import { computed } from "vue"

import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  labels: string[]
  values: number[]
  loading?: boolean
  emptyText?: string
  /** 用于区分「无建筑」与「真实全 0 分」 */
  hasBuildings?: boolean
}>(), {
  loading: false,
  emptyText: "暂无数据",
  hasBuildings: true,
})

const RADAR_MAX = 100
const RING_TICKS = [0, 50, 100] as const

const viewSize = 280
const cx = viewSize / 2
const cy = viewSize / 2
const maxR = 100
const pad = 48
const totalSvg = viewSize + pad * 2

/**
 * 非对称纵向裁剪：对称裁切时，图形在 viewBox 内视觉上「上松下紧」，底部留白明显大于顶部。
 * 顶部略多裁、底部多裁，收紧可视区域下边，使上下留白更接近。
 */
const VIEWBOX_TRIM_TOP = 26
const VIEWBOX_TRIM_BOTTOM = 46
const viewBoxMinY = VIEWBOX_TRIM_TOP
const viewBoxHeight = totalSvg - VIEWBOX_TRIM_TOP - VIEWBOX_TRIM_BOTTOM
const svgViewBox = `0 ${viewBoxMinY} ${totalSvg} ${viewBoxHeight}`

const n = computed(() => Math.min(props.labels.length, props.values.length))

const angles = computed(() => {
  const count = n.value
  if (count === 0) {
    return []
  }

  return Array.from(
    { length: count },
    (_, i) => -Math.PI / 2 + (2 * Math.PI * i) / count,
  )
})

/** 刻度数字位置：沿过图心的竖直线 x = cx 排列（仅标注，不单独画轴线） */
const SCALE_AXIS_ANGLE = -Math.PI / 2

function radiusForValue(value: number) {
  const clamped = Math.max(0, Math.min(RADAR_MAX, value))
  return (clamped / RADAR_MAX) * maxR
}

const gridPolygonPoints = computed(() => {
  const count = n.value
  if (count === 0) {
    return []
  }

  return RING_TICKS.filter(tick => tick > 0).map((tick) => {
    const r = (tick / RADAR_MAX) * maxR
    return angles.value.map((angle) => {
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    }).join(" ")
  })
})

const dataPolygonPoints = computed(() => {
  const count = n.value
  if (count === 0) {
    return ""
  }

  return angles.value
    .map((angle, i) => {
      const v = props.values[i] ?? 0
      const r = radiusForValue(v)
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
})

const axisLines = computed(() => {
  return angles.value.map((angle) => ({
    x2: cx + maxR * Math.cos(angle),
    y2: cy + maxR * Math.sin(angle),
  }))
})

/**
 * 最外圈（半径 maxR）到标签「靠图形一侧」的固定间隙（px）。
 * 锚点放在该圆周上，再按象限把标签内侧边对齐到锚点，避免「以块中心定位」导致长短文案到图形的距离不一致。
 */
const LABEL_INNER_GAP_PX = 10
/** 上侧弧段（sin θ<0）标签略向外推，增大弧向间距，减轻「正上」附近挤压 */
const LABEL_TOP_RADIAL_EXTRA_PX = 10

function labelTransformForInnerEdgeAlign(angle: number) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const absCos = Math.abs(cos)
  const absSin = Math.abs(sin)

  // 偏左/右（|cos|≥|sin|）：内侧为左缘或右缘中点
  if (absCos >= absSin) {
    return cos >= 0 ? "translate(0, -50%)" : "translate(-100%, -50%)"
  }

  // 偏上/下（|sin|>|cos|）
  const nearVerticalAxis = absCos < 1e-5

  if (sin < 0) {
    // 标签在图上方：靠图心一侧为底边 —— 右上弧用底边左角对齐锚点，左上弧用底边右角，正顶用底边中点
    if (nearVerticalAxis) {
      return "translate(-50%, -100%)"
    }
    return cos > 0 ? "translate(0, -100%)" : "translate(-100%, -100%)"
  }

  // 标签在图下方：靠图心一侧为顶边
  if (nearVerticalAxis) {
    return "translate(-50%, 0)"
  }
  return cos > 0 ? "translate(0, 0)" : "translate(-100%, 0)"
}

/**
 * 仅在下侧弧段（sin θ>0 且偏上/下轴）做切向交错，缓解底部相邻标签横向重叠。
 * 上侧（sin θ≤0）不再加位移，避免加重正上方维度的挤压。
 */
const LABEL_TANGENT_STAGGER_PX = 16

function labelTangentStaggerPx(angle: number, index: number) {
  const absCos = Math.abs(Math.cos(angle))
  const absSin = Math.abs(Math.sin(angle))

  if (absSin < absCos || Math.sin(angle) <= 0) {
    return { dx: 0, dy: 0 }
  }

  const sign = index % 2 === 0 ? 1 : -1
  const s = LABEL_TANGENT_STAGGER_PX * sign
  return {
    dx: -Math.sin(angle) * s,
    dy: Math.cos(angle) * s,
  }
}

function buildLabelTransform(angle: number, index: number) {
  const base = labelTransformForInnerEdgeAlign(angle)
  const { dx, dy } = labelTangentStaggerPx(angle, index)

  if (dx === 0 && dy === 0) {
    return base
  }

  return `${base} translate(${dx}px, ${dy}px)`
}

const labelOverlays = computed(() => {
  return angles.value.map((angle, i) => {
    const radialExtra = Math.sin(angle) < 0 ? LABEL_TOP_RADIAL_EXTRA_PX : 0
    const rInner = maxR + LABEL_INNER_GAP_PX + radialExtra
    const ix = cx + rInner * Math.cos(angle)
    const iy = cy + rInner * Math.sin(angle)
    const gx = pad + ix
    const gy = pad + iy
    const score = Math.round(props.values[i] ?? 0)
    return {
      key: `${i}-${props.labels[i] ?? ""}`,
      leftPct: (gx / totalSvg) * 100,
      topPct: ((gy - viewBoxMinY) / viewBoxHeight) * 100,
      transform: buildLabelTransform(angle, i),
      label: props.labels[i] ?? "",
      score,
      showInfoHint: score === 0,
    }
  })
})

const scaleTickSvg = computed(() => {
  const cos = Math.cos(SCALE_AXIS_ANGLE)
  const sin = Math.sin(SCALE_AXIS_ANGLE)

  return RING_TICKS.map((tick) => {
    if (tick === 0) {
      return {
        tick,
        x: cx + 10 * cos,
        y: cy + 10 * sin + 4,
      }
    }

    const r = (tick / RADAR_MAX) * maxR + 6
    return {
      tick,
      x: cx + r * cos,
      y: cy + r * sin,
    }
  })
})

const showEmpty = computed(() => (
  !props.loading && (n.value === 0 || props.labels.length === 0)
))

const showNoBuildingsHint = computed(() => (
  !props.loading && n.value > 0 && !props.hasBuildings
))

function scorePillClass(score: number) {
  if (score === 0 || score < 50) {
    return "bg-warning-surface text-warning-foreground"
  }

  return "bg-surface-tertiary text-foreground"
}
</script>

<template>
  <div class="w-full min-w-0">
    <div class="detail-section-heading-row detail-section-inset pt-4 pb-1">
      <h2 class="detail-field-section__heading">
        建筑平均分
      </h2>
    </div>

    <div v-if="loading" class="flex min-h-0 items-center justify-center py-8">
      <Skeleton
        class="h-auto w-full max-w-[340px] rounded-2xl"
        :style="{ aspectRatio: `${totalSvg} / ${viewBoxHeight}` }"
      />
    </div>

    <div
      v-else-if="showEmpty"
      class="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-surface-tertiary/80 px-4 py-10 text-center text-sm text-muted-foreground"
    >
      {{ emptyText }}
    </div>

    <TooltipProvider v-else :delay-duration="200">
      <div class="relative mx-auto w-full max-w-[420px] overflow-visible">
        <svg
          class="h-auto w-full max-w-full select-none"
          :viewBox="svgViewBox"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          :aria-label="`建筑平均分雷达图，${n} 个维度`"
        >
          <g :transform="`translate(${pad}, ${pad})`">
            <!-- 网格：浅灰同心多边形 + 放射轴 -->
            <polygon
              v-for="(points, ringIndex) in gridPolygonPoints"
              :key="`ring-${ringIndex}`"
              :points="points"
              fill="none"
              :stroke="ringIndex === gridPolygonPoints.length - 1 ? 'var(--chart-axis)' : 'var(--chart-grid)'"
              stroke-width="1"
            />

            <line
              v-for="(line, i) in axisLines"
              :key="`axis-${i}`"
              :x1="cx"
              :y1="cy"
              :x2="line.x2"
              :y2="line.y2"
              stroke="var(--chart-grid)"
              stroke-width="1"
            />

            <!-- 数据区：中蓝描边 + 浅蓝填充（对齐设计稿） -->
            <polygon
              v-if="dataPolygonPoints"
              :points="dataPolygonPoints"
              fill="var(--brand-surface)"
              stroke="var(--brand)"
              stroke-width="1.75"
              stroke-linejoin="round"
              fill-opacity="0.45"
            />

            <!-- 刻度：0 / 50 / 100（沿竖直方向 x = cx，不额外绘制轴线） -->
            <text
              v-for="pos in scaleTickSvg"
              :key="`tick-${pos.tick}`"
              :x="pos.x"
              :y="pos.y"
              fill="var(--chart-point)"
              text-anchor="middle"
              font-size="11"
              font-weight="500"
            >
              {{ pos.tick }}
            </text>
          </g>
        </svg>

        <!-- 分类名 + 分值胶囊（设计稿：标签在外侧，数值为圆角 pill） -->
        <div
          v-for="item in labelOverlays"
          :key="item.key"
          class="pointer-events-none absolute z-0 flex w-max flex-col items-center gap-1 text-center"
          :style="{
            left: `${item.leftPct}%`,
            top: `${item.topPct}%`,
            transform: item.transform,
          }"
        >
          <div class="pointer-events-auto flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center">
            <span
              class="shrink-0 whitespace-nowrap text-center text-[13px] font-medium leading-tight text-foreground"
              :title="item.label"
            >
              {{ item.label }}
            </span>
            <div class="flex items-center gap-1">
              <span
                :class="cn(
                  'inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                  scorePillClass(item.score),
                )"
              >
                {{ item.score }}
              </span>
              <Tooltip v-if="item.showInfoHint">
                <TooltipTrigger as-child>
                  <button
                    type="button"
                    class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[10px] font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    aria-label="得分说明"
                  >
                    i
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  class="max-w-[220px] border border-border bg-popover px-3 py-2 text-xs font-normal text-popover-foreground shadow-(--shadow-deep)"
                >
                  该分类平均得分为 0，请结合现场检测与工单记录确认是否存在漏检或未覆盖项。
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      <p v-if="showNoBuildingsHint" class="mt-4 text-center text-xs text-muted-foreground">
        当前客户下暂无建筑资产，各分类按 0 分展示。
      </p>
    </TooltipProvider>
  </div>
</template>
