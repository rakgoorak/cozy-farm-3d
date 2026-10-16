// ระบบสังเคราะห์เสียง Cute 8-bit / Cozy ด้วย Web Audio API ล้วน 100%
let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = typeof window !== 'undefined' && localStorage.getItem('cozy-farm-muted') === '1'

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
    master = ctx.createGain()
    master.gain.value = 0.35
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  return ctx
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(m: boolean): void {
  muted = !!m
  if (typeof window !== 'undefined') {
    localStorage.setItem('cozy-farm-muted', muted ? '1' : '0')
  }
}

interface ToneOptions {
  type?: OscillatorType
  dur?: number
  vol?: number
  at?: number
  slide?: number
}

function tone(
  freq: number,
  { type = 'sine', dur = 0.12, vol = 1, at = 0, slide = 0 }: ToneOptions = {},
): void {
  if (muted) return
  const c = ac()
  if (!c || !master) return
  const t0 = c.currentTime + at
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slide) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur)
  }
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function splash(dur = 0.3, vol = 0.5): void {
  if (muted) return
  const c = ac()
  if (!c || !master) return
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 1800
  const g = c.createGain()
  g.gain.value = vol
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start()
}

export const sfx = {
  click(): void {
    tone(660, { type: 'square', dur: 0.06, vol: 0.25 })
  },
  till(): void {
    tone(140, { type: 'square', dur: 0.1, vol: 0.5, slide: -40 })
    tone(95, { type: 'triangle', dur: 0.14, vol: 0.5, at: 0.07 })
  },
  plant(): void {
    tone(520, { type: 'sine', dur: 0.09, vol: 0.6, slide: 160 })
  },
  water(): void {
    splash(0.35, 0.5)
    tone(900, { type: 'sine', dur: 0.2, vol: 0.15, slide: -500 })
  },
  harvest(): void {
    ;[523, 659, 784, 1047].forEach((f, i) =>
      tone(f, { type: 'square', dur: 0.11, vol: 0.3, at: i * 0.07 }),
    )
  },
  coin(): void {
    tone(988, { type: 'square', dur: 0.08, vol: 0.3 })
    tone(1319, { type: 'square', dur: 0.16, vol: 0.3, at: 0.08 })
  },
  error(): void {
    tone(180, { type: 'sawtooth', dur: 0.16, vol: 0.35, slide: -60 })
  },
  step(): void {
    tone(220 + Math.random() * 60, { type: 'triangle', dur: 0.045, vol: 0.12 })
  },
  mature(): void {
    ;[784, 988].forEach((f, i) => tone(f, { type: 'sine', dur: 0.14, vol: 0.35, at: i * 0.09 }))
  },
  levelup(): void {
    ;[523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone(f, { type: 'square', dur: 0.13, vol: 0.28, at: i * 0.09 }),
    )
  },
  order(): void {
    ;[880, 1108, 1318, 1760].forEach((f, i) =>
      tone(f, { type: 'triangle', dur: 0.12, vol: 0.4, at: i * 0.06 }),
    )
  },
  place(): void {
    tone(220, { type: 'triangle', dur: 0.1, vol: 0.5, slide: -80 })
    tone(330, { type: 'sine', dur: 0.12, vol: 0.4, at: 0.08 })
  },
  pop(): void {
    tone(700 + Math.random() * 300, { type: 'sine', dur: 0.08, vol: 0.35, slide: 250 })
  },
  chop(): void {
    tone(190, { type: 'triangle', dur: 0.09, vol: 0.55, slide: -90 })
    tone(120, { type: 'square', dur: 0.07, vol: 0.35, at: 0.04 })
  },
  mine(): void {
    tone(1250, { type: 'triangle', dur: 0.08, vol: 0.4, slide: 300 })
    tone(1680, { type: 'sine', dur: 0.12, vol: 0.3, at: 0.04 })
  },
  cast(): void {
    tone(420, { type: 'sine', dur: 0.18, vol: 0.35, slide: 380 })
    setTimeout(() => splash(0.22, 0.35), 160)
  },
  bite(): void {
    splash(0.4, 0.65)
    tone(880, { type: 'square', dur: 0.1, vol: 0.45 })
    tone(1175, { type: 'square', dur: 0.14, vol: 0.45, at: 0.1 })
  },
  cook(): void {
    splash(0.25, 0.3)
    ;[587, 740, 880, 1175].forEach((f, i) =>
      tone(f, { type: 'triangle', dur: 0.12, vol: 0.35, at: i * 0.08 }),
    )
  },
  chat(): void {
    tone(740, { type: 'sine', dur: 0.07, vol: 0.25, slide: 180 })
  },
}
