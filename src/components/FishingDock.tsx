import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useFarmStore } from '../store/farmStore'
import { DOCK_POS } from '../game/constants'

export function FishingDock() {
  const fishing = useFarmStore((s) => s.fishing)
  const triggerFishing = useFarmStore((s) => s.triggerFishing)
  const playerPos = useFarmStore((s) => s.playerPos)

  const bobberRef = useRef<THREE.Group>(null)
  const alertRef = useRef<THREE.Group>(null)

  const dist = Math.hypot(playerPos.x - DOCK_POS.x, playerPos.z - DOCK_POS.z)
  const inRange = dist <= DOCK_POS.r + 0.8

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (bobberRef.current) {
      if (fishing.state === 'bite') {
        bobberRef.current.position.y = 0.02 + Math.sin(t * 28) * 0.06
        bobberRef.current.position.x = -7.5 + Math.sin(t * 18) * 0.04
      } else if (fishing.state === 'waiting') {
        bobberRef.current.position.y = 0.04 + Math.sin(t * 3) * 0.02
        bobberRef.current.position.x = -7.5
      } else {
        bobberRef.current.position.y = 0.04
        bobberRef.current.position.x = -7.5
      }
    }
    if (alertRef.current && fishing.state === 'bite') {
      const s = 1 + Math.sin(t * 12) * 0.15
      alertRef.current.scale.set(s, s, s)
    }
  })

  return (
    <group position={[DOCK_POS.x, 0, DOCK_POS.z]}>
      {/* ท่าเรือไม้ (Wooden Pier) */}
      <group
        onClick={(e) => {
          e.stopPropagation()
          triggerFishing()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        {/* เสาสะพานปักลงน้ำ */}
        {[
          [-0.6, -0.6],
          [0.6, -0.6],
          [-0.6, 0.6],
          [0.6, 0.6],
        ].map(([px, pz], i) => (
          <mesh key={i} position={[px, 0.15, pz]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.5, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
        ))}

        {/* แผ่นไม้สะพาน */}
        {[-0.6, -0.2, 0.2, 0.6].map((offsetZ, i) => (
          <mesh key={i} position={[0, 0.35, offsetZ]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.07, 0.32]} />
            <meshStandardMaterial color="#92400e" roughness={0.85} />
          </mesh>
        ))}

        {/* คานข้าง */}
        {[-0.72, 0.72].map((offsetX, i) => (
          <mesh key={i} position={[offsetX, 0.3, 0]} castShadow>
            <boxGeometry args={[0.08, 0.08, 1.6]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
        ))}

        {/* คันเบ็ดตกปลาปักไว้ริมสะพาน */}
        <group position={[-0.6, 0.4, -0.5]} rotation={[0.4, -0.8, -0.6]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.03, 1.8, 6]} />
            <meshStandardMaterial color="#b45309" roughness={0.6} />
          </mesh>
        </group>
      </group>

      {/* ทุ่นตกปลาในน้ำ (Bobber) เมื่อเหวี่ยงเบ็ด */}
      {fishing.state !== 'idle' && (
        <group ref={bobberRef} position={[-1.1, 0.04, -0.8]}>
          {/* ลูกทุ่นสีแดง-ขาว */}
          <mesh castShadow>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <sphereGeometry args={[0.078, 10, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.1, 6]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>

          {/* ระลอกคลื่นน้ำ */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <ringGeometry args={[0.1, 0.22, 16]} />
            <meshBasicMaterial color="#bae6fd" transparent opacity={0.6} toneMapped={false} />
          </mesh>

          {/* เครื่องหมาย ! เด้งขึ้นเมื่อปลาฮุบเหยื่อ */}
          {fishing.state === 'bite' && (
            <group ref={alertRef} position={[0, 0.65, 0]}>
              <Billboard>
                <Text
                  fontSize={0.45}
                  color="#ef4444"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.05}
                  outlineColor="#ffffff"
                >
                  ❗️
                </Text>
              </Billboard>
            </group>
          )}
        </group>
      )}

      {/* ป้ายข้อความหรือวงแหวน Highlight เมื่ออยู่ในระยะ */}
      {inRange && (
        <Billboard position={[0, 1.1, 0]}>
          <Text
            fontSize={0.22}
            color="#38bdf8"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#0f172a"
          >
            {fishing.state === 'bite'
              ? '⚡ กดคลิก / Spacebar วัดเบ็ด!'
              : fishing.state === 'waiting'
                ? '⏳ รอจังหวะปลาฮุบ...'
                : '🎣 ท่าเรือตกปลา (กดคลิก / E)'}
          </Text>
        </Billboard>
      )}
    </group>
  )
}
