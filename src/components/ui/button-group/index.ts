import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as ButtonGroup } from "./ButtonGroup.vue"
export { default as ButtonGroupSeparator } from "./ButtonGroupSeparator.vue"
export { default as ButtonGroupText } from "./ButtonGroupText.vue"

export const buttonGroupVariants = cva(
  [
    "inline-flex isolate w-fit rounded-md shadow-xs",
    "[&>*]:relative [&>*]:shadow-none [&>*]:focus-visible:z-10",
  ],
  {
    variants: {
      orientation: {
        horizontal:
          "flex-row [&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none",
        vertical:
          "flex-col [&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  },
)

export type ButtonGroupVariants = VariantProps<typeof buttonGroupVariants>
