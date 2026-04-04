<script setup lang="ts">
import { computed } from "vue"

import TablePageLoading from "@/components/loading/TablePageLoading.vue"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

type CustomerDetailLoadingVariant =
  | "basic-info-primary"
  | "basic-info-secondary"
  | "building-assets"
  | "work-orders"
  | "monitoring"
  | "sub-accounts"

const props = defineProps<{
  variant: CustomerDetailLoadingVariant
}>()

const tableConfig = computed(() => {
  switch (props.variant) {
    case "building-assets":
      return {
        columnsTemplate: "3rem minmax(14rem,1.3fr) minmax(12rem,1.05fr) minmax(16rem,1.6fr) minmax(10rem,0.9fr) minmax(10rem,0.9fr) minmax(8rem,0.75fr) minmax(10rem,0.9fr)",
        columnCount: 8,
      }
    case "work-orders":
      return {
        columnsTemplate: "3rem minmax(12rem,1.1fr) minmax(12rem,1fr) minmax(11rem,1fr) minmax(10rem,0.9fr) minmax(8rem,0.8fr) minmax(7rem,0.7fr) minmax(7rem,0.7fr) minmax(7rem,0.7fr) minmax(10rem,0.85fr) minmax(14rem,1.2fr)",
        columnCount: 11,
      }
    case "monitoring":
      return {
        columnsTemplate: "3rem minmax(12rem,1.15fr) minmax(8rem,0.75fr) minmax(11rem,1fr) minmax(12rem,1fr) minmax(10rem,0.9fr) minmax(10rem,0.9fr)",
        columnCount: 7,
      }
    default:
      return null
  }
})
</script>

