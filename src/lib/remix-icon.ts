export function toRemixFillIcon(icon: string) {
  return icon.replace(/(^|\s)(ri-[\w-]+)-line(?=\s|$)/g, "$1$2-fill")
}
