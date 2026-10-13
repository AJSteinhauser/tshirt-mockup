import { useEffect, useRef, useState } from 'react'

const NEAR_VIEW_MARGIN = '600px'
export const SCROLL_ROOT_SELECTOR = '[data-scroll-root]'

const observersByRoot = new WeakMap()

function observerFor(root) {
  const key = root ?? window
  let entry = observersByRoot.get(key)
  if (!entry) {
    const callbacks = new Map()
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => callbacks.get(e.target)?.(e.isIntersecting)),
      { root, rootMargin: NEAR_VIEW_MARGIN }
    )
    entry = { observer, callbacks }
    observersByRoot.set(key, entry)
  }
  return entry
}

export function watchNearView(el, root, onChange) {
  const { observer, callbacks } = observerFor(root)
  callbacks.set(el, onChange)
  observer.observe(el)
  return () => {
    callbacks.delete(el)
    observer.unobserve(el)
  }
}

export function useNearView() {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    return watchNearView(el, el.closest(SCROLL_ROOT_SELECTOR), (near) => near && setSeen(true))
  }, [seen])

  return [ref, seen]
}