<template>
  <div v-if="props.variant === 'basic-info-primary'" class="space-y-5 pb-5">
    <div class="detail-field-sections">
      <section class="detail-field-section">
        <div class="detail-section-heading-row detail-section-inset">
          <Skeleton class="h-5 w-20" />
        </div>
        <div>
          <div class="detail-field-row">
            <div class="detail-field-row__label"><Skeleton class="h-4 w-16" /></div>
            <div class="detail-field-row__value"><Skeleton class="h-4 w-56 max-w-full" /></div>
          </div>
          <div class="detail-field-row">
            <div class="detail-field-row__label"><Skeleton class="h-4 w-14" /></div>
            <div class="detail-field-row__value"><Skeleton class="h-4 w-36 max-w-full" /></div>
          </div>
          <div class="detail-field-row items-start">
            <div class="detail-field-row__label pt-2"><Skeleton class="h-4 w-20" /></div>
            <div class="detail-field-row__value"><Skeleton class="h-28 w-44 max-w-full rounded-md" /></div>
          </div>
          <div class="detail-field-row">
            <div class="detail-field-row__label"><Skeleton class="h-4 w-16" /></div>
            <div class="detail-field-row__value"><Skeleton class="h-4 w-48 max-w-full" /></div>
          </div>
          <div class="detail-field-row items-start">
            <div class="detail-field-row__label pt-2"><Skeleton class="h-4 w-16" /></div>
            <div class="detail-field-row__value"><Skeleton class="h-12 w-full max-w-xl rounded-md" /></div>
          </div>
          <div class="detail-field-row items-start">
            <div class="detail-field-row__label pt-2"><Skeleton class="h-4 w-16" /></div>
            <div class="detail-field-row__value"><Skeleton class="h-14 w-full max-w-xl rounded-md" /></div>
          </div>
        </div>
      </section>

      <Separator class="bg-border/80" />

      <section class="detail-field-section detail-field-section--after-separator">
        <div class="detail-section-heading-row detail-section-inset">
          <Skeleton class="h-5 w-24" />
        </div>
        <div>
          <div
            v-for="index in 3"
            :key="`contact-skeleton-${index}`"
            class="detail-field-row"
          >
            <div class="detail-field-row__label"><Skeleton class="h-4 w-20" /></div>
            <div class="detail-field-row__value">
              <div class="flex flex-wrap items-center gap-3">
                <Skeleton class="h-4 w-24" />
                <Skeleton class="h-4 w-28" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator class="bg-border/80" />

      <section class="detail-field-section detail-field-section--after-separator">
        <div class="detail-section-heading-row detail-section-inset">
          <Skeleton class="h-5 w-24" />
        </div>
        <div>
          <div
            v-for="index in 4"
            :key="`package-skeleton-${index}`"
            class="detail-field-row"
          >
            <div class="detail-field-row__label"><Skeleton class="h-4 w-20" /></div>
            <div class="detail-field-row__value">
              <Skeleton :class="['h-4 max-w-full', index === 1 ? 'w-48' : index === 2 ? 'w-40' : index === 3 ? 'w-36' : 'w-44']" />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>

  <div v-else-if="props.variant === 'basic-info-secondary'" class="pb-5">
    <section class="detail-accordion-module min-w-0">
      <div class="detail-section-heading-row detail-section-inset flex items-center gap-2">
        <Skeleton class="h-5 w-36" />
        <Skeleton class="h-5 w-6 rounded-md" />
      </div>

      <div v-for="index in 2" :key="`park-building-skeleton-${index}`">
        <div class="detail-section-inset flex items-center gap-3 py-4">
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-2">
              <Skeleton class="h-4 w-4" />
              <Skeleton class="h-4 w-28" />
              <Skeleton class="h-4 w-16" />
            </div>
          </div>
          <div class="ml-auto flex shrink-0 gap-2">
            <Skeleton class="h-8 w-20 rounded-md" />
            <Skeleton class="h-8 w-20 rounded-md" />
          </div>
        </div>

        <div class="pb-4">
          <div class="detail-field-sections">
            <section class="detail-field-section !pb-0 !pt-0">
              <div>
                <div
                  v-for="row in 3"
                  :key="`park-building-skeleton-${index}-row-${row}`"
                  class="detail-field-row"
                >
                  <div class="detail-field-row__label"><Skeleton class="h-4 w-20" /></div>
                  <div class="detail-field-row__value">
                    <Skeleton :class="['h-4 max-w-full', row === 1 ? 'w-40' : row === 2 ? 'w-32' : 'w-full']" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="detail-relation-module min-w-0 px-1">
            <div class="detail-table-scroll">
              <div class="detail-table-frame detail-relation-frame">
                <div class="detail-group-stack">
                  <div class="detail-group-divider-row detail-section-inset flex items-center gap-3">
                    <Skeleton class="h-4 w-16" />
                    <div class="h-px flex-1 bg-border/80" />
                  </div>

                  <div
                    v-for="row in 2"
                    :key="`park-building-inline-row-${index}-${row}`"
                    class="detail-relation-row detail-table-grid detail-section-inset items-center"
                    style="grid-template-columns: minmax(10rem,1.1fr) minmax(10rem,1fr) 2rem; column-gap: 0.75rem;"
                  >
                    <Skeleton class="h-4 w-5/6" />
                    <Skeleton class="h-4 w-3/4" />
                    <Skeleton class="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="index < 2"
          class="detail-section-inset"
        >
          <div class="w-full border-b border-dashed border-border/80" />
        </div>
      </div>
    </section>

    <div class="my-5 h-px bg-border/80" />

    <section class="detail-relation-module min-w-0">
      <div class="detail-table-scroll">
        <div class="detail-table-frame detail-relation-frame">
          <div
            class="detail-table-heading-row detail-table-grid detail-relation-grid detail-section-inset items-center"
            style="grid-template-columns: minmax(10rem,1.15fr) minmax(9rem,1fr) minmax(7rem,0.8fr) minmax(8rem,0.85fr) 2.5rem; column-gap: 0.75rem;"
          >
            <div class="flex min-w-0 items-center gap-2">
              <Skeleton class="h-5 w-32" />
              <Skeleton class="h-5 w-6 rounded-md" />
            </div>
            <Skeleton
              v-for="index in 4"
              :key="`maintenance-heading-${index}`"
              class="h-4 w-full"
            />
          </div>

          <div class="detail-group-stack">
            <div class="detail-group-divider-row detail-section-inset flex items-center gap-3">
              <Skeleton class="h-4 w-16" />
              <div class="h-px flex-1 bg-border/80" />
            </div>

            <div
              v-for="row in 4"
              :key="`maintenance-row-${row}`"
              class="detail-relation-row detail-table-grid detail-section-inset items-center"
              style="grid-template-columns: minmax(10rem,1.15fr) minmax(9rem,1fr) minmax(7rem,0.8fr) minmax(8rem,0.85fr) 2.5rem; column-gap: 0.75rem;"
            >
              <Skeleton class="h-4 w-5/6" />
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-4 w-2/3" />
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div v-else-if="props.variant === 'sub-accounts'" class="space-y-4 pb-5">
    <section class="space-y-3">
      <div class="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
        <Skeleton class="h-5 w-28" />
        <Skeleton class="mt-2 h-4 w-full max-w-xl" />
        <Skeleton class="mt-1 h-4 w-5/6 max-w-lg" />
      </div>
      <Skeleton class="h-4 w-full max-w-2xl" />
    </section>
  </div>

  <div
    v-else-if="tableConfig"
    class="flex min-h-0 flex-1 flex-col pb-5"
  >
    <TablePageLoading
      class="-mt-3 -mx-4 sm:-mx-8"
      :columns-template="tableConfig.columnsTemplate"
      :column-count="tableConfig.columnCount"
    />

    <div
      v-if="props.variant === 'work-orders'"
      class="mt-auto flex items-center justify-end gap-3 -mx-4 px-4 pt-4 sm:-mx-8 sm:px-8"
    >
      <Skeleton class="h-4 w-48" />
      <Skeleton class="h-9 w-20 rounded-md" />
      <Skeleton class="h-9 w-20 rounded-md" />
    </div>
  </div>
</template>
