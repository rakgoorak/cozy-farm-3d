import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useFarmStore } from '../store/farmStore'
import { KITCHEN_POS } from '../game/constants'

export function CookingStation() {
  const setCookOpen = useFarmStore((s) => s.setCookOpen)
  const playerPos = useFarmStore((s) => s.playerPos)
  const steamRef = useRef<THREE.Group>(null)

  const dist = Math.hypot(playerPos.x - KITCHEN_POS.x, playerPos.z - KITCHEN_POS.z)
  const inRange = dist <= KITCHEN_POS.r + 0.6

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (steamRef.current) {
      steamRef.current.position.y = 1.0 + ((t * 0.4) % 0.6)
      steamRef.current.scale.setScalar(0.8 + ((t * 0.4) % 0.6))
    }
  })

  return (
    <group
      position={[KITCHEN_POS.x, 0, KITCHEN_POS.z]}
      rotation={[0, -0.4, 0]}
      onClick={(e) => {
        e.stopPropagation()
        setCookOpen(true)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {/* ซุ้มโต๊ะครัวไม้ */}
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.84, 1.0]} />
        <meshStandardMaterial color="#854d0e" roughness={0.9} />
      </mesh>

      {/* แผ่นท็อปโต๊ะหินอ่อน */}
      <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.08, 1.1]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>

      {/* เตาไฟดินเผา */}
      <mesh position={[-0.45, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.35, 10]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.8} />
      </mesh>

      {/* หม้อต้มซุปทองแดง */}
      <mesh position={[-0.45, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.2, 0.28, 10]} />
        <meshStandardMaterial color="#b45309" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* ควัน/ไอน้ำลอยจากหม้อ */}
      <group ref={steamRef} position={[-0.45, 1.45, 0]}>
        {[
          [0, 0, 0, 0.08],
          [0.05, 0.08, 0, 0.07],
          [-0.04, 0.16, 0, 0.06],
        ].map(([sx, sy, sz, sr], i) => (
          <mesh key={i} position={[sx, sy, sz]}>
            <sphereGeometry args={[sr, 8, 8]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.45} />
          </mesh>
        ))}
      </group>

      {/* เขียงไม้และมีดทำครัว */}
      <mesh position={[0.4, 0.92, 0]} castShadow>
        <boxGeometry args={[0.42, 0.03, 0.34]} />
        <meshStandardMaterial color="#a16207" roughness={0.8} />
      </mesh>
      <mesh position={[0.4, 0.94, 0.05]} rotation={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.04, 0.02, 0.26]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* หลังคาผ้าใบกันแดดลายทาง */}
      <group position={[0, 2.0, 0]}>
        {[-0.8, 0.8].map((px, i) => (
          <mesh key={i} position={[px, -0.6, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0.1]} castShadow>
          <boxGeometry args={[2.0, 0.05, 1.3]} />
          <meshStandardMaterial color="#ea580c" roughness={0.7} />
        </mesh>
      </group>

      {/* ป้ายบอกทางเมื่อเดินเข้าใกล้ */}
      {inRange && (
        <Billboard position={[0, 2.5, 0]}>
          <Text
            fontSize={0.24}
            color="#fb923c"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.035}
            outlineColor="#0f172a"
          >
            🍳 โรงครัวทำอาหาร & คราฟต์สปริงเกอร์ (กดคลิก / E)
          </Text>
        </Billboard>
      )}
    </group>
  )
}
