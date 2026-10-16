import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import {
  Coins,
  ShoppingCart,
  Volume2,
  VolumeX,
  Sun,
  Sprout,
  X,
  Sparkles,
  Shovel,
  Droplets,
  ShoppingBasket,
  ClipboardList,
  Settings,
  CloudRain,
  Lock,
  Users,
  Copy,
  Check,
  UtensilsCrossed,
  MessageSquare,
  Send,
  Zap,
  LucideIcon,
} from 'lucide-react'
import { useFarmStore, formatClock } from '../store/farmStore'
import {
  CROPS,
  CROP_IDS,
  ALL_ITEMS,
  ANIMALS,
  TOOLS,
  HOTBAR_ORDER,
  UPGRADES,
  RECIPES,
  DISH_IDS,
  EMOTES,
  OUTFIT_COLORS,
  xpNeeded,
  ToolId,
  CropId,
  ProduceKey,
  UpgradeId,
} from '../game/constants'
import { sfx } from '../game/sounds'
import { useCurrentTime } from '../game/useCurrentTime'
import { startCoopRoom, leaveRoom, sendCoopChat, sendCoopEmote } from '../game/multiplayer'

const TOOL_ICON: Partial<Record<ToolId, LucideIcon>> = {
  auto: Sparkles,
  hoe: Shovel,
  water: Droplets,
  harvest: ShoppingBasket,
}

function HotbarButton({ id }: { id: ToolId }) {
  const tool = useFarmStore((s) => s.tool)
  const setTool = useFarmStore((s) => s.setTool)
  const seeds = useFarmStore((s) => s.seeds)
  const level = useFarmStore((s) => s.level)
  const upgrades = useFarmStore((s) => s.upgrades)
  const active = tool === id
  const meta = TOOLS[id]
  const Icon = TOOL_ICON[id] ?? Sprout
  const isSeed = id.startsWith('seed-')
  const crop = isSeed ? (id.slice(5) as CropId) : null
  const count = crop ? (seeds[crop] ?? 0) : null
  const locked = crop ? level < CROPS[crop].unlockLv : false
  const golden =
    (id === 'hoe' && upgrades.goldenHoe) || (id === 'water' && upgrades.goldenWater)

  return (
    <button
      onClick={() => {
        if (locked && crop) {
          sfx.error()
          useFarmStore
            .getState()
            .setHint(`${CROPS[crop].emoji} ปลดล็อกที่ Lv.${CROPS[crop].unlockLv}`, 2400)
          return
        }
        setTool(id)
        sfx.click()
      }}
      className={`hotbar-slot ${active ? 'active' : ''} ${golden ? 'golden' : ''} ${locked ? 'locked' : ''}`}
      title={`${meta.name} (ปุ่ม ${meta.key})${locked && crop ? ` — ปลดล็อก Lv.${CROPS[crop].unlockLv}` : ''}`}
    >
      <span className="key">{meta.key}</span>
      {isSeed && crop ? (
        <span className="t-emoji">{locked ? '🔒' : CROPS[crop].emoji}</span>
      ) : (
        <Icon size={22} strokeWidth={2.2} />
      )}
      <span className="t-name">{locked && crop ? `Lv.${CROPS[crop].unlockLv}` : meta.name}</span>
      {count !== null && !locked && (
        <span className={`t-count ${count === 0 ? 'empty' : ''}`}>x{count}</span>
      )}
    </button>
  )
}

