import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Sheet } from "./Sheet.vue"
export { default as SheetClose } from "./SheetClose.vue"
export { default as SheetContent } from "./SheetContent.vue"
export { default as SheetDescription } from "./SheetDescription.vue"
export { default as SheetFooter } from "./SheetFooter.vue"
export { default as SheetHeader } from "./SheetHeader.vue"
export { default as SheetTitle } from "./SheetTitle.vue"
export { default as SheetTrigger } from "./SheetTrigger.vue"

export const sheetVariants = cva(
  "fixed z-50 bg-background shadow-[var(--shadow-card)]",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
            "inset-x-0 bottom-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
            "sheet-panel-right top-2 right-2 bottom-2 w-3/4 max-w-[calc(100vw-1rem)] rounded-2xl sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
)

export type SheetVariants = VariantProps<typeof sheetVariants>
