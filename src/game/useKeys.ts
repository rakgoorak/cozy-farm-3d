import { useEffect, useRef } from 'react'
import { useFarmStore } from '../store/farmStore'
import { ToolId } from './constants'
import { sfx } from './sounds'

function normalizeMoveKey(e: KeyboardEvent): string | null {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      return 'up'
    case 'KeyS':
    case 'ArrowDown':
      return 'down'
    case 'KeyA':
    case 'ArrowLeft':
      return 'left'
    case 'KeyD':
    case 'ArrowRight':
      return 'right'
    default: {
      const k = e.key.toLowerCase()
      if (k === 'w' || k === 'arrowup' || k === 'ไ') return 'up'
      if (k === 's' || k === 'arrowdown' || k === 'ห') return 'down'
      if (k === 'a' || k === 'arrowleft' || k === 'ฟ') return 'left'
      if (k === 'd' || k === 'arrowright' || k === 'ก') return 'right'
      return null
    }
  }
}

export function useKeys() {
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const dir = normalizeMoveKey(e)
      if (dir) {
        keys.current[dir] = true
        if (e.code.startsWith('Arrow')) {
          e.preventDefault()
        }
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      const dir = normalizeMoveKey(e)
      if (dir) {
        keys.current[dir] = false
      }
    }
    const blur = () => {
      keys.current = {}
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  return keys
}

const CODE_TO_TOOL: Record<string, ToolId> = {
  KeyQ: 'auto',
  Digit0: 'auto',
  Backquote: 'auto',
  Digit1: 'hoe',
  Numpad1: 'hoe',
  Digit2: 'water',
  Numpad2: 'water',
  Digit3: 'seed-carrot',
  Numpad3: 'seed-carrot',
  Digit4: 'seed-tomato',
  Numpad4: 'seed-tomato',
  Digit5: 'seed-pumpkin',
  Numpad5: 'seed-pumpkin',
  Digit6: 'harvest',
  Numpad6: 'harvest',
  Digit7: 'seed-strawberry',
  Numpad7: 'seed-strawberry',
  Digit8: 'seed-goldmelon',
  Numpad8: 'seed-goldmelon',
}

// ปุ่มลัด: รองรับทั้ง e.code และ e.key (ใช้ได้แม้คีย์บอร์ดติดภาษาไทย)
export function useHotkeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useFarmStore.getState()
      if (e.code in CODE_TO_TOOL) {
        st.setTool(CODE_TO_TOOL[e.code])
        sfx.click()
        return
      }
      if (e.code === 'Space' || e.code === 'KeyE' || e.key === ' ' || e.key.toLowerCase() === 'e') {
        e.preventDefault()
        st.interactNearest()
      } else if (e.code === 'KeyM' || e.key.toLowerCase() === 'm') {
        st.toggleMute()
      } else if ((e.code === 'Escape' || e.key === 'Escape') && st.shopOpen) {
        st.setShopOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
