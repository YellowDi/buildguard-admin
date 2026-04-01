<!-- 轻量占位：仅 Tailwind，便于与主包一起打入且不阻塞首屏 -->
<template>
  <div class="w-full min-w-0" aria-busy="true" aria-live="polite">
    <div class="detail-section-heading-row detail-section-inset">
      <div class="h-6 w-28 max-w-[40%] animate-pulse rounded-md bg-muted/55" />
    </div>
    <div class="relative mx-auto mt-3 flex min-h-[200px] w-full max-w-[420px] items-center justify-center">
      <div
        class="h-[220px] w-full max-w-[360px] animate-pulse rounded-2xl bg-muted/30"
      />
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary"
          role="status"
        />
        <span class="sr-only">雷达图加载中</span>
      </div>
    </div>
  </div>
</template>
