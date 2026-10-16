export const GRID_SIZE = 5
export const PLOT_SPACING = 1.5
export const PLOT_SIZE = 1.2
export const INTERACT_DISTANCE = 2.6
export const MOVE_SPEED = 4.6
export const BOUNDS = 9.5

// ตำแหน่งโซนกิจกรรมพิเศษในฟาร์ม
export const PEN = { x: 5.2, z: 4.9, r: 1.9 }
export const POND_CENTER = { x: -8.2, z: -6.8 }
export const DOCK_POS = { x: -6.4, z: -5.8, r: 2.6 }
export const KITCHEN_POS = { x: 5.6, z: -6.3, r: 2.6 }

export type CropId = 'carrot' | 'tomato' | 'pumpkin' | 'strawberry' | 'goldmelon'

export interface CropDef {
  id: CropId
  name: string
  emoji: string
  seedCost: number
  sellPrice: number
  growTime: number
  unlockLv: number
  xp: number
  leafColor: string
  topColor: string
  fruitColor: string
  glow?: boolean
}

export const CROPS: Record<CropId, CropDef> = {
  carrot: {
    id: 'carrot',
    name: 'แครอท',
    emoji: '🥕',
    seedCost: 5,
    sellPrice: 14,
    growTime: 10,
    unlockLv: 1,
    xp: 6,
    leafColor: '#4ade80',
    topColor: '#16a34a',
    fruitColor: '#f97316',
  },
  tomato: {
    id: 'tomato',
    name: 'มะเขือเทศ',
    emoji: '🍅',
    seedCost: 10,
    sellPrice: 30,
    growTime: 18,
    unlockLv: 1,
    xp: 10,
    leafColor: '#22c55e',
    topColor: '#15803d',
    fruitColor: '#ef4444',
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'ฟักทองยักษ์',
    emoji: '🎃',
    seedCost: 20,
    sellPrice: 65,
    growTime: 25,
    unlockLv: 1,
    xp: 18,
    leafColor: '#65a30d',
    topColor: '#365314',
    fruitColor: '#f97316',
  },
  strawberry: {
    id: 'strawberry',
    name: 'สตรอว์เบอร์รี',
    emoji: '🍓',
    seedCost: 15,
    sellPrice: 42,
    growTime: 20,
    unlockLv: 2,
    xp: 14,
    leafColor: '#4ade80',
    topColor: '#15803d',
    fruitColor: '#f43f5e',
  },
  goldmelon: {
    id: 'goldmelon',
    name: 'เมลอนทองคำ',
    emoji: '🍈',
    seedCost: 40,
    sellPrice: 150,
    growTime: 32,
    unlockLv: 3,
    xp: 30,
    leafColor: '#a3e635',
    topColor: '#4d7c0f',
    fruitColor: '#fbbf24',
    glow: true,
  },
}

export const CROP_IDS: CropId[] = ['carrot', 'tomato', 'pumpkin', 'strawberry', 'goldmelon']

// ผลผลิตจากสัตว์ (Ranching)
export type GoodId = 'egg' | 'wool' | 'milk'

export interface ItemDef {
  id: string
  name: string
  emoji: string
  sellPrice: number
}

export const GOODS: Record<GoodId, ItemDef> = {
  egg: { id: 'egg', name: 'ไข่ไก่สด', emoji: '🥚', sellPrice: 30 },
  wool: { id: 'wool', name: 'ขนแกะนุ่ม', emoji: '🧶', sellPrice: 45 },
  milk: { id: 'milk', name: 'นมสดหอมมัน', emoji: '🥛', sellPrice: 65 },
}
export const GOOD_IDS: GoodId[] = ['egg', 'wool', 'milk']

// ปลาและสมบัติจากกิจกรรมตกปลา (Fishing Mini-Game)
export type FishId = 'carp' | 'goldkoi' | 'treasure'

export const FISHES: Record<FishId, ItemDef> = {
  carp: { id: 'carp', name: 'ปลาคาร์ป', emoji: '🐟', sellPrice: 32 },
  goldkoi: { id: 'goldkoi', name: 'ปลาคอยทองคำ', emoji: '🐠', sellPrice: 95 },
  treasure: { id: 'treasure', name: 'กล่องสมบัติโบราณ', emoji: '🧰', sellPrice: 220 },
}
export const FISH_IDS: FishId[] = ['carp', 'goldkoi', 'treasure']

// ทรัพยากรตัดไม้ & ตีหินหาแร่ (Foraging & Mining)
export type ResourceId = 'wood' | 'stone' | 'gem'

