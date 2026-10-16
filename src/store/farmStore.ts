import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  GRID_SIZE,
  CROPS,
  CROP_IDS,
  GOODS,
  FISHES,
  RECIPES,
  ALL_ITEMS,
  ANIMALS,
  FORAGE_SPOTS,
  RESPAWN_MS,
  DOCK_POS,
  KITCHEN_POS,
  PEN,
  INTERACT_DISTANCE,
  xpNeeded,
  plotPosition,
  neighbors3x3,
  CropId,
  AnimalId,
  UpgradeId,
  ToolId,
  PlotState,
  ProduceKey,
  DishId,
  OUTFIT_COLORS,
} from '../game/constants'
import { sfx, isMuted, setMuted } from '../game/sounds'

const SAVE_KEY = 'cozy-farm-save-v3'
let floaterId = 1
let orderId = 1
let fishingTimer: ReturnType<typeof setTimeout> | null = null
let fishingExpireTimer: ReturnType<typeof setTimeout> | null = null

export interface PlotData {
  id: number
  row: number
  col: number
  x: number
  z: number
  state: PlotState
  crop: CropId | null
  growth: number
  watered: boolean
  splashAt: number
  giant?: boolean
}

export interface OrderItem {
  crop: CropId
  need: number
}

export interface OrderData {
  id: number
  items: OrderItem[]
  reward: number
  xp: number
}

export interface AnimalInstance {
  id: number
  kind: AnimalId
  readyAt: number
  petAt?: number
}

export interface FloaterData {
  id: number
  x: number
  z: number
  text: string
  color: string
}

export interface UpgradesData {
  goldenHoe: boolean
  goldenWater: boolean
  speedBoots: boolean
  sprinklers: number[]
}

export interface ForageNodeState {
  hits: number
  respawnAt: number
  lastHitAt: number
}

export interface RemotePeerData {
  id: string
  name: string
  outfitId: string
  x: number
  z: number
  rotY: number
  moving: boolean
  acting: boolean
  emote: string | null
  emoteUntil: number
  updatedAt: number
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  at: number
}

export interface SharedSyncPayload {
  money: number
  seeds: Record<CropId, number>
  produce: Record<ProduceKey, number>
  plots: PlotData[]
  upgrades: UpgradesData
  animals: AnimalInstance[]
  level: number
  xp: number
  orders: OrderData[]
  forageNodes: Record<string, ForageNodeState>
}

export type InventoryProduce = Record<ProduceKey, number>

let syncBroadcaster: ((payload: SharedSyncPayload) => void) | null = null
export function registerSyncBroadcaster(fn: ((payload: SharedSyncPayload) => void) | null): void {
  syncBroadcaster = fn
}

function makeInitialPlots(): PlotData[] {
  const plots: PlotData[] = []
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const { x, z } = plotPosition(row, col)
      plots.push({
        id: row * GRID_SIZE + col,
        row,
        col,
        x,
        z,
        state: 'empty',
        crop: null,
        growth: 0,
        watered: false,
        splashAt: 0,
        giant: false,
      })
    }
  }
  return plots
}

function makeInitialProduce(): InventoryProduce {
  return {
    carrot: 0,
    tomato: 0,
    pumpkin: 0,
    strawberry: 0,
    goldmelon: 0,
    egg: 0,
    wool: 0,
    milk: 0,
    carp: 0,
    goldkoi: 0,
    treasure: 0,
    wood: 0,
    stone: 0,
    gem: 0,
    tomatoSoup: 0,
    pumpkinPie: 0,
    strawberryCake: 0,
    grilledFish: 0,
  }
}

function makeInitialForageNodes(): Record<string, ForageNodeState> {
  const map: Record<string, ForageNodeState> = {}
  for (const spot of FORAGE_SPOTS) {
    map[spot.id] = { hits: 0, respawnAt: 0, lastHitAt: 0 }
  }
  return map
}

function unlockedCrops(level: number): CropId[] {
  return CROP_IDS.filter((c) => CROPS[c].unlockLv <= level)
}

function makeOrder(level: number): OrderData {
  const pool = unlockedCrops(level)
  const nItems = 1 + (Math.random() < 0.55 ? 1 : 0)
  const items: OrderItem[] = []
  const used = new Set<CropId>()
  for (let i = 0; i < nItems; i++) {
    const crop = pool[Math.floor(Math.random() * pool.length)]
    if (used.has(crop) && pool.length > 1) continue
    used.add(crop)
    items.push({ crop, need: 2 + Math.floor(Math.random() * 3) })
  }
  const base = items.reduce((s, it) => s + it.need * CROPS[it.crop].sellPrice, 0)
  const totalN = items.reduce((s, it) => s + it.need, 0)
  return {
    id: orderId++,
    items,
    reward: Math.round(base * 1.5),
    xp: 15 + totalN * 10,
  }
}

function createPlayerId(): string {
  return 'p-' + Math.random().toString(36).slice(2, 9)
}

function freshState() {
  return {
    money: 120,
    seeds: { carrot: 5, tomato: 3, pumpkin: 2, strawberry: 0, goldmelon: 0 } as Record<
      CropId,
      number
    >,
    produce: makeInitialProduce(),
    plots: makeInitialPlots(),
    tool: 'auto' as ToolId,
    preferredSeed: 'carrot' as CropId,
    upgrades: {
      goldenHoe: false,
      goldenWater: false,
      speedBoots: false,
      sprinklers: [],
    } as UpgradesData,
    animals: [] as AnimalInstance[],
    level: 1,
    xp: 0,
    orders: [makeOrder(1), makeOrder(1), makeOrder(1)],
    day: 1,
    clockMin: 8 * 60,
    forageNodes: makeInitialForageNodes(),
  }
}

export interface FarmState {
  money: number
  seeds: Record<CropId, number>
  produce: InventoryProduce
  plots: PlotData[]
  tool: ToolId
  preferredSeed: CropId
  upgrades: UpgradesData
  animals: AnimalInstance[]
  level: number
  xp: number
  orders: OrderData[]
  day: number
  clockMin: number
  forageNodes: Record<string, ForageNodeState>

