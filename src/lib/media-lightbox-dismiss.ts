export function preventDismissForMediaLightbox(event: Event) {
  if (!isMediaLightboxEvent(event)) {
    return
  }

  event.preventDefault()
}

function isMediaLightboxEvent(event: Event) {
  const target = getEventTarget(event)
  return Boolean(target?.closest("[data-media-lightbox]"))
}

function getEventTarget(event: Event) {
  const detail = "detail" in event ? event.detail as { originalEvent?: Event } | undefined : undefined
  const originalEvent = detail?.originalEvent
  const target = originalEvent?.target ?? event.target

  return target instanceof Element ? target : null
}