export const RESOURCES: Record<ResourceId, ItemDef> = {
  wood: { id: 'wood', name: 'ท่อนไม้', emoji: '🪵', sellPrice: 10 },
  stone: { id: 'stone', name: 'หินแร่', emoji: '🪨', sellPrice: 14 },
  gem: { id: 'gem', name: 'คริสตัลเรืองแสง', emoji: '💎', sellPrice: 75 },
}
export const RESOURCE_IDS: ResourceId[] = ['wood', 'stone', 'gem']

// อาหารแปรรูปจากโรงครัว (Cooking Station — มูลค่าขาย x2.5 หรือกินเพื่อวิ่งไว!)
export type DishId = 'tomatoSoup' | 'pumpkinPie' | 'strawberryCake' | 'grilledFish'

export interface RecipeDef {
  id: DishId
  name: string
  emoji: string
  ingredients: Partial<Record<CropId | GoodId | FishId, number>>
  sellPrice: number
  buffSec: number
  desc: string
}

export const RECIPES: Record<DishId, RecipeDef> = {
  tomatoSoup: {
    id: 'tomatoSoup',
    name: 'ซุปมะเขือเทศเข้มข้น',
    emoji: '🍲',
    ingredients: { tomato: 2 },
    sellPrice: 150,
    buffSec: 45,
    desc: 'ขายได้ 150฿ (×2.5) หรือกินเพื่อวิ่งไว +50% นาน 45 วิ',
  },
  pumpkinPie: {
    id: 'pumpkinPie',
    name: 'พายฟักทองอบเนย',
    emoji: '🥧',
    ingredients: { pumpkin: 1, egg: 1 },
    sellPrice: 240,
    buffSec: 60,
    desc: 'ขายได้ 240฿ (×2.5) หรือกินเพื่อวิ่งไว +50% นาน 60 วิ',
  },
  strawberryCake: {
    id: 'strawberryCake',
    name: 'เค้กสตรอว์เบอร์รีครีมสด',
    emoji: '🍰',
    ingredients: { strawberry: 2, milk: 1 },
    sellPrice: 375,
    buffSec: 75,
    desc: 'ขายได้ 375฿ (×2.5) หรือกินเพื่อวิ่งไว +50% นาน 75 วิ',
  },
  grilledFish: {
    id: 'grilledFish',
    name: 'ปลาเผาสมุนไพรแครอท',
    emoji: '🍢',
    ingredients: { carp: 1, carrot: 1 },
    sellPrice: 115,
    buffSec: 45,
    desc: 'ขายได้ 115฿ (×2.5) หรือกินเพื่อวิ่งไว +50% นาน 45 วิ',
  },
}
export const DISH_IDS: DishId[] = ['tomatoSoup', 'pumpkinPie', 'strawberryCake', 'grilledFish']

export type ProduceKey = CropId | GoodId | FishId | ResourceId | DishId

export const ALL_ITEMS: Record<ProduceKey, ItemDef> = {
  ...CROPS,
  ...GOODS,
  ...FISHES,
  ...RESOURCES,
  ...RECIPES,
}

export type AnimalId = 'chick' | 'sheep' | 'cow'

export interface AnimalDef {
  id: AnimalId
  name: string
  emoji: string
  cost: number
  good: GoodId
  goodEverySec: number
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  chick: {
    id: 'chick',
    name: 'ลูกไก่อารมณ์ดี',
    emoji: '🐤',
    cost: 100,
    good: 'egg',
    goodEverySec: 20,
  },
  sheep: {
    id: 'sheep',
    name: 'แกะน้อยขนฟู',
    emoji: '🐑',
    cost: 180,
    good: 'wool',
    goodEverySec: 20,
  },
  cow: {
    id: 'cow',
    name: 'วัวนมใจดี',
    emoji: '🐄',
    cost: 280,
    good: 'milk',
    goodEverySec: 20,
  },
}

export type UpgradeId = 'goldenHoe' | 'goldenWater' | 'speedBoots' | 'sprinkler'