  // Player Profile & Co-op State
  playerId: string
  playerName: string
  outfitId: string
  roomCode: string | null
  coopOpen: boolean
  peers: Record<string, RemotePeerData>
  chatMessages: ChatMessage[]
  activeEmote: { text: string; until: number } | null

  // Transient UI/Scene state
  hint: string
  selectedPlotId: number | null
  hoverPlotId: number | null
  shopOpen: boolean
  cookOpen: boolean
  muted: boolean
  playerPos: { x: number; z: number }
  playerRotY: number
  playerMoving: boolean
  touchMove: { f: number; s: number }
  lastActAt: number
  lastHarvest: { at: number; crop: CropId; x: number; z: number; mature?: boolean } | null
  lastLevelUp: { at: number; level: number } | null
  lastOrder: { at: number } | null
  weather: { type: 'sunny' | 'rainy' }
  floaters: FloaterData[]
  fishing: { state: 'idle' | 'waiting' | 'bite'; biteAt: number }
  speedBuffUntil: number

  setPlayerTransform: (x: number, z: number, rotY: number, moving: boolean) => void
  setPlayerPos: (x: number, z: number) => void
  setTouchMove: (f: number, s: number) => void
  setHint: (hint: string, ms?: number) => void
  setTool: (tool: ToolId) => void
  setShopOpen: (open: boolean) => void
  setCookOpen: (open: boolean) => void
  setCoopOpen: (open: boolean) => void
  setHoverPlot: (id: number | null) => void
  setPlayerProfile: (name: string, outfitId: string) => void
  setRoomCode: (code: string | null) => void
  upsertPeer: (peer: RemotePeerData) => void
  removePeer: (peerId: string) => void
  clearPeers: () => void
  addChatMessage: (msg: ChatMessage) => void
  triggerEmote: (text: string) => void
  getSharedSnapshot: () => SharedSyncPayload
  applyRemoteSync: (payload: SharedSyncPayload) => void
  broadcastSync: () => void

  toggleMute: () => void
  tickTime: (dtMin?: number) => void
  rollWeather: () => void
  growthRate: () => number
  addXp: (n: number, at?: { x: number; z: number } | null) => void
  addFloater: (x: number, z: number, text: string, color?: string) => void
  tillPlot: (id: number) => boolean
  plantSeed: (id: number, crop: CropId) => boolean
  waterPlot: (id: number, silent?: boolean) => boolean
  autoIrrigate: () => void
  harvestPlot: (id: number) => boolean
  advanceGrowth: (id: number) => void
  resolveAction: (plot: PlotData) => string
  interactPlot: (id: number, force?: boolean) => boolean
  interactNearest: () => boolean
  buySeed: (crop: CropId, n?: number) => boolean
  buyUpgrade: (uid: UpgradeId) => boolean
  craftSprinkler: () => boolean
  buyAnimal: (kind: AnimalId) => boolean
  collectAnimal: (id: number) => boolean
  petAnimal: (id: number) => boolean
  hitForageNode: (spotId: string) => boolean
  triggerFishing: () => boolean
  cookDish: (dishId: DishId) => boolean
  eatDish: (dishId: DishId) => boolean
  deliverOrder: (orderId: number) => boolean
  sellAll: () => boolean
  resetSave: () => void
}

let hintTimer: ReturnType<typeof setTimeout> | null = null

