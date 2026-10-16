import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
let currentTimestamp = typeof Date !== 'undefined' ? Date.now() : 0
let timerId: ReturnType<typeof setInterval> | null = null

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  if (!timerId && typeof setInterval !== 'undefined') {
    timerId = setInterval(() => {
      currentTimestamp = Date.now()
      for (const listener of listeners) {
        listener()
      }
    }, 500)
  }
  return () => {
    listeners.delete(callback)
    if (listeners.size === 0 && timerId) {
      clearInterval(timerId)
      timerId = null
    }
  }
}

function getSnapshot(): number {
  return currentTimestamp
}

function getServerSnapshot(): number {
  return 0
}

/**
 * React-compiler safe hook that subscribes to the current clock time
 * without violating purity or triggering set-state-in-effect warnings.
 */
export function useCurrentTime(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