export interface UpgradeDef {
  id: UpgradeId
  name: string
  emoji: string
  cost: number
  desc: string
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  goldenHoe: {
    id: 'goldenHoe',
    name: 'จอบทองคำ',
    emoji: '✨',
    cost: 300,
    desc: 'พรวนดินพร้อมกัน 3×3 ช่องในครั้งเดียว!',
  },
  goldenWater: {
    id: 'goldenWater',
    name: 'บัวรดน้ำทองคำ',
    emoji: '✨',
    cost: 350,
    desc: 'รดน้ำพร้อมกัน 3×3 ช่องในครั้งเดียว!',
  },
  speedBoots: {
    id: 'speedBoots',
    name: 'รองเท้าบูทวิ่งไว',
    emoji: '👟',
    cost: 250,
    desc: 'เดินเร็วขึ้น +40% ถาวร',
  },
  sprinkler: {
    id: 'sprinkler',
    name: 'สปริงเกอร์อัตโนมัติ',
    emoji: '⛲',
    cost: 120,
    desc: 'รดน้ำแปลงรอบข้าง 3×3 อัตโนมัติ (ใช้เงิน 120฿ หรือคราฟต์ด้วยไม้ 3 + หิน 2)',
  },
}

// จุดตัดไม้และตีหินแร่รอบฟาร์ม (งอกใหม่ทุก 30 วินาที)
export interface ForageSpotDef {
  id: string
  kind: 'tree' | 'rock' | 'crystal'
  x: number
  z: number
  scale: number
  maxHits: number
}

export const FORAGE_SPOTS: ForageSpotDef[] = [
  { id: 'tree-1', kind: 'tree', x: -7.8, z: -1.8, scale: 2.3, maxHits: 3 },
  { id: 'tree-2', kind: 'tree', x: -7.8, z: 2.6, scale: 2.4, maxHits: 3 },
  { id: 'tree-3', kind: 'tree', x: 7.9, z: -1.5, scale: 2.2, maxHits: 3 },
  { id: 'tree-4', kind: 'tree', x: 8.1, z: 2.2, scale: 2.4, maxHits: 3 },
  { id: 'tree-5', kind: 'tree', x: -2.6, z: -7.9, scale: 2.3, maxHits: 3 },
  { id: 'rock-1', kind: 'rock', x: -6.2, z: 5.6, scale: 0.55, maxHits: 3 },
  { id: 'rock-2', kind: 'rock', x: 1.8, z: -7.6, scale: 0.58, maxHits: 3 },
  { id: 'rock-3', kind: 'crystal', x: -8.2, z: 5.2, scale: 0.62, maxHits: 3 },
  { id: 'rock-4', kind: 'crystal', x: 7.8, z: -4.2, scale: 0.6, maxHits: 3 },
]

export const RESPAWN_MS = 30000

export function stageTimes(cropId: CropId): [number, number, number] {
  const total = CROPS[cropId]?.growTime ?? 12
  const each = +(total / 3).toFixed(2)
  return [each, each, +(total - each * 2).toFixed(2)]
}

export type ToolId =
  | 'auto'
  | 'hoe'
  | 'water'
  | 'seed-carrot'
  | 'seed-tomato'
  | 'seed-pumpkin'
  | 'harvest'
  | 'seed-strawberry'
  | 'seed-goldmelon'

export interface ToolDef {
  id: ToolId
  name: string
  emoji: string
  key: string
}

export const TOOLS: Record<ToolId, ToolDef> = {
  auto: { id: 'auto', name: 'Auto-Tool', emoji: '✨', key: 'Q' },
  hoe: { id: 'hoe', name: 'จอบพรวนดิน', emoji: '🟫', key: '1' },
  water: { id: 'water', name: 'บัวรดน้ำ', emoji: '💧', key: '2' },
  'seed-carrot': { id: 'seed-carrot', name: 'เมล็ดแครอท', emoji: '🥕', key: '3' },
  'seed-tomato': { id: 'seed-tomato', name: 'เมล็ดมะเขือเทศ', emoji: '🍅', key: '4' },
  'seed-pumpkin': { id: 'seed-pumpkin', name: 'เมล็ดฟักทอง', emoji: '🎃', key: '5' },
  harvest: { id: 'harvest', name: 'ตะกร้าเก็บ', emoji: '🧺', key: '6' },
  'seed-strawberry': { id: 'seed-strawberry', name: 'เมล็ดสตรอว์ฯ', emoji: '🍓', key: '7' },
  'seed-goldmelon': { id: 'seed-goldmelon', name: 'เมล็ดเมลอนทอง', emoji: '🍈', key: '8' },
}

export const HOTBAR_ORDER: ToolId[] = [
  'auto',
  'hoe',
  'water',
  'seed-carrot',
  'seed-tomato',
  'seed-pumpkin',
  'harvest',
  'seed-strawberry',
  'seed-goldmelon',
]