export const useFarmStore = create<FarmState>()(
  persist(
    (set, get) => ({
      ...freshState(),

      playerId: createPlayerId(),
      playerName: 'ชาวนาอารมณ์ดี',
      outfitId: OUTFIT_COLORS[0].id,
      roomCode: null,
      coopOpen: false,
      peers: {},
      chatMessages: [],
      activeEmote: null,

      hint: 'เดินด้วย WASD • คลิกแปลงผัก/ตกปลา/ตัดไม้ หรือกดปุ่ม Co-op ด้านบนเพื่อเล่นกับเพื่อน! ✨',
      selectedPlotId: null,
      hoverPlotId: null,
      shopOpen: false,
      cookOpen: false,
      muted: isMuted(),
      playerPos: { x: 0, z: 5.4 },
      playerRotY: Math.PI,
      playerMoving: false,
      touchMove: { f: 0, s: 0 },
      lastActAt: 0,
      lastHarvest: null,
      lastLevelUp: null,
      lastOrder: null,
      weather: { type: 'sunny' },
      floaters: [],
      fishing: { state: 'idle', biteAt: 0 },
      speedBuffUntil: 0,

      setPlayerTransform: (x, z, rotY, moving) =>
        set({ playerPos: { x, z }, playerRotY: rotY, playerMoving: moving }),
      setPlayerPos: (x, z) => set({ playerPos: { x, z } }),
      setTouchMove: (f, s) => set({ touchMove: { f, s } }),

      setHint: (hint, ms = 2600) => {
        set({ hint })
        if (hintTimer) clearTimeout(hintTimer)
        if (ms > 0) hintTimer = setTimeout(() => set({ hint: '' }), ms)
      },

      setTool: (tool) => {
        set({ tool })
        if (tool.startsWith('seed-')) {
          const crop = tool.slice(5) as CropId
          set({ preferredSeed: crop })
        }
      },
      setShopOpen: (open) => set({ shopOpen: open, cookOpen: false, coopOpen: false }),
      setCookOpen: (open) => set({ cookOpen: open, shopOpen: false, coopOpen: false }),
      setCoopOpen: (open) => set({ coopOpen: open, shopOpen: false, cookOpen: false }),
      setHoverPlot: (id) => set({ hoverPlotId: id }),

      setPlayerProfile: (name, outfitId) =>
        set({ playerName: name.trim() || 'ชาวนาอารมณ์ดี', outfitId }),
      setRoomCode: (code) => set({ roomCode: code }),

      upsertPeer: (peer) =>
        set((s) => ({
          peers: { ...s.peers, [peer.id]: { ...peer, updatedAt: Date.now() } },
        })),
      removePeer: (peerId) =>
        set((s) => {
          const next = { ...s.peers }
          delete next[peerId]
          return { peers: next }
        }),
      clearPeers: () => set({ peers: {} }),

      addChatMessage: (msg) =>
        set((s) => ({
          chatMessages: [...s.chatMessages.slice(-24), msg],
        })),

      triggerEmote: (text) => {
        const until = Date.now() + 3600
        set({ activeEmote: { text, until } })
        const { playerPos } = get()
        get().addFloater(playerPos.x, playerPos.z, text, '#fef08a')
      },

      getSharedSnapshot: (): SharedSyncPayload => {
        const s = get()
        return {
          money: s.money,
          seeds: s.seeds,
          produce: s.produce,
          plots: s.plots,
          upgrades: s.upgrades,
          animals: s.animals,
          level: s.level,
          xp: s.xp,
          orders: s.orders,
          forageNodes: s.forageNodes,
        }
      },

      applyRemoteSync: (payload) => {
        set({
          money: payload.money,
          seeds: payload.seeds,
          produce: { ...makeInitialProduce(), ...payload.produce },
          plots: payload.plots,
          upgrades: payload.upgrades,
          animals: payload.animals,
          level: payload.level,
          xp: payload.xp,
          orders: payload.orders,
          forageNodes: payload.forageNodes ?? get().forageNodes,
        })
      },

      broadcastSync: () => {
        if (syncBroadcaster && get().roomCode) {
          syncBroadcaster(get().getSharedSnapshot())
        }
      },

      toggleMute: () => {
        const m = !get().muted
        setMuted(m)
        set({ muted: m, hint: m ? 'ปิดเสียงแล้ว (กด M เพื่อเปิด)' : 'เปิดเสียงแล้ว! 🔊' })
      },

      tickTime: (dtMin = 2) => {
        const { clockMin, day } = get()
        let nm = clockMin + dtMin
        let nd = day
        if (nm >= 24 * 60) {
          nm -= 24 * 60
          nd += 1
        }
        set({ clockMin: nm, day: nd })
      },

      rollWeather: () => {
        const type = Math.random() < 0.35 ? 'rainy' : 'sunny'
        const prev = get().weather.type
        set({ weather: { type } })
        if (type !== prev) {
          if (type === 'rainy') {
            get().setHint('ฝนตกแล้ว! 🌧️ รดน้ำแปลงอัตโนมัติ + โอกาสตกได้ปลาหายากเพิ่มขึ้น!', 3400)
          } else {
            get().setHint('ท้องฟ้าแจ่มใส! ☀️ พืชทุกแปลงโตไวขึ้น +20%', 2800)
          }
        }
      },

      growthRate: () => (get().weather.type === 'sunny' ? 1.2 : 1),

      addXp: (n, at = null) => {
        let { xp, level } = get()
        xp += n
        let leveled = false
        while (xp >= xpNeeded(level)) {
          xp -= xpNeeded(level)
          level += 1
          leveled = true
        }
        set({ xp, level })
        if (at) get().addFloater(at.x, at.z, `+${n} XP`, '#60a5fa')
        if (leveled) {
          sfx.levelup()
          const unlocked = CROP_IDS.filter((c) => CROPS[c].unlockLv === level).map(
            (c) => `${CROPS[c].emoji}${CROPS[c].name}`,
          )
          get().setHint(
            `เลเวลอัป! ตอนนี้ Lv.${level} 🎉${unlocked.length ? ` ปลดล็อก: ${unlocked.join(' ')}` : ''}`,
            4000,
          )
          set({ lastLevelUp: { at: Date.now(), level } })
        }
      },

      addFloater: (x, z, text, color = '#fbbf24') => {
        const id = floaterId++
        set({ floaters: [...get().floaters.slice(-14), { id, x, z, text, color }] })
        setTimeout(() => {
          set({ floaters: get().floaters.filter((f) => f.id !== id) })
        }, 1450)
      },

      tillPlot: (id) => {
        const { plots, upgrades } = get()
        const plot = plots.find((p) => p.id === id)
        if (!plot || plot.state !== 'empty') return false
        const targets = upgrades.goldenHoe
          ? neighbors3x3(plot.row, plot.col)
              .map((pid) => plots.find((p) => p.id === pid))
              .filter((p): p is PlotData => !!p && p.state === 'empty')
          : [plot]
        if (!targets.length) return false
        const ids = new Set(targets.map((p) => p.id))
        set({
          plots: plots.map((p) => (ids.has(p.id) ? { ...p, state: 'tilled', giant: false } : p)),
          lastActAt: Date.now(),
        })
        sfx.till()
        get().addXp(targets.length, null)
        get().setHint(
          upgrades.goldenHoe
            ? `จอบทองคำ! พรวนทีเดียว ${targets.length} แปลง ✨`
            : 'พรวนดินแล้ว! ต่อไปหว่านเมล็ดพันธุ์ 🌱',
          2200,
        )
        get().broadcastSync()
        return true
      },

      plantSeed: (id, crop) => {
        const { plots, seeds, level } = get()
        const plot = plots.find((p) => p.id === id)
        if (!plot || plot.state !== 'tilled') return false
        if (level < CROPS[crop].unlockLv) {
          sfx.error()
          get().setHint(
            `${CROPS[crop].emoji} ปลดล็อกที่ Lv.${CROPS[crop].unlockLv} (ตอนนี้ Lv.${level})`,
            2800,
          )
          return false
        }
        if ((seeds[crop] ?? 0) <= 0) {
          sfx.error()
          get().setHint(`เมล็ด${CROPS[crop].name}หมด! เปิดร้านค้าเพื่อซื้อเพิ่มได้เลย`, 2600)
          get().setShopOpen(true)
          return false
        }
        set({
          seeds: { ...seeds, [crop]: seeds[crop] - 1 },
          plots: plots.map((p) =>
            p.id === id ? { ...p, state: 'seeded', crop, watered: false, giant: false } : p,
          ),
          lastActAt: Date.now(),
        })
        sfx.plant()
        get().addXp(2, null)
        get().setHint(`หว่านเมล็ด${CROPS[crop].name}แล้ว! ใช้บัวรดน้ำเลย 💧`, 2200)
        get().broadcastSync()
        return true
      },

      waterPlot: (id, silent = false) => {
        const { plots, upgrades } = get()
        const plot = plots.find((p) => p.id === id)
        if (!plot || plot.state !== 'seeded') return false
        const targets = upgrades.goldenWater
          ? neighbors3x3(plot.row, plot.col)
              .map((pid) => plots.find((p) => p.id === pid))
              .filter((p): p is PlotData => !!p && p.state === 'seeded')
          : [plot]
        if (!targets.length) return false
        const now = Date.now()
        const ids = new Set(targets.map((p) => p.id))
        set({
          plots: plots.map((p) =>
            ids.has(p.id)
              ? { ...p, state: 'growing', growth: 0, watered: true, splashAt: now }
              : p,
          ),
          lastActAt: silent ? get().lastActAt : now,
        })
        if (!silent) {
          sfx.water()
          get().addXp(targets.length * 3, null)
          get().setHint(
            upgrades.goldenWater
              ? `บัวรดน้ำทองคำ! รดทีเดียว ${targets.length} แปลง ✨💧`
              : 'รดน้ำชุ่มฉ่ำแล้ว! รอพืชเติบโต 3 ระยะ (ลุ้นผักยักษ์ 10%!) 🌿',
            2200,
          )
        }
        get().broadcastSync()
        return true
      },

      autoIrrigate: () => {
        const { plots, upgrades, weather } = get()
        const targets = new Set<number>()
        if (weather.type === 'rainy') {
          for (const p of plots) if (p.state === 'seeded') targets.add(p.id)
        }
        for (const sid of upgrades.sprinklers) {
          const s = plots.find((p) => p.id === sid)
          if (!s) continue
          for (const nid of neighbors3x3(s.row, s.col)) {
            const n = plots.find((p) => p.id === nid)
            if (n && n.state === 'seeded') targets.add(nid)
          }
        }
        if (!targets.size) return
        const now = Date.now()
        set({
          plots: plots.map((p) =>
            targets.has(p.id)
              ? { ...p, state: 'growing', growth: 0, watered: true, splashAt: now }
              : p,
          ),
        })
        get().broadcastSync()
      },

      harvestPlot: (id) => {
        const { plots, produce, money } = get()
        const plot = plots.find((p) => p.id === id)
        if (!plot || plot.state !== 'mature' || !plot.crop) return false
        const crop = plot.crop
        const isGiant = !!plot.giant
        const yieldCount = isGiant ? 3 : 1
        const bonusCoins = isGiant ? CROPS[crop].sellPrice * 2 : 0
        set({
          plots: plots.map((p) =>
            p.id === id
              ? { ...p, state: 'empty', crop: null, growth: 0, watered: false, giant: false }
              : p,
          ),
          produce: { ...produce, [crop]: (produce[crop] ?? 0) + yieldCount },
          money: money + bonusCoins,
          lastActAt: Date.now(),
          lastHarvest: { at: Date.now(), crop, x: plot.x, z: plot.z },
        })
        sfx.harvest()
        if (isGiant) {
          setTimeout(() => sfx.levelup(), 160)
          get().addFloater(
            plot.x,
            plot.z,
            `🌟 ผักยักษ์ ×3! +3 ${CROPS[crop].emoji} (+${bonusCoins}฿)`,
            '#facc15',
          )
          get().addXp(CROPS[crop].xp * 3, { x: plot.x, z: plot.z })
          get().setHint(
            `สุดยอด! เก็บเกี่ยว "${CROPS[crop].name}ยักษ์" ได้ผลผลิต ×3 และโบนัส +${bonusCoins}฿! 🌟`,
            3400,
          )
        } else {
          get().addFloater(plot.x, plot.z, `+1 ${CROPS[crop].emoji} ${CROPS[crop].name}`, '#4ade80')
          get().addXp(CROPS[crop].xp, { x: plot.x, z: plot.z })
          get().setHint(
            `เก็บเกี่ยว${CROPS[crop].name}เข้าคลังแล้ว! ${CROPS[crop].emoji} (นำไปแปรรูปที่โรงครัวหรือขายได้ ${CROPS[crop].sellPrice}฿)`,
            2600,
          )
        }
        get().broadcastSync()
        return true
      },

      advanceGrowth: (id) => {
        const { plots } = get()
        const plot = plots.find((p) => p.id === id)
        if (!plot || plot.state !== 'growing' || !plot.crop) return
        if (plot.growth >= 2) {
          // โอกาส 10% กลายพันธุ์เป็น "ผักยักษ์ (Giant Crop)" ขายได้ราคา 3 เท่า!
          const isGiant = Math.random() < 0.1
          set({
            plots: plots.map((p) =>
              p.id === id ? { ...p, state: 'mature', giant: isGiant } : p,
            ),
            lastHarvest: { at: Date.now(), crop: plot.crop, x: plot.x, z: plot.z, mature: true },
          })
          sfx.mature()
          if (isGiant) {
            get().addFloater(plot.x, plot.z, '🌟 ผักยักษ์ ×3!', '#fde047')
            get().setHint(
              `ว้าว! ${CROPS[plot.crop].emoji}${CROPS[plot.crop].name} กลายพันธุ์เป็น "ผักยักษ์" มูลค่า 3 เท่า! 🌟`,
              3400,
            )
          }
          get().broadcastSync()
        } else {
          set({
            plots: plots.map((p) => (p.id === id ? { ...p, growth: p.growth + 1 } : p)),
          })
        }
      },

      resolveAction: (plot) => {
        const { tool, preferredSeed } = get()
        if (tool === 'auto') {
          if (plot.state === 'empty') return 'till'
          if (plot.state === 'tilled') return `plant:${preferredSeed}`
          if (plot.state === 'seeded') return 'water'
          if (plot.state === 'mature') return 'harvest'
          return 'wait'
        }
        if (tool === 'hoe') return 'till'
        if (tool === 'water') return 'water'
        if (tool === 'harvest') return 'harvest'
        if (tool.startsWith('seed-')) return `plant:${tool.slice(5)}`
        return 'wait'
      },

      interactPlot: (id, force = false) => {
        const st = get()
        const plot = st.plots.find((p) => p.id === id)
        if (!plot) return false
        if (!force) {
          const d = Math.hypot(plot.x - st.playerPos.x, plot.z - st.playerPos.z)
          if (d > INTERACT_DISTANCE) {
            sfx.error()
            st.setHint('เดินเข้าไปใกล้แปลงอีกนิดก่อนนะ! (กด WASD / ลูกศร)', 2000)
            return false
          }
        }
        const action = plot.state === 'mature' ? 'harvest' : st.resolveAction(plot)
        if (action === 'till') {
          if (plot.state !== 'empty') {
            st.setHint('แปลงนี้พรวนดินแล้ว — เลือกถุงเมล็ดพันธุ์เพื่อปลูกนะ 🌱', 2000)
            return false
          }
          return st.tillPlot(id)
        }
        if (action.startsWith('plant:')) {
          const crop = action.slice(6) as CropId
          if (plot.state !== 'tilled') {
            st.setHint('ต้องใช้จอบพรวนดินก่อนหว่านเมล็ดนะ 🟫', 2000)
            return false
          }
          return st.plantSeed(id, crop)
        }
        if (action === 'water') {
          if (plot.state !== 'seeded') {
            st.setHint(
              plot.state === 'growing'
                ? 'รดน้ำแล้ว ต้นไม้กำลังเติบโตอยู่ 🌿'
                : 'ต้องหว่านเมล็ดก่อนรดน้ำนะ 🌱',
              2000,
            )
            return false
          }
          return st.waterPlot(id)
        }
        if (action === 'harvest') {
          if (plot.state !== 'mature') {
            st.setHint('พืชยังไม่สุก รอให้โตเต็มที่ก่อนนะ ⏳', 2000)
            return false
          }
          return st.harvestPlot(id)
        }
        st.setHint(`กำลังเติบโต... ระยะที่ ${plot.growth + 1}/3 ⏳`, 1800)
        return false
      },

      interactNearest: () => {
        const st = get()
        const { plots, playerPos, fishing, forageNodes } = st

        // 1. ถ้ากำลังตกปลาอยู่ หรือยืนอยู่ที่ท่าเรือตกปลา
        const distDock = Math.hypot(playerPos.x - DOCK_POS.x, playerPos.z - DOCK_POS.z)
        if (fishing.state !== 'idle' || distDock <= DOCK_POS.r) {
          return st.triggerFishing()
        }

        // 2. ถ้ายืนอยู่หน้าซุ้มโรงครัวทำอาหาร
        const distKitchen = Math.hypot(playerPos.x - KITCHEN_POS.x, playerPos.z - KITCHEN_POS.z)
        if (distKitchen <= KITCHEN_POS.r) {
          sfx.click()
          st.setCookOpen(true)
          return true
        }

        // 3. เช็กต้นไม้/หินแร่รอบฟาร์มที่อยู่ใกล้ตัว
        let bestSpot = null
        let bestSpotDist = Infinity
        const now = Date.now()
        for (const spot of FORAGE_SPOTS) {
          const node = forageNodes[spot.id]
          if (node && now < node.respawnAt) continue
          const d = Math.hypot(spot.x - playerPos.x, spot.z - playerPos.z)
          if (d < bestSpotDist) {
            bestSpotDist = d
            bestSpot = spot
          }
        }

        // 4. เช็กแปลงผักที่อยู่ใกล้ตัวที่สุด
        let bestPlot: PlotData | null = null
        let bestPlotDist = Infinity
        for (const p of plots) {
          const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z)
          if (d < bestPlotDist) {
            bestPlotDist = d
            bestPlot = p
          }
        }

        if (bestSpot && bestSpotDist <= 2.3 && bestSpotDist < bestPlotDist) {
          return st.hitForageNode(bestSpot.id)
        }

        if (bestPlot && bestPlotDist <= INTERACT_DISTANCE) {
          set({ selectedPlotId: bestPlot.id })
          return st.interactPlot(bestPlot.id)
        }

        if (bestSpot && bestSpotDist <= INTERACT_DISTANCE + 0.4) {
          return st.hitForageNode(bestSpot.id)
        }

        sfx.error()
        st.setHint('เดินเข้าไปใกล้แปลงผัก ท่าเรือตกปลา ต้นไม้/หินแร่ หรือโรงครัวก่อนนะ!', 2200)
        return false
      },

      buySeed: (crop, n = 1) => {
        const { money, seeds, level } = get()
        if (level < CROPS[crop].unlockLv) {
          sfx.error()
          get().setHint(`${CROPS[crop].emoji} ปลดล็อกที่ Lv.${CROPS[crop].unlockLv}`, 2400)
          return false
        }
        const cost = CROPS[crop].seedCost * n
        if (money < cost) {
          sfx.error()
          get().setHint('เหรียญไม่พอ! เก็บเกี่ยวแล้วกด "ขายผลผลิตทั้งหมด" ก่อนนะ 💰', 2400)
          return false
        }
        set({
          money: money - cost,
          seeds: { ...seeds, [crop]: (seeds[crop] ?? 0) + n },
          preferredSeed: crop,
        })
        sfx.coin()
        get().setHint(`ซื้อเมล็ด${CROPS[crop].name} x${n} สำเร็จ! 🌱`, 1800)
        get().broadcastSync()
        return true
      },

      buyUpgrade: (uid) => {
        const { money, upgrades, playerPos, plots } = get()
        const costs: Record<UpgradeId, number> = {
          goldenHoe: 300,
          goldenWater: 350,
          speedBoots: 250,
          sprinkler: 120,
        }
        if (uid === 'sprinkler') {
          if (money < costs.sprinkler) {
            sfx.error()
            get().setHint('เหรียญไม่พอซื้อสปริงเกอร์ (120฿ หรือคราฟต์ที่โรงครัวด้วยไม้ 3 + หิน 2)', 2600)
            return false
          }
          let best: PlotData | null = null
          let bestD = Infinity
          for (const p of plots) {
            if (upgrades.sprinklers.includes(p.id)) continue
            const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z)
            if (d < bestD) {
              bestD = d
              best = p
            }
          }
          if (!best || bestD > INTERACT_DISTANCE + 1.2) {
            sfx.error()
            get().setHint('เดินไปใกล้แปลงที่อยากติดตั้งสปริงเกอร์ก่อนนะ!', 2400)
            return false
          }
          set({
            money: money - costs.sprinkler,
            upgrades: { ...upgrades, sprinklers: [...upgrades.sprinklers, best.id] },
          })
          sfx.place()
          get().setHint('ติดตั้งสปริงเกอร์แล้ว! ⛲ รดน้ำแปลงรอบข้าง 3×3 อัตโนมัติ', 2800)
          get().broadcastSync()
          return true
        }
        if (upgrades[uid]) return false
        if (money < costs[uid]) {
          sfx.error()
          get().setHint('เหรียญไม่พอ! ขายผลผลิตสะสมเงินอีกนิดนะ 💰', 2400)
          return false
        }
        set({ money: money - costs[uid], upgrades: { ...upgrades, [uid]: true } })
        sfx.levelup()
        const names: Record<Exclude<UpgradeId, 'sprinkler'>, string> = {
          goldenHoe: 'จอบทองคำ ✨',
          goldenWater: 'บัวรดน้ำทองคำ ✨',
          speedBoots: 'รองเท้าบูทวิ่งไว 👟',
        }
        get().setHint(`อัปเกรด${names[uid]}สำเร็จ!`, 2800)
        get().broadcastSync()
        return true
      },

      craftSprinkler: () => {
        const { produce, upgrades, plots, playerPos } = get()
        if ((produce.wood ?? 0) < 3 || (produce.stone ?? 0) < 2) {
          sfx.error()
          get().setHint('ต้องการ ท่อนไม้ x3 🪵 และ หินแร่ x2 🪨 (ไปตัดไม้/ตีหินรอบฟาร์มได้เลย!)', 2800)
          return false
        }
        let best: PlotData | null = null
        let bestD = Infinity
        for (const p of plots) {
          if (upgrades.sprinklers.includes(p.id)) continue
          const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z)
          if (d < bestD) {
            bestD = d
            best = p
          }
        }
        if (!best) {
          sfx.error()
          get().setHint('ติดสปริงเกอร์ครบทุกแปลงแล้ว!', 2400)
          return false
        }
        set({
          produce: {
            ...produce,
            wood: produce.wood - 3,
            stone: produce.stone - 2,
          },
          upgrades: { ...upgrades, sprinklers: [...upgrades.sprinklers, best.id] },
        })
        sfx.place()
        get().addFloater(best.x, best.z, '⛲ ติดตั้งสปริงเกอร์!', '#38bdf8')
        get().addXp(12, { x: best.x, z: best.z })
        get().setHint(`คราฟต์และติดตั้งสปริงเกอร์ที่แปลง #${best.id + 1} เรียบร้อย! ⛲`, 2800)
        get().broadcastSync()
        return true
      },

      buyAnimal: (kind) => {
        const { money, animals } = get()
        const cost = ANIMALS[kind].cost
        if (money < cost) {
          sfx.error()
          get().setHint('เหรียญไม่พอซื้อสัตว์เลี้ยง! 💰', 2400)
          return false
        }
        set({
          money: money - cost,
          animals: [
            ...animals,
            {
              id: Date.now() + Math.floor(Math.random() * 10000),
              kind,
              readyAt: Date.now() + ANIMALS[kind].goodEverySec * 1000,
              petAt: 0,
            },
          ],
        })
        sfx.pop()
        get().setHint(`รับ${ANIMALS[kind].name}เข้าคอกสัตว์แล้ว! ${ANIMALS[kind].emoji}`, 2600)
        get().broadcastSync()
        return true
      },

      collectAnimal: (id) => {
        const { animals, produce } = get()
        const a = animals.find((x) => x.id === id)
        if (!a) return false
        if (Date.now() < a.readyAt) {
          return get().petAnimal(id)
        }
        const good = ANIMALS[a.kind].good
        set({
          animals: animals.map((x) =>
            x.id === id
              ? { ...x, readyAt: Date.now() + ANIMALS[a.kind].goodEverySec * 1000 }
              : x,
          ),
          produce: { ...produce, [good]: (produce[good] ?? 0) + 1 },
        })
        sfx.pop()
        setTimeout(() => sfx.coin(), 150)
        get().addFloater(PEN.x, PEN.z, `+1 ${GOODS[good].emoji} ${GOODS[good].name}`, '#fde047')
        get().addXp(6, { x: PEN.x, z: PEN.z })
        get().setHint(
          `เก็บ${GOODS[good].name}เข้าคลังแล้ว! ${GOODS[good].emoji} (ขายได้ ${GOODS[good].sellPrice}฿ หรือนำไปทำอาหาร)`,
          2600,
        )
        get().broadcastSync()
        return true
      },

      petAnimal: (id) => {
        const { animals } = get()
        const a = animals.find((x) => x.id === id)
        if (!a) return false
        const now = Date.now()
        set({
          animals: animals.map((x) =>
            x.id === id
              ? { ...x, petAt: now, readyAt: Math.max(now + 1000, x.readyAt - 4000) }
              : x,
          ),
          lastActAt: now,
        })
        sfx.pop()
        get().addFloater(PEN.x, PEN.z, `❤️ ${ANIMALS[a.kind].name}อารมณ์ดี!`, '#fb7185')
        get().addXp(2, null)
        const secLeft = Math.max(1, Math.ceil((a.readyAt - 4000 - now) / 1000))
        get().setHint(
          `ลูบหัว/ให้อาหาร${ANIMALS[a.kind].name} ❤️ ผลิตไวขึ้น! (อีก ~${secLeft} วิ พร้อมเก็บ)`,
          2200,
        )
        get().broadcastSync()
        return true
      },

      hitForageNode: (spotId) => {
        const st = get()
        const spot = FORAGE_SPOTS.find((s) => s.id === spotId)
        if (!spot) return false
        const dist = Math.hypot(spot.x - st.playerPos.x, spot.z - st.playerPos.z)
        if (dist > INTERACT_DISTANCE + 0.9) {
          sfx.error()
          st.setHint(
            spot.kind === 'tree'
              ? 'เดินเข้าไปใกล้ต้นไม้อีกนิดเพื่อตัดไม้นะ! 🪓'
              : 'เดินเข้าไปใกล้ก้อนหินแร่อีกนิดเพื่อขุดแร่นะ! ⛏️',
            2200,
          )
          return false
        }
        const now = Date.now()
        const cur = st.forageNodes[spotId] ?? { hits: 0, respawnAt: 0, lastHitAt: 0 }
        if (now < cur.respawnAt) {
          const sec = Math.ceil((cur.respawnAt - now) / 1000)
          st.setHint(`กำลังงอกใหม่ รออีก ${sec} วินาทีนะ ⏳`, 1800)
          return false
        }
        const nextHits = cur.hits + 1
        if (spot.kind === 'tree') sfx.chop()
        else sfx.mine()

        if (nextHits >= spot.maxHits) {
          const nextProduce = { ...st.produce }
          let rewardText = ''
          if (spot.kind === 'tree') {
            nextProduce.wood = (nextProduce.wood ?? 0) + 2
            rewardText = '+2 🪵 ท่อนไม้'
          } else if (spot.kind === 'rock') {
            nextProduce.stone = (nextProduce.stone ?? 0) + 2
            const gotGem = Math.random() < 0.35
            if (gotGem) nextProduce.gem = (nextProduce.gem ?? 0) + 1
            rewardText = gotGem ? '+2 🪨 หิน +1 💎 คริสตัล!' : '+2 🪨 หินแร่'
          } else {
            nextProduce.stone = (nextProduce.stone ?? 0) + 1
            nextProduce.gem = (nextProduce.gem ?? 0) + 1
            rewardText = '+1 💎 คริสตัล +1 🪨 หิน'
          }
          set({
            produce: nextProduce,
            forageNodes: {
              ...st.forageNodes,
              [spotId]: { hits: 0, respawnAt: now + RESPAWN_MS, lastHitAt: now },
            },
            lastActAt: now,
          })
          st.addFloater(spot.x, spot.z, rewardText, spot.kind === 'crystal' ? '#c084fc' : '#fde047')
          st.addXp(spot.kind === 'crystal' ? 14 : 8, { x: spot.x, z: spot.z })
          st.setHint(`เก็บทรัพยากรสำเร็จ: ${rewardText} (งอกใหม่ใน 30 วิ)`, 2600)
          st.broadcastSync()
          return true
        }

        set({
          forageNodes: {
            ...st.forageNodes,
            [spotId]: { ...cur, hits: nextHits, lastHitAt: now },
          },
          lastActAt: now,
        })
        st.addFloater(
          spot.x,
          spot.z,
          `${spot.kind === 'tree' ? '🪓' : '⛏️'} ${nextHits}/${spot.maxHits}`,
          '#ffffff',
        )
        return true
      },

      triggerFishing: () => {
        const st = get()
        const dist = Math.hypot(st.playerPos.x - DOCK_POS.x, st.playerPos.z - DOCK_POS.z)
        if (st.fishing.state === 'idle') {
          if (dist > DOCK_POS.r + 1.0) {
            sfx.error()
            st.setHint('เดินไปที่ท่าเรือไม้ริมบ่อน้ำ (มุมซ้ายบน) เพื่อตกปลานะ! 🎣', 2400)
            return false
          }
          if (fishingTimer) clearTimeout(fishingTimer)
          if (fishingExpireTimer) clearTimeout(fishingExpireTimer)
          sfx.cast()
          set({ fishing: { state: 'waiting', biteAt: 0 }, lastActAt: Date.now() })
          st.setHint('เหวี่ยงเบ็ดแล้ว! 🎣 รอจังหวะเครื่องหมาย ! เด้งขึ้นแล้วรีบกดคลิก/Spacebar!', 3200)
          const waitMs = 1800 + Math.random() * 2200
          fishingTimer = setTimeout(() => {
            if (get().fishing.state !== 'waiting') return
            sfx.bite()
            set({ fishing: { state: 'bite', biteAt: Date.now() } })
            get().setHint('❗️ ปลาฮุบเหยื่อแล้ว! รีบกดคลิก หรือ Spacebar เดี๋ยวนี้เลย!', 2200)
            fishingExpireTimer = setTimeout(() => {
              if (get().fishing.state === 'bite') {
                sfx.error()
                set({ fishing: { state: 'idle', biteAt: 0 } })
                get().setHint('ปลาหลุดไปแล้ว! 🐟 กดเหวี่ยงเบ็ดใหม่อีกครั้งนะ', 2200)
              }
            }, 2600)
          }, waitMs)
          return true
        }

        if (st.fishing.state === 'waiting') {
          if (fishingTimer) clearTimeout(fishingTimer)
          sfx.error()
          set({ fishing: { state: 'idle', biteAt: 0 } })
          st.setHint('ดึงเบ็ดเร็วไปนิด! รอให้มีเครื่องหมาย ! เด้งขึ้นเหนือทุ่นก่อนนะ 🎣', 2400)
          return false
        }

        // state === 'bite' -> วัดเบ็ดได้ปลา!
        if (fishingTimer) clearTimeout(fishingTimer)
        if (fishingExpireTimer) clearTimeout(fishingExpireTimer)
        const rainy = st.weather.type === 'rainy'
        const roll = Math.random()
        const catchKey =
          roll < (rainy ? 0.22 : 0.12)
            ? 'treasure'
            : roll < (rainy ? 0.62 : 0.42)
              ? 'goldkoi'
              : 'carp'
        const caught = FISHES[catchKey]
        set({
          fishing: { state: 'idle', biteAt: 0 },
          produce: { ...st.produce, [catchKey]: (st.produce[catchKey] ?? 0) + 1 },
          lastActAt: Date.now(),
        })
        sfx.harvest()
        setTimeout(() => sfx.coin(), 180)
        st.addFloater(DOCK_POS.x, DOCK_POS.z, `🎣 ได้ ${caught.emoji} ${caught.name}!`, '#38bdf8')
        st.addXp(catchKey === 'treasure' ? 28 : catchKey === 'goldkoi' ? 18 : 10, {
          x: DOCK_POS.x,
          z: DOCK_POS.z,
        })
        st.setHint(
          `ตกได้ "${caught.emoji} ${caught.name}"! (ขายได้ ${caught.sellPrice}฿ หรือนำไปย่างที่โรงครัว)`,
          3200,
        )
        st.broadcastSync()
        return true
      },

      cookDish: (dishId) => {
        const st = get()
        const recipe = RECIPES[dishId]
        for (const [ing, need] of Object.entries(recipe.ingredients)) {
          if ((st.produce[ing as ProduceKey] ?? 0) < (need ?? 0)) {
            sfx.error()
            st.setHint('วัตถุดิบไม่พอทำอาหารเมนูนี้! 🍲', 2200)
            return false
          }
        }
        const next = { ...st.produce }
        for (const [ing, need] of Object.entries(recipe.ingredients)) {
          next[ing as ProduceKey] -= need ?? 0
        }
        next[dishId] = (next[dishId] ?? 0) + 1
        set({ produce: next, lastActAt: Date.now() })
        sfx.cook()
        st.addFloater(KITCHEN_POS.x, KITCHEN_POS.z, `+1 ${recipe.emoji} ${recipe.name}`, '#fb923c')
        st.addXp(16, { x: KITCHEN_POS.x, z: KITCHEN_POS.z })
        st.setHint(
          `ปรุง "${recipe.emoji} ${recipe.name}" สำเร็จ! ขายได้ ${recipe.sellPrice}฿ หรือกดกินเพื่อวิ่งไว!`,
          3000,
        )
        st.broadcastSync()
        return true
      },

      eatDish: (dishId) => {
        const st = get()
        if ((st.produce[dishId] ?? 0) <= 0) return false
        const recipe = RECIPES[dishId]
        const until = Date.now() + recipe.buffSec * 1000
        set({
          produce: { ...st.produce, [dishId]: st.produce[dishId] - 1 },
          speedBuffUntil: until,
          lastActAt: Date.now(),
        })
        sfx.levelup()
        st.addFloater(
          st.playerPos.x,
          st.playerPos.z,
          `⚡ วิ่งไว +50% (${recipe.buffSec} วิ)!`,
          '#fde047',
        )
        st.setHint(`ทาน ${recipe.emoji} ${recipe.name} อร่อยจัง! วิ่งไวขึ้น +50% นาน ${recipe.buffSec} วินาที ⚡`, 3200)
        st.broadcastSync()
        return true
      },

      deliverOrder: (orderIdToDeliver) => {
        const { orders, produce, money, level, playerPos } = get()
        const o = orders.find((x) => x.id === orderIdToDeliver)
        if (!o) return false
        for (const it of o.items) {
          if ((produce[it.crop] ?? 0) < it.need) {
            sfx.error()
            get().setHint('ผลผลิตในคลังไม่พอส่งออเดอร์! ปลูกเพิ่มก่อนนะ', 2200)
            return false
          }
        }
        const next = { ...produce }
        for (const it of o.items) next[it.crop] -= it.need
        set({
          produce: next,
          money: money + o.reward,
          orders: orders.map((x) => (x.id === orderIdToDeliver ? makeOrder(level) : x)),
          lastOrder: { at: Date.now() },
        })
        sfx.order()
        setTimeout(() => sfx.coin(), 300)
        get().addFloater(playerPos.x, playerPos.z, `+${o.reward}฿`, '#fbbf24')
        get().addXp(o.xp, { x: playerPos.x, z: playerPos.z })
        get().setHint(`ส่งออเดอร์สำเร็จ! รับโบนัส ×1.5 = +${o.reward}฿ 🎉`, 3000)
        get().broadcastSync()
        return true
      },

      sellAll: () => {
        const { produce, money, playerPos } = get()
        const entries = Object.entries(produce).filter(([, n]) => n > 0)
        if (!entries.length) {
          sfx.error()
          get().setHint('ยังไม่มีผลผลิตในคลังให้ขาย เก็บเกี่ยวผัก/ตกปลา/เก็บของก่อนนะ!', 2200)
          return false
        }
        const income = entries.reduce((sum, [k, n]) => {
          const price = ALL_ITEMS[k as ProduceKey]?.sellPrice ?? 0
          return sum + n * price
        }, 0)
        const count = entries.reduce((s, [, n]) => s + n, 0)
        set({ produce: makeInitialProduce(), money: money + income })
        sfx.coin()
        get().addFloater(playerPos.x, playerPos.z, `+${income}฿`, '#fbbf24')
        get().addXp(Math.min(count * 2, 35), null)
        get().setHint(`ขายสินค้าและผลผลิต ${count} ชิ้น ได้รับ +${income}฿! 💰`, 2800)
        get().broadcastSync()
        return true
      },

      resetSave: () => {
        useFarmStore.persist.clearStorage()
        const fresh = freshState()
        set({
          ...fresh,
          hint: 'รีเซ็ตฟาร์มใหม่เรียบร้อย! มาเริ่มปลูกผักกันเลย 🌱',
          selectedPlotId: null,
          hoverPlotId: null,
          shopOpen: false,
          cookOpen: false,
          playerPos: { x: 0, z: 5.4 },
          lastActAt: 0,
          lastHarvest: null,
          lastLevelUp: null,
          lastOrder: null,
          weather: { type: 'sunny' },
          floaters: [],
          fishing: { state: 'idle', biteAt: 0 },
          speedBuffUntil: 0,
        })
        get().broadcastSync()
      },
    }),
    {
      name: SAVE_KEY,
      version: 3,
      partialize: (s) => ({
        money: s.money,
        seeds: s.seeds,
        produce: s.produce,
        plots: s.plots,
        tool: s.tool,
        preferredSeed: s.preferredSeed,
        upgrades: s.upgrades,
        animals: s.animals,
        level: s.level,
        xp: s.xp,
        orders: s.orders,
        day: s.day,
        clockMin: s.clockMin,
        forageNodes: s.forageNodes,
        playerName: s.playerName,
        outfitId: s.outfitId,
      }),
    },
  ),
)

export function formatClock(clockMin: number): string {
  const h = Math.floor(clockMin / 60) % 24
  const m = Math.floor(clockMin % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
