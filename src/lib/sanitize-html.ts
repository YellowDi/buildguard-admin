const ALLOWED_RICH_TEXT_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "u",
  "ul",
])

const REMOVED_RICH_TEXT_TAGS = new Set([
  "iframe",
  "link",
  "meta",
  "object",
  "script",
  "style",
  "svg",
])

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"])
const SAFE_IMAGE_PROTOCOLS = new Set(["http:", "https:"])

export function sanitizeRichTextHtml(value: string) {
  const html = value.trim()

  if (!html) {
    return ""
  }

  if (typeof document === "undefined") {
    return escapeHtml(html)
  }

  const template = document.createElement("template")
  template.innerHTML = html
  sanitizeRichTextNode(template.content)

  return template.innerHTML
}

export function isSafeRichTextLinkUrl(value: string) {
  return isSafeUrl(value, SAFE_LINK_PROTOCOLS)
}

export function isSafeRichTextImageUrl(value: string) {
  return isSafeUrl(value, SAFE_IMAGE_PROTOCOLS)
}

function sanitizeRichTextNode(parent: ParentNode) {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove()
      continue
    }

    if (!(node instanceof HTMLElement)) {
      continue
    }

    const tagName = node.tagName.toLowerCase()

    if (REMOVED_RICH_TEXT_TAGS.has(tagName)) {
      node.remove()
      continue
    }

    if (!ALLOWED_RICH_TEXT_TAGS.has(tagName)) {
      node.replaceWith(...Array.from(node.childNodes))
      sanitizeRichTextNode(parent)
      continue
    }

    sanitizeRichTextElement(node, tagName)
    sanitizeRichTextNode(node)
  }
}

function sanitizeRichTextElement(element: HTMLElement, tagName: string) {
  const href = element instanceof HTMLAnchorElement ? element.getAttribute("href") ?? "" : ""
  const src = element instanceof HTMLImageElement ? element.getAttribute("src") ?? "" : ""
  const alt = element instanceof HTMLImageElement ? element.getAttribute("alt") ?? "" : ""

  for (const attribute of Array.from(element.attributes)) {
    element.removeAttribute(attribute.name)
  }

  if (tagName === "a" && element instanceof HTMLAnchorElement) {
    if (isSafeRichTextLinkUrl(href)) {
      element.setAttribute("href", href.trim())
      element.setAttribute("target", "_blank")
      element.setAttribute("rel", "noopener noreferrer")
    }
    return
  }

  if (tagName === "img" && element instanceof HTMLImageElement) {
    if (!isSafeRichTextImageUrl(src)) {
      element.remove()
      return
    }

    element.setAttribute("src", src.trim())
    element.setAttribute("alt", alt.trim())
    element.setAttribute("loading", "lazy")
  }
}

function isSafeUrl(value: string, allowedProtocols: Set<string>) {
  const normalized = value.trim()

  if (!normalized) {
    return false
  }

  const compact = normalized.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase()

  if (
    compact.startsWith("javascript:")
    || compact.startsWith("data:")
    || compact.startsWith("vbscript:")
  ) {
    return false
  }

  try {
    const parsed = new URL(normalized, getUrlBase())
    return allowedProtocols.has(parsed.protocol)
  } catch {
    return false
  }
}

function getUrlBase() {
  return typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://buildguard.local"
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
