import { ReactNode, useRef, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Hand } from 'lucide-react'
import { useFarmStore } from '../store/farmStore'

export function TouchControls() {
  const [isTouch] = useState(() => {
    if (typeof window === 'undefined') return false
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    return Boolean(coarse || touch)
  })

  if (!isTouch) return null
  return (
    <div className="touch-ui" onContextMenu={(e) => e.preventDefault()}>
      <div className="dpad">
        <span />
        <PadBtn f={1} s={0} label="up">
          <ChevronUp size={30} />
        </PadBtn>
        <span />
        <PadBtn f={0} s={-1} label="left">
          <ChevronLeft size={30} />
        </PadBtn>
        <PadBtn f={-1} s={0} label="down">
          <ChevronDown size={30} />
        </PadBtn>
        <PadBtn f={0} s={1} label="right">
          <ChevronRight size={30} />
        </PadBtn>
      </div>
      <button
        className="action-btn"
        onPointerDown={(e) => {
          e.preventDefault()
          useFarmStore.getState().interactNearest()
        }}
        aria-label="ทำแปลงใกล้สุด"
      >
        <Hand size={34} />
      </button>
    </div>
  )
}

function PadBtn({
  f,
  s,
  label,
  children,
}: {
  f: number
  s: number
  label: string
  children: ReactNode
}) {
  const pressed = useRef(false)
  const set = (on: boolean) => {
    if (on === pressed.current) return
    pressed.current = on
    const st = useFarmStore.getState()
    const cur = st.touchMove
    st.setTouchMove(cur.f + (on ? f : -f), cur.s + (on ? s : -s))
  }
  return (
    <button
      className="dpad-btn"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture?.(e.pointerId)
        set(true)
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        set(false)
      }}
      onPointerCancel={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}