function CoopModal() {
  const coopOpen = useFarmStore((s) => s.coopOpen)
  const setCoopOpen = useFarmStore((s) => s.setCoopOpen)
  const roomCode = useFarmStore((s) => s.roomCode)
  const playerName = useFarmStore((s) => s.playerName)
  const outfitId = useFarmStore((s) => s.outfitId)
  const setPlayerProfile = useFarmStore((s) => s.setPlayerProfile)
  const peers = useFarmStore((s) => s.peers)

  const [nameInput, setNameInput] = useState(playerName)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [copied, setCopied] = useState(false)

  if (!coopOpen) return null

  const peerList = Object.values(peers)

  const handleCopyLink = () => {
    if (!roomCode || typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('room', roomCode)
    navigator.clipboard.writeText(url.toString())
    setCopied(true)
    sfx.coin()
    useFarmStore.getState().setHint('คัดลอกลิงก์ชวนเพื่อนเรียบร้อย! ส่งให้เพื่อนเข้าเล่นได้เลย 📋', 3200)
    setTimeout(() => setCopied(false), 2600)
  }

  return (
    <div className="shop-overlay" onClick={() => setCoopOpen(false)}>
      <div className="shop" onClick={(e) => e.stopPropagation()}>
        <div className="shop-head">
          <div>
            <div className="shop-title">🤝 Multiplayer Co-op ฟาร์มร่วมกัน</div>
            <div className="s-sub">เล่นกับเพื่อนแบบ Real-time P2P ไม่ต้องตั้งค่าเซิร์ฟเวอร์</div>
          </div>
          <button className="icon-btn" onClick={() => setCoopOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* ปรับแต่งโปรไฟล์ผู้เล่น */}
        <div className="shop-section">โปรไฟล์ของคุณ</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <input
            type="text"
            className="input-text"
            value={nameInput}
            maxLength={18}
            placeholder="ชื่อชาวนาของคุณ..."
            onChange={(e) => {
              setNameInput(e.target.value)
              setPlayerProfile(e.target.value, outfitId)
            }}
          />
        </div>

        <div className="s-sub" style={{ marginBottom: 6 }}>
          เลือกสีชุดและหมวก:
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {OUTFIT_COLORS.map((o) => (
            <button
              key={o.id}
              className={`outfit-btn ${outfitId === o.id ? 'active' : ''}`}
              onClick={() => {
                setPlayerProfile(nameInput, o.id)
                sfx.click()
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: o.shirt,
                  marginRight: 6,
                }}
              />
              {o.name}
            </button>
          ))}
        </div>

        {/* สถานะห้อง Co-op */}
        {roomCode ? (
          <div>
            <div className="shop-section">ห้อง Co-op ปัจจุบัน</div>
            <div className="room-banner">
              <div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>รหัสห้อง:</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', letterSpacing: 1 }}>
                  {roomCode}
                </div>
              </div>
              <button className="btn copy-btn" onClick={handleCopyLink}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์ชวนเพื่อน'}
              </button>
            </div>

            <div className="s-sub" style={{ margin: '10px 0 6px' }}>
              ผู้เล่นในฟาร์ม ({peerList.length + 1} คน):
            </div>
            <div className="peer-list">
              <div className="peer-chip me">
                👑 {playerName} (คุณ)
              </div>
              {peerList.map((p) => (
                <div key={p.id} className="peer-chip">
                  🧑‍🌾 {p.name}
                </div>
              ))}
            </div>

            <button
              className="btn danger"
              style={{ width: '100%', marginTop: 14 }}
              onClick={() => {
                leaveRoom()
                sfx.click()
              }}
            >
              ออกจากห้อง Co-op
            </button>
          </div>
        ) : (
          <div>
            <div className="shop-section">เริ่มเล่น Co-op</div>
            <button
              className="btn create-room-btn"
              onClick={() => {
                startCoopRoom()
                sfx.levelup()
              }}
            >
              <Users size={18} /> สร้างห้องใหม่ (Create Room)
            </button>

            <div style={{ margin: '14px 0 6px', textAlign: 'center', opacity: 0.6, fontSize: 13 }}>
              — หรือเข้าร่วมห้องที่มีอยู่แล้ว —
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input-text"
                placeholder="กรอกรหัสห้อง (เช่น 4829)..."
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
              />
              <button
                className="btn buy"
                disabled={!joinCodeInput.trim()}
                onClick={() => {
                  startCoopRoom(joinCodeInput.trim(), false)
                  sfx.click()
                }}
              >
                เข้าร่วม
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CookingModal() {
  const cookOpen = useFarmStore((s) => s.cookOpen)
  const setCookOpen = useFarmStore((s) => s.setCookOpen)
  const produce = useFarmStore((s) => s.produce)
  const speedBuffUntil = useFarmStore((s) => s.speedBuffUntil)
  const cookDish = useFarmStore((s) => s.cookDish)
  const eatDish = useFarmStore((s) => s.eatDish)
  const craftSprinkler = useFarmStore((s) => s.craftSprinkler)
  const now = useCurrentTime()

  if (!cookOpen) return null

  const buffActive = speedBuffUntil > now
  const buffSec = buffActive ? Math.ceil((speedBuffUntil - now) / 1000) : 0

  return (
    <div className="shop-overlay" onClick={() => setCookOpen(false)}>
      <div className="shop" onClick={(e) => e.stopPropagation()}>
        <div className="shop-head">
          <div>
            <div className="shop-title">🍳 โรงครัวแปรรูปอาหาร & คราฟต์ของ</div>
            <div className="s-sub">
              แปรรูปผลผลิตฟาร์มและปลาเป็นอาหารมูลค่าสูง (×2.5) หรือกินเพื่อวิ่งไว!
            </div>
          </div>
          <button className="icon-btn" onClick={() => setCookOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {buffActive && (
          <div className="buff-banner">
            <Zap size={18} /> บัฟวิ่งไว +50% กำลังทำงาน (เหลือ {buffSec} วินาที)
          </div>
        )}

        <div className="shop-section">เมนูอาหาร</div>
        {DISH_IDS.map((did) => {
          const r = RECIPES[did]
          const canCook = Object.entries(r.ingredients).every(
            ([ing, need]) => (produce[ing as ProduceKey] ?? 0) >= (need ?? 0),
          )
          const haveDish = (produce[did] ?? 0) > 0

          return (
            <div key={did} className="shop-row">
              <span className="s-emoji">{r.emoji}</span>
              <div className="s-info">
                <div className="s-name">
                  {r.name} {haveDish && <span className="have"> (มี x{produce[did]})</span>}
                </div>
                <div className="s-sub">
                  วัตถุดิบ:{' '}
                  {Object.entries(r.ingredients)
                    .map(([ing, need]) => {
                      const item = ALL_ITEMS[ing as ProduceKey]
                      const current = produce[ing as ProduceKey] ?? 0
                      return `${item?.emoji || ''} ${current}/${need}`
                    })
                    .join(' • ')}
                </div>
                <div className="s-sub" style={{ color: '#ea580c' }}>
                  {r.desc}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="btn buy" disabled={!canCook} onClick={() => cookDish(did)}>
                  ปรุง ({r.sellPrice}฿)
                </button>
                {haveDish && (
                  <button className="btn eat-btn" onClick={() => eatDish(did)}>
                    ⚡ ทาน
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <div className="shop-section">คราฟต์สปริงเกอร์อัตโนมัติ</div>
        <div className="shop-row">
          <span className="s-emoji">⛲</span>
          <div className="s-info">
            <div className="s-name">สปริงเกอร์รดน้ำ 3×3</div>
            <div className="s-sub">
              ใช้วัตถุดิบ: 🪵 ท่อนไม้ ({produce.wood ?? 0}/3) • 🪨 หินแร่ ({produce.stone ?? 0}/2)
            </div>
          </div>
          <button
            className="btn buy"
            disabled={(produce.wood ?? 0) < 3 || (produce.stone ?? 0) < 2}
            onClick={craftSprinkler}
          >
            คราฟต์ & วาง
          </button>
        </div>
      </div>
    </div>
  )
}

function ShopModal() {
  const shopOpen = useFarmStore((s) => s.shopOpen)
  const setShopOpen = useFarmStore((s) => s.setShopOpen)
  const money = useFarmStore((s) => s.money)
  const seeds = useFarmStore((s) => s.seeds)
  const produce = useFarmStore((s) => s.produce)
  const level = useFarmStore((s) => s.level)
  const upgrades = useFarmStore((s) => s.upgrades)
  const animals = useFarmStore((s) => s.animals)
  const buySeed = useFarmStore((s) => s.buySeed)
  const buyUpgrade = useFarmStore((s) => s.buyUpgrade)
  const buyAnimal = useFarmStore((s) => s.buyAnimal)
  const sellAll = useFarmStore((s) => s.sellAll)
  const [tab, setTab] = useState<'seeds' | 'upgrades' | 'animals'>('seeds')

  if (!shopOpen) return null
  const totalProduce = Object.values(produce).reduce((a, b) => a + b, 0)
  const totalValue = Object.entries(produce).reduce((sum, [k, n]) => {
    const itemPrice = ALL_ITEMS[k as ProduceKey]?.sellPrice ?? 0
    return sum + n * itemPrice
  }, 0)

  const upgradeIds: Array<Exclude<UpgradeId, 'sprinkler'>> = [
    'goldenHoe',
    'goldenWater',
    'speedBoots',
  ]

  return (
    <div className="shop-overlay" onClick={() => setShopOpen(false)}>
      <div className="shop" onClick={(e) => e.stopPropagation()}>
        <div className="shop-head">
          <div>
            <div className="shop-title">🏪 ร้านค้าเกษตร & คลังสินค้า</div>
            <div className="shop-money">
              <Coins size={16} /> {money}฿
            </div>
          </div>
          <button className="icon-btn" onClick={() => setShopOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="shop-tabs">
          {(
            [
              ['seeds', '🌱 เมล็ด & ผลผลิต'],
              ['upgrades', '⚙️ อัปเกรด'],
              ['animals', '🐤 ปศุสัตว์'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={`shop-tab ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'seeds' && (
          <>
            {CROP_IDS.map((id) => {
              const c = CROPS[id]
              const locked = level < c.unlockLv
              const afford = money >= c.seedCost
              return (
                <div key={id} className="shop-row">
                  <span className="s-emoji">{locked ? '🔒' : c.emoji}</span>
                  <div className="s-info">
                    <div className="s-name">
                      เมล็ด{c.name} <span className="have">มี x{seeds[id] ?? 0}</span>
                    </div>
                    <div className="s-sub">
                      {locked
                        ? `ปลดล็อกที่ Lv.${c.unlockLv}`
                        : `โต ${c.growTime} วิ • ขายได้ ${c.sellPrice}฿`}
                    </div>
                  </div>
                  <button
                    className="btn buy"
                    disabled={locked || !afford}
                    onClick={() => buySeed(id, 1)}
                  >
                    {locked ? <Lock size={14} /> : `${c.seedCost}฿`}
                  </button>
                  <button
                    className="btn buy multi"
                    disabled={locked || money < c.seedCost * 5}
                    onClick={() => buySeed(id, 5)}
                  >
                    x5
                  </button>
                </div>
              )
            })}
            <div className="shop-section">
              คลังผลผลิต, ปลา, วัตถุดิบ & อาหาร ({totalProduce} ชิ้น)
            </div>
            {Object.entries(produce).map(([id, qty]) => {
              if (qty <= 0) return null
              const meta = ALL_ITEMS[id as ProduceKey]
              if (!meta) return null
              return (
                <div key={id} className="shop-row static">
                  <span className="s-emoji">{meta.emoji}</span>
                  <div className="s-info">
                    <div className="s-name">
                      {meta.name} <span className="s-sub">({meta.sellPrice}฿/ชิ้น)</span>
                    </div>
                  </div>
                  <span className="have">
                    x{qty} = {qty * meta.sellPrice}฿
                  </span>
                </div>
              )
            })}
            <button className="btn sell-all" disabled={totalProduce === 0} onClick={sellAll}>
              <ShoppingBasket size={17} /> ขายสินค้าทั้งหมด (Sell All) +{totalValue}฿
            </button>
          </>
        )}

        {tab === 'upgrades' && (
          <>
            {upgradeIds.map((uid) => {
              const u = UPGRADES[uid]
              const owned = !!upgrades[uid]
              return (
                <div key={uid} className="shop-row">
                  <span className="s-emoji">{u.emoji}</span>
                  <div className="s-info">
                    <div className="s-name">
                      {u.name} {owned && <span className="have">✓ มีแล้ว</span>}
                    </div>
                    <div className="s-sub">{u.desc}</div>
                  </div>
                  <button
                    className="btn buy"
                    disabled={owned || money < u.cost}
                    onClick={() => buyUpgrade(uid)}
                  >
                    {owned ? '✓' : `${u.cost}฿`}
                  </button>
                </div>
              )
            })}
            <div className="shop-row">
              <span className="s-emoji">⛲</span>
              <div className="s-info">
                <div className="s-name">
                  {UPGRADES.sprinkler.name}{' '}
                  <span className="have">ติดตั้งแล้ว x{upgrades.sprinklers.length}</span>
                </div>
                <div className="s-sub">{UPGRADES.sprinkler.desc}</div>
              </div>
              <button
                className="btn buy"
                disabled={money < UPGRADES.sprinkler.cost}
                onClick={() => buyUpgrade('sprinkler')}
              >
                {UPGRADES.sprinkler.cost}฿
              </button>
            </div>
          </>
        )}

        {tab === 'animals' && (
          <>
            <div className="s-sub" style={{ marginBottom: 6 }}>
              สัตว์จะเดินเล่นในคอก ผลิตของให้เก็บทุก 20 วินาที หรือคลิกลูบหัวเพื่อให้ผลิตไวขึ้น ❤️
            </div>
            {Object.values(ANIMALS).map((a) => {
              const count = animals.filter((x) => x.kind === a.id).length
              return (
                <div key={a.id} className="shop-row">
                  <span className="s-emoji">{a.emoji}</span>
                  <div className="s-info">
                    <div className="s-name">
                      {a.name} <span className="have">มี x{count}</span>
                    </div>
                    <div className="s-sub">
                      ผลิต{ALL_ITEMS[a.good]?.name}ทุก 20 วิ (ขายได้ {ALL_ITEMS[a.good]?.sellPrice}฿)
                    </div>
                  </div>
                  <button
                    className="btn buy"
                    disabled={money < a.cost}
                    onClick={() => buyAnimal(a.id)}
                  >
                    {a.cost}฿
                  </button>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

function OrderBoard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const orders = useFarmStore((s) => s.orders)
  const produce = useFarmStore((s) => s.produce)
  const deliverOrder = useFarmStore((s) => s.deliverOrder)
  if (!open) return null
  return (
    <div className="order-panel">
      <div className="order-head">
        <span>📋 กระดานออเดอร์ Co-op (โบนัส ×1.5!)</span>
        <button className="icon-btn sm" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      {orders.map((o) => {
        const ready = o.items.every((it) => (produce[it.crop] ?? 0) >= it.need)
        return (
          <div key={o.id} className="order-card">
            <div className="order-items">
              {o.items.map((it) => {
                const have = produce[it.crop] ?? 0
                const ok = have >= it.need
                return (
                  <div key={it.crop} className={`order-item ${ok ? 'ok' : ''}`}>
                    {CROPS[it.crop].emoji} {have}/{it.need}
                  </div>
                )
              })}
            </div>
            <div className="order-reward">
              +{o.reward}฿ • +{o.xp} XP
            </div>
            <button className="btn deliver" disabled={!ready} onClick={() => deliverOrder(o.id)}>
              ส่งออเดอร์
            </button>
          </div>
        )
      })}
    </div>
  )
}

function SettingsMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const resetSave = useFarmStore((s) => s.resetSave)
  const [arm, setArm] = useState(false)
  if (!open) return null
  return (
    <div className="settings-panel">
      <div className="settings-title">⚙️ ตั้งค่า</div>
      <div className="s-sub">เกมบันทึกข้อมูลฟาร์มลงเครื่องอัตโนมัติ 💾</div>
      {!arm ? (
        <button className="btn danger" onClick={() => setArm(true)}>
          เริ่มฟาร์มใหม่ (Reset Save)
        </button>
      ) : (
        <div className="reset-confirm">
          <div className="s-sub">ยืนยันการล้างข้อมูลฟาร์มทั้งหมด?</div>
          <div className="reset-row">
            <button
              className="btn danger"
              onClick={() => {
                resetSave()
                setArm(false)
                onClose()
              }}
            >
              ลบเลย!
            </button>
            <button className="btn ghost" onClick={() => setArm(false)}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function HUD() {
  const money = useFarmStore((s) => s.money)
  const day = useFarmStore((s) => s.day)
  const clockMin = useFarmStore((s) => s.clockMin)
  const hint = useFarmStore((s) => s.hint)
  const muted = useFarmStore((s) => s.muted)
  const toggleMute = useFarmStore((s) => s.toggleMute)
  const setShopOpen = useFarmStore((s) => s.setShopOpen)
  const setCookOpen = useFarmStore((s) => s.setCookOpen)
  const setCoopOpen = useFarmStore((s) => s.setCoopOpen)
  const roomCode = useFarmStore((s) => s.roomCode)
  const peers = useFarmStore((s) => s.peers)
  const sellAll = useFarmStore((s) => s.sellAll)
  const level = useFarmStore((s) => s.level)
  const xp = useFarmStore((s) => s.xp)
  const weatherType = useFarmStore((s) => s.weather.type)
  const produce = useFarmStore((s) => s.produce)
  const chatMessages = useFarmStore((s) => s.chatMessages)
  const lastHarvest = useFarmStore((s) => s.lastHarvest)
  const lastLevelUp = useFarmStore((s) => s.lastLevelUp)
  const lastOrder = useFarmStore((s) => s.lastOrder)

  const [orderOpen, setOrderOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')

  useEffect(() => {
    if (!lastHarvest || lastHarvest.mature) return
    confetti({
      particleCount: 75,
      spread: 75,
      origin: { y: 0.75 },
      colors: ['#f97316', '#fbbf24', '#4ade80', '#ffffff'],
      disableForReducedMotion: true,
    })
  }, [lastHarvest])

  useEffect(() => {
    if (!lastLevelUp) return
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 }, disableForReducedMotion: true })
  }, [lastLevelUp])

  useEffect(() => {
    if (!lastOrder) return
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.7 }, disableForReducedMotion: true })
  }, [lastOrder])

  const produceCount = Object.values(produce).reduce((a, b) => a + b, 0)
  const produceValue = Object.entries(produce).reduce((sum, [k, n]) => {
    const itemPrice = ALL_ITEMS[k as ProduceKey]?.sellPrice ?? 0
    return sum + n * itemPrice
  }, 0)
  const need = xpNeeded(level)
  const peerCount = Object.keys(peers).length + 1

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    sendCoopChat(chatInput.trim())
    setChatInput('')
  }

  return (
    <div className="hud">
      <div className="topbar">
        <div className="brand">
          <span className="logo">🚜</span>
          <div>
            <div className="title">Cozy Farm 3D</div>
            <div className="subtitle">
              <Sun size={12} /> วันที่ {day} • {formatClock(clockMin)} น.
              {weatherType === 'rainy' && (
                <span className="weather-badge">
                  <CloudRain size={12} /> ฝนตก
                </span>
              )}
            </div>
          </div>
          <div className="level-badge" title={`เลเวล ${level} (${xp}/${need} XP)`}>
            <span className="lv">Lv.{level}</span>
            <div className="xpbar">
              <div className="xpfill" style={{ width: `${Math.min(100, (xp / need) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="stats">
          <div className="stat coins">
            <Coins size={20} />
            <span className="value">{money}฿</span>
          </div>

          <div className="stat">
            <Sprout size={18} />
            <span className="value">{produceCount}</span>
            <span className="label">สินค้า</span>
            {produceCount > 0 && (
              <button
                className="btn sell small"
                onClick={sellAll}
                title="ขายผลผลิตทั้งหมดในคลังทันที"
              >
                ขาย +{produceValue}฿
              </button>
            )}
          </div>

          {/* ปุ่ม Co-op เล่นกับเพื่อน */}
          <button
            className={`btn coop-btn ${roomCode ? 'active' : ''}`}
            onClick={() => setCoopOpen(true)}
          >
            <Users size={16} />
            {roomCode ? `Co-op [${roomCode}] (${peerCount})` : 'เล่นกับเพื่อน'}
          </button>

          {/* ปุ่มโรงครัว */}
          <button className="btn cook-btn" onClick={() => setCookOpen(true)}>
            <UtensilsCrossed size={16} /> โรงครัว
          </button>

          <button
            className="btn shop-btn"
            onClick={() => {
              setOrderOpen((v) => !v)
              setSettingsOpen(false)
              sfx.click()
            }}
          >
            <ClipboardList size={16} /> ออเดอร์
          </button>

          <button
            className="btn shop-btn"
            onClick={() => {
              setShopOpen(true)
              sfx.click()
            }}
          >
            <ShoppingCart size={16} /> ร้านค้า
          </button>

          <button className="icon-btn" onClick={toggleMute} title="เปิด/ปิดเสียง (M)">
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              setSettingsOpen((v) => !v)
              setOrderOpen(false)
              sfx.click()
            }}
            title="ตั้งค่า"
          >
            <Settings size={19} />
          </button>
        </div>
      </div>

      {hint && <div className="hint">{hint}</div>}

      {/* Floating Emote Bar & Chat บนแถบล่าง */}
      <div className="bottombar">
        <div className="emote-bar">
          {EMOTES.map((em) => (
            <button
              key={em.id}
              className="emote-btn"
              onClick={() => sendCoopEmote(em.text)}
              title={em.label}
            >
              {em.emoji}
            </button>
          ))}
          <button
            className={`emote-btn ${chatOpen ? 'active' : ''}`}
            onClick={() => setChatOpen((v) => !v)}
            title="แชทข้อความ"
          >
            <MessageSquare size={16} />
          </button>
        </div>

        {chatOpen && (
          <form className="chat-box" onSubmit={handleSendChat}>
            <input
              type="text"
              className="chat-input"
              placeholder="พิมพ์ข้อความคุยกับเพื่อน..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="chat-send-btn">
              <Send size={15} />
            </button>
          </form>
        )}

        <div className="hotbar">
          {HOTBAR_ORDER.map((id) => (
            <HotbarButton key={id} id={id} />
          ))}
        </div>

        <div className="help">
          <span>
            <kbd>WASD</kbd> เดิน
          </span>
          {' • '}
          <span>
            <kbd>Space</kbd> / <kbd>E</kbd> / <kbd>คลิก</kbd> ทำฟาร์ม/ตกปลา/ตัดไม้
          </span>
          {' • '}
          <span>
            <kbd>1-6</kbd> อุปกรณ์
          </span>
          {' • '}
          <span>
            <kbd>Q</kbd> Auto-Tool ✨
          </span>
        </div>
      </div>

      {/* บับเบิ้ลแชทลอยล่าสุด */}
      {chatMessages.length > 0 && (
        <div className="live-chat-overlay">
          {chatMessages.slice(-3).map((m) => (
            <div key={m.id} className="live-chat-bubble">
              <span className="sender">{m.senderName}:</span> {m.text}
            </div>
          ))}
        </div>
      )}

      <OrderBoard open={orderOpen} onClose={() => setOrderOpen(false)} />
      <SettingsMenu open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ShopModal />
      <CookingModal />
      <CoopModal />
    </div>
  )
}
