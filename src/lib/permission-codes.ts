/**
 * Button permission codes from /bqi/sys/button/list.
 * Keep values aligned with backend metadata; add entries as pages are wired.
 */
export const PERMISSION_CODES = {
} as const

export type PermissionCode = (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES]
