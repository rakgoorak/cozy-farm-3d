import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useFarmStore } from '../store/farmStore'
import { FORAGE_SPOTS, ForageSpotDef } from '../game/constants'
import { KenneyModel, FallbackTree } from './ModelWithFallback'
import { useCurrentTime } from '../game/useCurrentTime'

function ForageNodeItem({ spot }: { spot: ForageSpotDef }) {
  const node = useFarmStore((s) => s.forageNodes[spot.id])
  const hitForageNode = useFarmStore((s) => s.hitForageNode)
  const playerPos = useFarmStore((s) => s.playerPos)

  const group = useRef<THREE.Group>(null)
  const dist = Math.hypot(playerPos.x - spot.x, playerPos.z - spot.z)
  const inRange = dist <= 2.4

  const now = useCurrentTime()
  const isRespawning = Boolean(node && node.respawnAt > 0 && now < node.respawnAt)
  const secLeft = isRespawning && node ? Math.max(0, Math.ceil((node.respawnAt - now) / 1000)) : 0

  useFrame(() => {
    if (!group.current) return
    if (node && Date.now() - node.lastHitAt < 280) {
      // Hit shake animation
      group.current.rotation.z = Math.sin(Date.now() * 0.05) * 0.12
    } else {
      group.current.rotation.z = 0
    }
  })

  return (
    <group
      ref={group}
      position={[spot.x, 0, spot.z]}
      onClick={(e) => {
        e.stopPropagation()
        hitForageNode(spot.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {/* ถ้ากำลังงอกใหม่ (Respawning) แสดงตอไม้หรือเศษหิน */}
      {isRespawning ? (
        <group>
          {spot.kind === 'tree' ? (
            <mesh position={[0, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.28, 0.4, 8]} />
              <meshStandardMaterial color="#7c4a21" roughness={0.9} />
            </mesh>
          ) : (
            <mesh position={[0, 0.1, 0]} castShadow>
              <dodecahedronGeometry args={[0.2, 0]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.9} />
            </mesh>
          )}

          {inRange && (
            <Billboard position={[0, 0.8, 0]}>
              <Text
                fontSize={0.2}
                color="#fde047"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="#1e293b"
              >
                {`⏳ งอกใหม่ใน ${secLeft}s`}
              </Text>
            </Billboard>
          )}
        </group>
      ) : (
        <group>
          {/* ต้นไม้เต็มต้น */}
          {spot.kind === 'tree' && (
            <group scale={spot.scale}>
              <KenneyModel src="/models/tree.glb" fallback={<FallbackTree />} />
            </group>
          )}

          {/* ก้อนหินแร่ */}
          {spot.kind === 'rock' && (
            <group position={[0, spot.scale * 0.4, 0]}>
              <mesh castShadow receiveShadow>
                <dodecahedronGeometry args={[spot.scale, 1]} />
                <meshStandardMaterial color="#64748b" roughness={0.8} flatShading />
              </mesh>
              {/* แร่สะท้อนแสง */}
              <mesh position={[0.1, 0.1, 0.2]}>
                <boxGeometry args={[0.12, 0.12, 0.12]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          )}

          {/* ก้อนคริสตัลเรืองแสง */}
          {spot.kind === 'crystal' && (
            <group position={[0, spot.scale * 0.5, 0]}>
              <mesh castShadow>
                <octahedronGeometry args={[spot.scale * 0.9, 0]} />
                <meshStandardMaterial
                  color="#c084fc"
                  emissive="#a855f7"
                  emissiveIntensity={0.6}
                  roughness={0.2}
                />
              </mesh>
              {[-0.2, 0.2].map((ox, i) => (
                <mesh key={i} position={[ox, -0.15, 0.1]} rotation={[0.2, i, 0.2]}>
                  <coneGeometry args={[0.14, 0.45, 6]} />
                  <meshStandardMaterial
                    color="#e879f9"
                    emissive="#d946ef"
                    emissiveIntensity={0.5}
                    roughness={0.2}
                  />
                </mesh>
              ))}
            </group>
          )}

          {/* ป้ายบอกสถานะเมื่ออยู่ในระยะ */}
          {inRange && (
            <Billboard position={[0, spot.kind === 'tree' ? 2.5 : 1.1, 0]}>
              <Text
                fontSize={0.22}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="#0f172a"
              >
                {spot.kind === 'tree'
                  ? `🪓 ตัดไม้ (${node ? node.hits : 0}/${spot.maxHits})`
                  : spot.kind === 'crystal'
                    ? `💎 ขุดคริสตัล (${node ? node.hits : 0}/${spot.maxHits})`
                    : `⛏️ ทุบหินแร่ (${node ? node.hits : 0}/${spot.maxHits})`}
              </Text>
            </Billboard>
          )}
        </group>
      )}
    </group>
  )
}

export function ForagingNodes() {
  return (
    <group>
      {FORAGE_SPOTS.map((spot) => (
        <ForageNodeItem key={spot.id} spot={spot} />
      ))}
    </group>
  )
}
