export const NOTION_COLOR_NAMES = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const

export type StatusBadgeTone = typeof NOTION_COLOR_NAMES[number]

export type NotionColorRoleSet = {
  text: string
  background: string
  icon: string
}

export type NotionColorToken = {
  light: NotionColorRoleSet
  dark: NotionColorRoleSet
}

// Tokens sourced from the Matthias Frank Notion color reference tables.
export const notionColorTokens: Record<StatusBadgeTone, NotionColorToken> = {
  default: {
    light: { text: "#373530", background: "#FFFFFF", icon: "#55534E" },
    dark: { text: "#D4D4D4", background: "#191919", icon: "#D3D3D3" },
  },
  gray: {
    light: { text: "#787774", background: "#F1F1EF", icon: "#A6A299" },
    dark: { text: "#9B9B9B", background: "#252525", icon: "#7F7F7F" },
  },
  brown: {
    light: { text: "#976D57", background: "#F3EEEE", icon: "#9F6B53" },
    dark: { text: "#A27763", background: "#2E2724", icon: "#AA755F" },
  },
  orange: {
    light: { text: "#CC782F", background: "#F8ECDF", icon: "#D87620" },
    dark: { text: "#CB7B37", background: "#36291F", icon: "#D9730D" },
  },
  yellow: {
    light: { text: "#C29343", background: "#FAF3DD", icon: "#CB912F" },
    dark: { text: "#C19138", background: "#372E20", icon: "#CA8E1B" },
  },
  green: {
    light: { text: "#548164", background: "#EEF3ED", icon: "#448361" },
    dark: { text: "#4F9768", background: "#242B26", icon: "#2D9964" },
  },
  blue: {
    light: { text: "#487CA5", background: "#E9F3F7", icon: "#337EA9" },
    dark: { text: "#447ACB", background: "#1F282D", icon: "#2E7CD1" },
  },
  purple: {
    light: { text: "#8A67AB", background: "#F6F3F8", icon: "#9065B0" },
    dark: { text: "#865DBB", background: "#2A2430", icon: "#8D5BC1" },
  },
  pink: {
    light: { text: "#B35488", background: "#F9F2F5", icon: "#C14C8A" },
    dark: { text: "#BA4A78", background: "#2E2328", icon: "#C94079" },
  },
  red: {
    light: { text: "#C4554D", background: "#FAECEC", icon: "#D44C47" },
    dark: { text: "#BE524B", background: "#332523", icon: "#CD4945" },
  },
}
