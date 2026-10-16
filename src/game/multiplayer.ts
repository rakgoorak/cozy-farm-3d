import Peer, { DataConnection } from 'peerjs'
import {
  useFarmStore,
  registerSyncBroadcaster,
  SharedSyncPayload,
  RemotePeerData,
  ChatMessage,
} from '../store/farmStore'
import { sfx } from './sounds'

type Packet =
  | { type: 'hello'; peer: RemotePeerData; requestSync?: boolean }
  | { type: 'move'; peer: RemotePeerData }
  | { type: 'sync'; payload: SharedSyncPayload; senderId: string }
  | { type: 'chat'; msg: ChatMessage }
  | { type: 'emote'; peerId: string; text: string; until: number }
  | { type: 'bye'; peerId: string }

const PEER_PREFIX = 'cozyfarm3d-v3-room-'

let peerInstance: Peer | null = null
let connections: DataConnection[] = []
let bc: BroadcastChannel | null = null
let moveInterval: ReturnType<typeof setInterval> | null = null
let isHost = false

function normalizeRoomCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (!cleaned) return `FARM-${Math.floor(1000 + Math.random() * 9000)}`
  if (/^\d{4}$/.test(cleaned)) return `FARM-${cleaned}`
  return cleaned
}

function getLocalPeerData(): RemotePeerData {
  const st = useFarmStore.getState()
  const now = Date.now()
  const emoteActive = st.activeEmote && st.activeEmote.until > now ? st.activeEmote.text : null
  return {
    id: st.playerId,
    name: st.playerName,
    outfitId: st.outfitId,
    x: st.playerPos.x,
    z: st.playerPos.z,
    rotY: st.playerRotY,
    moving: st.playerMoving,
    acting: now - st.lastActAt < 550,
    emote: emoteActive,
    emoteUntil: st.activeEmote?.until ?? 0,
    updatedAt: now,
  }
}

function sendPacket(packet: Packet): void {
  try {
    bc?.postMessage(packet)
  } catch {
    /* ignore BroadcastChannel errors */
  }
  for (const conn of connections) {
    if (conn.open) {
      try {
        conn.send(packet)
      } catch {
        /* ignore WebRTC send errors */
      }
    }
  }
}

function handlePacket(packet: Packet, fromConn?: DataConnection): void {
  const st = useFarmStore.getState()
  if (packet.type === 'hello') {
    if (packet.peer.id === st.playerId) return
    st.upsertPeer(packet.peer)
    if (packet.requestSync) {
      const reply: Packet = {
        type: 'sync',
        payload: st.getSharedSnapshot(),
        senderId: st.playerId,
      }
      if (fromConn && fromConn.open) {
        fromConn.send(reply)
      } else {
        sendPacket(reply)
      }
      sendPacket({ type: 'hello', peer: getLocalPeerData(), requestSync: false })
    }
    return
  }

  if (packet.type === 'move') {
    if (packet.peer.id === st.playerId) return
    st.upsertPeer(packet.peer)
    if (isHost && fromConn) {
      // Relay move packet to other WebRTC clients in hub topology
      for (const c of connections) {
        if (c !== fromConn && c.open) c.send(packet)
      }
    }
    return
  }

  if (packet.type === 'sync') {
    if (packet.senderId === st.playerId) return
    st.applyRemoteSync(packet.payload)
    if (isHost && fromConn) {
      for (const c of connections) {
        if (c !== fromConn && c.open) c.send(packet)
      }
    }
    return
  }

  if (packet.type === 'chat') {
    if (packet.msg.senderId === st.playerId) return
    st.addChatMessage(packet.msg)
    sfx.chat()
    const senderPeer = st.peers[packet.msg.senderId]
    if (senderPeer) {
      st.upsertPeer({
        ...senderPeer,
        emote: `💬 ${packet.msg.text}`,
        emoteUntil: Date.now() + 4000,
      })
    }
    if (isHost && fromConn) {
      for (const c of connections) {
        if (c !== fromConn && c.open) c.send(packet)
      }
    }
    return
  }

  if (packet.type === 'emote') {
    if (packet.peerId === st.playerId) return
    const existing = st.peers[packet.peerId]
    if (existing) {
      st.upsertPeer({ ...existing, emote: packet.text, emoteUntil: packet.until })
      st.addFloater(existing.x, existing.z, packet.text, '#fef08a')
    }
    sfx.pop()
    if (isHost && fromConn) {
      for (const c of connections) {
        if (c !== fromConn && c.open) c.send(packet)
      }
    }
    return
  }

  if (packet.type === 'bye') {
    st.removePeer(packet.peerId)
  }
}

function attachConnection(conn: DataConnection): void {
  connections.push(conn)
  conn.on('open', () => {
    conn.send({
      type: 'hello',
      peer: getLocalPeerData(),
      requestSync: !isHost,
    } satisfies Packet)
    if (isHost) {
      conn.send({
        type: 'sync',
        payload: useFarmStore.getState().getSharedSnapshot(),
        senderId: useFarmStore.getState().playerId,
      } satisfies Packet)
    }
  })
  conn.on('data', (raw) => {
    if (raw && typeof raw === 'object' && 'type' in raw) {
      handlePacket(raw as Packet, conn)
    }
  })
  conn.on('close', () => {
    connections = connections.filter((c) => c !== conn)
  })
  conn.on('error', () => {
    connections = connections.filter((c) => c !== conn)
  })
}

