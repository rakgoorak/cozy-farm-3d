import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useFarmStore, RemotePeerData } from '../store/farmStore'
import { OUTFIT_COLORS } from '../game/constants'
import { useCurrentTime } from '../game/useCurrentTime'

function RemotePlayer({ peer }: { peer: RemotePeerData }) {
  const group = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const targetPos = useRef(new THREE.Vector3(peer.x, 0, peer.z))
  const walkTime = useRef(0)

  const outfit = OUTFIT_COLORS.find((o) => o.id === peer.outfitId) ?? OUTFIT_COLORS[0]
  const now = useCurrentTime()
  const showEmote = Boolean(peer.emote && peer.emoteUntil > now)

  useFrame((_, delta) => {
    if (!group.current) return
    const dt = Math.min(delta, 0.05)
    targetPos.current.set(peer.x, 0, peer.z)
    group.current.position.lerp(targetPos.current, 1 - Math.exp(-12 * dt))

    // Smooth rotation
    let diff = peer.rotY - group.current.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    group.current.rotation.y += diff * Math.min(1, dt * 14)

    if (peer.moving) {
      walkTime.current += dt * 10
      const t = walkTime.current
      group.current.position.y = Math.abs(Math.sin(t)) * 0.09
      if (bodyRef.current) {
        bodyRef.current.rotation.z = Math.sin(t) * 0.05
        bodyRef.current.position.y = 0.62 + Math.abs(Math.cos(t)) * 0.02
      }
      const swing = Math.sin(t) * 0.7
      if (armL.current) armL.current.rotation.x = swing
      if (armR.current) armR.current.rotation.x = -swing
      if (legL.current) legL.current.rotation.x = -swing * 0.9
      if (legR.current) legR.current.rotation.x = swing * 0.9
    } else {
      const idle = Date.now() * 0.002
      group.current.position.y = peer.acting
        ? Math.abs(Math.sin(idle * 6)) * 0.12
        : Math.sin(idle) * 0.015
      if (bodyRef.current) {
        bodyRef.current.rotation.z = 0
        bodyRef.current.position.y = 0.62 + Math.sin(idle) * 0.008
      }
      for (const r of [armL, armR, legL, legR]) {
        if (r.current) r.current.rotation.x *= 0.85
      }
    }
  })

  return (
    <group ref={group} position={[peer.x, 0, peer.z]}>
      {/* เงาใต้ตัวละคร */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.42, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>

      {/* ป้ายชื่อลอยเหนือหัว */}
      <Billboard position={[0, 1.95, 0]}>
        <Text
          fontSize={0.24}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#1c1917"
        >
          {peer.name || 'เพื่อนชาวนา'}
        </Text>
        {showEmote && (
          <group position={[0, 0.38, 0]}>
            <Text
              fontSize={0.34}
              color="#fef08a"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="#1c1917"
            >
              {peer.emote}
            </Text>
          </group>
        )}
      </Billboard>

      {/* ตัวละคร 3D สไตล์ Chibi ตามสีที่เพื่อนเลือก */}
      <group>
        <group ref={legL} position={[-0.14, 0.32, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <boxGeometry args={[0.19, 0.3, 0.22]} />
            <meshStandardMaterial color="#5b3a1e" roughness={0.9} />
          </mesh>
        </group>
        <group ref={legR} position={[0.14, 0.32, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <boxGeometry args={[0.19, 0.3, 0.22]} />
            <meshStandardMaterial color="#5b3a1e" roughness={0.9} />
          </mesh>
        </group>
        <group ref={bodyRef} position={[0, 0.62, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.58, 0.55, 0.42]} />
            <meshStandardMaterial color={outfit.shirt} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.05, 0.215]} castShadow>
            <boxGeometry args={[0.34, 0.32, 0.03]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.06, 0.218]}>
            <boxGeometry args={[0.12, 0.1, 0.025]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.7} />
          </mesh>
        </group>
        <group ref={armL} position={[-0.38, 0.82, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <boxGeometry args={[0.17, 0.44, 0.19]} />
            <meshStandardMaterial color="#ffd9b3" roughness={0.8} />
          </mesh>
        </group>
        <group ref={armR} position={[0.38, 0.82, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <boxGeometry args={[0.17, 0.44, 0.19]} />
            <meshStandardMaterial color="#ffd9b3" roughness={0.8} />
          </mesh>
        </group>
        <group position={[0, 1.18, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.52, 0.46, 0.46]} />
            <meshStandardMaterial color="#ffdfc4" roughness={0.7} />
          </mesh>
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} position={[x, 0.03, 0.235]}>
              <boxGeometry args={[0.075, 0.11, 0.02]} />
              <meshStandardMaterial color="#1f2937" roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[0, 0.29, 0]} castShadow>
            <cylinderGeometry args={[0.46, 0.46, 0.06, 16]} />
            <meshStandardMaterial color={outfit.hat} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.27, 0.3, 0.2, 12]} />
            <meshStandardMaterial color={outfit.hat} roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export function RemotePlayers() {
  const peers = useFarmStore((s) => s.peers)
  const peerList = Object.values(peers)
  if (!peerList.length) return null

  return (
    <group>
      {peerList.map((p) => (
        <RemotePlayer key={p.id} peer={p} />
      ))}
    </group>
  )
}