// สีชุดและหมวกของตัวละครสำหรับ Multiplayer Co-op
export interface OutfitOption {
  id: string
  name: string
  shirt: string
  hat: string
}

export const OUTFIT_COLORS: OutfitOption[] = [
  { id: 'meadow', name: 'เขียวทุ่งหญ้า', shirt: '#58b368', hat: '#eab308' },
  { id: 'berry', name: 'ชมพูสตรอว์เบอร์รี', shirt: '#f43f5e', hat: '#fde047' },
  { id: 'sky', name: 'ฟ้าสดใส', shirt: '#0ea5e9', hat: '#facc15' },
  { id: 'lavender', name: 'ม่วงลาเวนเดอร์', shirt: '#8b5cf6', hat: '#fbbf24' },
  { id: 'sunset', name: 'ส้มตะวันรอน', shirt: '#f97316', hat: '#fef08a' },
]

export interface EmoteOption {
  id: string
  emoji: string
  label: string
  text: string
}

export const EMOTES: EmoteOption[] = [
  { id: 'wave', emoji: '👋', label: 'ทักทาย', text: '👋 สวัสดีจ้า!' },
  { id: 'love', emoji: '❤️', label: 'รักเลย', text: '❤️ รักเลย!' },
  { id: 'yay', emoji: '🎉', label: 'เย้', text: '🎉 เย้ สำเร็จแล้ว!' },
  { id: 'water', emoji: '💧', label: 'ช่วยรดน้ำหน่อย', text: '💧 ช่วยรดน้ำแปลงผักหน่อย!' },
  { id: 'fish', emoji: '🐟', label: 'ไปตกปลากัน', text: '🐟 ไปตกปลาริมบ่อกันเถอะ!' },
]

export function xpNeeded(level: number): number {
  return 60 + (level - 1) * 50
}

export type PlotState = 'empty' | 'tilled' | 'seeded' | 'growing' | 'mature'

export const PLOT_COLORS: Record<PlotState, string> = {
  empty: '#8fce62',
  tilled: '#8b5a2b',
  seeded: '#6b4423',
  growing: '#6b4423',
  mature: '#6b4423',
}

export const WET_COLOR = '#4a2c14'

export function plotPosition(row: number, col: number): { x: number; z: number } {
  const offset = ((GRID_SIZE - 1) * PLOT_SPACING) / 2
  return {
    x: col * PLOT_SPACING - offset,
    z: row * PLOT_SPACING - offset,
  }
}

export function neighbors3x3(row: number, col: number): number[] {
  const out: number[] = []
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r >= 0 && c >= 0 && r < GRID_SIZE && c < GRID_SIZE) {
        out.push(r * GRID_SIZE + c)
      }
    }
  }
  return out
}

export interface SkyConfig {
  bg: string
  fog: string
  sunColor: string
  sunIntensity: number
  sunPos: [number, number, number]
  hemiSky: string
  hemiGround: string
  hemiInt: number
  lampOn: boolean
  night: boolean
  skyTurbidity: number
}

export function computeSky(clockMin: number): SkyConfig {
  const h = clockMin / 60
  const isNight = h < 5 || h >= 18.5
  const isSunset = !isNight && h >= 16 && h < 18.5
  const isDawn = !isNight && h >= 5 && h < 7
  if (isNight) {
    return {
      bg: '#0b1026',
      fog: '#141c3a',
      sunColor: '#a5b4fc',
      sunIntensity: 0.35,
      sunPos: [-6, 9, -4],
      hemiSky: '#1e2a5a',
      hemiGround: '#0f172a',
      hemiInt: 0.3,
      lampOn: true,
      night: true,
      skyTurbidity: 2,
    }
  }
  if (isSunset || isDawn) {
    return {
      bg: '#fdba74',
      fog: '#fed7aa',
      sunColor: '#fb923c',
      sunIntensity: 1.3,
      sunPos: [12, 3.5, 5],
      hemiSky: '#fdba74',
      hemiGround: '#86c25a',
      hemiInt: 0.45,
      lampOn: true,
      night: false,
      skyTurbidity: 9,
    }
  }
  return {
    bg: '#bfe3ff',
    fog: '#ffedd5',
    sunColor: '#fff1d6',
    sunIntensity: 1.55,
    sunPos: [9, 13, 7],
    hemiSky: '#bfe3ff',
    hemiGround: '#86c25a',
    hemiInt: 0.5,
    lampOn: false,
    night: false,
    skyTurbidity: 6,
  }
}