function startHeartbeat(): void {
  if (moveInterval) clearInterval(moveInterval)
  moveInterval = setInterval(() => {
    const st = useFarmStore.getState()
    if (!st.roomCode) return
    sendPacket({ type: 'move', peer: getLocalPeerData() })
    // ลบ peer ที่ขาดการติดต่อเกิน 12 วินาที
    const now = Date.now()
    for (const [id, p] of Object.entries(st.peers)) {
      if (now - p.updatedAt > 12000) {
        st.removePeer(id)
      }
    }
  }, 110)
}

export function leaveRoom(): void {
  const st = useFarmStore.getState()
  if (st.roomCode) {
    sendPacket({ type: 'bye', peerId: st.playerId })
  }
  if (moveInterval) {
    clearInterval(moveInterval)
    moveInterval = null
  }
  for (const c of connections) {
    try {
      c.close()
    } catch {
      /* ignore */
    }
  }
  connections = []
  if (peerInstance) {
    try {
      peerInstance.destroy()
    } catch {
      /* ignore */
    }
    peerInstance = null
  }
  if (bc) {
    try {
      bc.close()
    } catch {
      /* ignore */
    }
    bc = null
  }
  st.clearPeers()
  st.setRoomCode(null)
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url.toString())
  }
}

export function startCoopRoom(customCode?: string, asHost = true): string {
  leaveRoom()
  const code = normalizeRoomCode(
    customCode ?? `FARM-${Math.floor(1000 + Math.random() * 9000)}`,
  )
  isHost = asHost
  const st = useFarmStore.getState()
  st.setRoomCode(code)

  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    url.searchParams.set('room', code)
    window.history.replaceState({}, '', url.toString())
  }

  // 1. เปิด BroadcastChannel เสมอ (เล่นหลายแท็บในเครื่องเดียวกันได้ทันที 100%)
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(`cozy-farm-bc-${code}`)
    bc.onmessage = (ev) => {
      if (ev.data && typeof ev.data === 'object' && 'type' in ev.data) {
        handlePacket(ev.data as Packet)
      }
    }
    bc.postMessage({
      type: 'hello',
      peer: getLocalPeerData(),
      requestSync: !asHost,
    } satisfies Packet)
  }

  // 2. เชื่อมต่อ PeerJS P2P ข้ามเครื่องผ่านอินเทอร์เน็ต
  try {
    const hostPeerId = `${PEER_PREFIX}${code}`
    if (asHost) {
      const p = new Peer(hostPeerId)
      peerInstance = p
      p.on('connection', (conn) => {
        attachConnection(conn)
      })
      p.on('error', (err) => {
        // หากรหัสห้องนี้มี Host อยู่แล้ว ให้สลับเป็นโหมด Join อัตโนมัติ
        if ((err as { type?: string }).type === 'unavailable-id') {
          isHost = false
          connectAsGuest(hostPeerId)
        }
      })
    } else {
      connectAsGuest(hostPeerId)
    }
  } catch {
    /* fallback to BroadcastChannel */
  }

  registerSyncBroadcaster((payload) => {
    sendPacket({
      type: 'sync',
      payload,
      senderId: useFarmStore.getState().playerId,
    })
  })

  startHeartbeat()
  st.setHint(`เข้าห้อง Co-op [${code}] แล้ว! คัดลอกลิงก์ส่งให้เพื่อนได้เลย 🤝`, 3400)
  return code
}

function connectAsGuest(hostPeerId: string): void {
  try {
    const guest = new Peer()
    peerInstance = guest
    guest.on('open', () => {
      const conn = guest.connect(hostPeerId, { reliable: true })
      attachConnection(conn)
    })
    guest.on('connection', (conn) => {
      attachConnection(conn)
    })
  } catch {
    /* ignore */
  }
}

export function sendCoopChat(text: string): void {
  const trimmed = text.trim()
  if (!trimmed) return
  const st = useFarmStore.getState()
  const msg: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderId: st.playerId,
    senderName: st.playerName,
    text: trimmed,
    at: Date.now(),
  }
  st.addChatMessage(msg)
  st.triggerEmote(`💬 ${trimmed}`)
  sfx.chat()
  sendPacket({ type: 'chat', msg })
}

export function sendCoopEmote(emoteText: string): void {
  const st = useFarmStore.getState()
  st.triggerEmote(emoteText)
  sfx.pop()
  sendPacket({
    type: 'emote',
    peerId: st.playerId,
    text: emoteText,
    until: Date.now() + 3600,
  })
}

export function initMultiplayerFromUrl(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const room = params.get('room')
  if (room && room.trim()) {
    startCoopRoom(room.trim(), false)
  }
}
