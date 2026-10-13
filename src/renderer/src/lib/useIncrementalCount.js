import { useEffect, useState } from 'react'
import { SCROLL_ROOT_SELECTOR, watchNearView } from './nearView.js'

export function useIncrementalCount(total, { pageSize, resetKey, rootSelector = SCROLL_ROOT_SELECTOR }) {
  const [count, setCount] = useState(pageSize)
  const [sentinel, setSentinel] = useState(null)
  const shown = Math.min(count, total)

  useEffect(() => {
    setCount(pageSize)
  }, [resetKey, pageSize])

  useEffect(() => {
    if (!sentinel) return
    return watchNearView(sentinel, sentinel.closest(rootSelector), (near) => {
      if (near) setCount((c) => c + pageSize)
    })
  }, [sentinel, shown, pageSize, rootSelector])

  return { shown, hasMore: shown < total, sentinelRef: setSentinel }
}
