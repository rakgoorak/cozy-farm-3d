import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CROPS, CropId } from '../game/constants'

interface PlantProps {
  cropId: CropId
  growth: number
  mature: boolean
  giant?: boolean
}

// พืช 5 ชนิด × 4 ขั้น (seeded ใช้เมล็ด/ต้นอ่อน, growing 0/1/2, mature ผลสุกเด้งดึ๋ง, giant ผลผลิตยักษ์ x3)
export function Plant({ cropId, growth, mature, giant }: PlantProps) {
  const ref = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const stage = mature ? 3 : growth
  const crop = CROPS[cropId] ?? CROPS.carrot
  const baseScale = giant ? 1.75 : 1

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    if (mature) {
      const s = baseScale * (1 + Math.sin(t * 3.4) * 0.055)
      ref.current.scale.set(s, baseScale * (1 + Math.sin(t * 3.4) * 0.05), s)
      ref.current.rotation.y = Math.sin(t * 0.9) * 0.18
      if (ringRef.current) {
        ringRef.current.rotation.z = t * 1.5
      }
    } else {
      ref.current.rotation.z = Math.sin(t * 1.6 + growth) * 0.06
    }
  })

  return (
    <group ref={ref} position={[0, 0.12, 0]}>
      {stage === 0 && <Sprout color={crop.leafColor} />}
      {stage === 1 && <Growing cropId={cropId} />}
      {stage === 2 && <AlmostReady cropId={cropId} />}
      {stage === 3 && <Mature cropId={cropId} />}
      {giant && mature && (
        <mesh ref={ringRef} position={[0, 0.45, 0]} rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[0.55, 0.035, 8, 24]} />
          <meshBasicMaterial color="#fde047" toneMapped={false} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  )
}

function Sprout({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.2, 6]} />
        <meshStandardMaterial color="#3e9e4f" roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.09, 0.17, 0]} rotation={[0, 0, s * -0.6]} castShadow>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function LeafBall({
  pos,
  s,
  color,
  rot = [0.4, 0, 0.5],
}: {
  pos: [number, number, number]
  s: number
  color: string
  rot?: [number, number, number]
}) {
  return (
    <mesh position={pos} rotation={rot} castShadow>
      <sphereGeometry args={[s, 8, 8]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}

function Growing({ cropId }: { cropId: CropId }) {
  const crop = CROPS[cropId]
  return (
    <group>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.48, 8]} />
        <meshStandardMaterial color="#2f8f3e" roughness={0.9} />
      </mesh>
      <LeafBall pos={[0.17, 0.32, 0]} s={0.13} color={crop.leafColor} rot={[0.4, 0, 0.7]} />
      <LeafBall pos={[-0.17, 0.26, 0.08]} s={0.13} color={crop.leafColor} rot={[0.4, 0, -0.7]} />
      <LeafBall pos={[0, 0.4, -0.12]} s={0.12} color={crop.leafColor} rot={[0.4, 0, 0.2]} />
      {cropId === 'carrot' && (
        <mesh position={[0, 0.52, 0]} castShadow>
          <coneGeometry args={[0.09, 0.22, 8]} />
          <meshStandardMaterial color={crop.topColor} roughness={0.7} />
        </mesh>
      )}
      {(cropId === 'tomato' || cropId === 'strawberry') && (
        <mesh position={[0, 0.5, 0]} castShadow>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color={cropId === 'tomato' ? '#86efac' : '#bbf7d0'} roughness={0.7} />
        </mesh>
      )}
      {(cropId === 'pumpkin' || cropId === 'goldmelon') && (
        <mesh position={[0, 0.42, 0]} scale={[1, 0.85, 1]} castShadow>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshStandardMaterial color={cropId === 'pumpkin' ? '#a3c96b' : '#d9f99d'} roughness={0.7} />
        </mesh>
      )}
    </group>
  )
}

function AlmostReady({ cropId }: { cropId: CropId }) {
  const crop = CROPS[cropId]
  if (cropId === 'carrot') {
    const leaves: Array<[number, number, number, number]> = [
      [0.14, 0.52, 0, -0.5],
      [-0.14, 0.52, 0.04, 0.5],
      [0, 0.6, -0.08, 0.1],
    ]
    return (
      <group>
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.06, 0.5, 8]} />
          <meshStandardMaterial color="#2f7d32" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.16, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.05, 0.22, 10]} />
          <meshStandardMaterial color={crop.fruitColor} roughness={0.65} />
        </mesh>
        {leaves.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0.3, 0, r]} castShadow>
            <coneGeometry args={[0.07, 0.3, 6]} />
            <meshStandardMaterial color={crop.topColor} roughness={0.8} />
          </mesh>
        ))}
      </group>
    )
  }
  if (cropId === 'tomato') {
    const fruits: Array<[number, number, number]> = [
      [0.18, 0.5, 0.1],
      [-0.16, 0.55, -0.08],
      [0.02, 0.42, 0.18],
    ]
    return (
      <group>
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 0.6, 8]} />
          <meshStandardMaterial color="#2f7d32" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshStandardMaterial color={crop.leafColor} roughness={0.85} />
        </mesh>
        {fruits.map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <sphereGeometry args={[0.11, 10, 10]} />
            <meshStandardMaterial color="#fb923c" roughness={0.55} />
          </mesh>
        ))}
      </group>
    )
  }
  if (cropId === 'strawberry') {
    const berries: Array<[number, number, number]> = [
      [0.15, 0.3, 0.1],
      [-0.14, 0.32, -0.06],
      [0, 0.22, 0.17],
    ]
    return (
      <group>
        <mesh position={[0, 0.26, 0]} castShadow>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial color={crop.leafColor} roughness={0.85} />
        </mesh>
        {berries.map(([x, y, z], i) => (
          <group key={i} position={[x, y, z]}>
            <mesh castShadow>
              <sphereGeometry args={[0.08, 10, 10]} />
              <meshStandardMaterial color="#fda4af" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.07, 0]}>
              <coneGeometry args={[0.045, 0.06, 6]} />
              <meshStandardMaterial color={crop.topColor} roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }
  if (cropId === 'goldmelon') {
    return (
      <group>
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 0.56, 8]} />
          <meshStandardMaterial color="#4d7c0f" roughness={0.9} />
        </mesh>
        <LeafBall pos={[0.22, 0.34, 0]} s={0.15} color={crop.leafColor} rot={[0, 0, -0.7]} />
        <LeafBall pos={[-0.22, 0.4, 0.05]} s={0.15} color={crop.leafColor} rot={[0.3, 0, 0.7]} />
        <mesh position={[0, 0.32, 0]} scale={[1, 0.88, 1]} castShadow>
          <sphereGeometry args={[0.24, 14, 14]} />
          <meshStandardMaterial
            color="#d4a017"
            roughness={0.5}
            emissive="#713f12"
            emissiveIntensity={0.25}
          />
        </mesh>
      </group>
    )
  }
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.56, 8]} />
        <meshStandardMaterial color="#2f7d32" roughness={0.9} />
      </mesh>
      <LeafBall pos={[0.2, 0.32, 0]} s={0.15} color={crop.leafColor} rot={[0, 0, -0.7]} />
      <LeafBall pos={[-0.2, 0.4, 0.05]} s={0.15} color={crop.leafColor} rot={[0.3, 0, 0.7]} />
      <mesh position={[0, 0.32, 0]} scale={[1, 0.85, 1]} castShadow>
        <sphereGeometry args={[0.2, 14, 14]} />
        <meshStandardMaterial color="#e8a13c" roughness={0.6} />
      </mesh>
    </group>
  )
}

function Mature({ cropId }: { cropId: CropId }) {
  if (cropId === 'carrot') {
    const tops: Array<[number, number, number, number]> = [
      [0.16, 0.62, 0, -0.45],
      [-0.16, 0.62, 0.03, 0.45],
      [0, 0.72, -0.06, 0.08],
    ]
    return (
      <group>
        {tops.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0.25, 0, r]} castShadow>
            <coneGeometry args={[0.08, 0.36, 6]} />
            <meshStandardMaterial color="#16a34a" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.04, 0.5, 10]} />
          <meshStandardMaterial color="#f97316" roughness={0.55} />
        </mesh>
      </group>
    )
  }
  if (cropId === 'tomato') {
    const tomatoes: Array<[number, number, number, number]> = [
      [0.2, 0.56, 0.12, 0.13],
      [-0.19, 0.6, -0.06, 0.12],
      [0.03, 0.48, 0.2, 0.11],
      [-0.05, 0.72, 0.12, 0.1],
    ]
    return (
      <group>
        <mesh position={[0, 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 0.64, 8]} />
          <meshStandardMaterial color="#2f7d32" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.68, 0]} castShadow>
          <sphereGeometry args={[0.27, 12, 12]} />
          <meshStandardMaterial color="#22c55e" roughness={0.85} />
        </mesh>
        {tomatoes.map(([x, y, z, s], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <sphereGeometry args={[s, 12, 12]} />
            <meshStandardMaterial color="#ef4444" roughness={0.4} />
          </mesh>
        ))}
      </group>
    )
  }
  if (cropId === 'strawberry') {
    const berries: Array<[number, number, number]> = [
      [0.2, 0.36, 0.12],
      [-0.19, 0.38, -0.06],
      [0.03, 0.28, 0.2],
      [-0.04, 0.46, 0.12],
      [0.12, 0.3, -0.16],
    ]
    return (
      <group>
        <mesh position={[0, 0.3, 0]} castShadow>
          <sphereGeometry args={[0.26, 12, 12]} />
          <meshStandardMaterial color="#22c55e" roughness={0.85} />
        </mesh>
        {berries.map(([x, y, z], i) => (
          <group key={i} position={[x, y, z]}>
            <mesh castShadow scale={[1, 1.2, 0.9]}>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color="#f43f5e" roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <coneGeometry args={[0.05, 0.07, 6]} />
              <meshStandardMaterial color="#15803d" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }
  if (cropId === 'goldmelon') {
    return (
      <group>
        <GoldenMelon />
        <mesh position={[0.2, 0.5, 0]} rotation={[0, 0, -0.5]}>
          <sphereGeometry args={[0.11, 8, 8]} />
          <meshStandardMaterial color="#65a30d" roughness={0.8} />
        </mesh>
      </group>
    )
  }
  return (
    <group>
      <mesh position={[0, 0.3, 0]} scale={[1, 0.82, 1]} castShadow>
        <sphereGeometry args={[0.34, 16, 16]} />
        <meshStandardMaterial color="#f97316" roughness={0.55} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0, 0.3, 0]}
          rotation={[0, (i * Math.PI) / 3, 0]}
          scale={[0.96, 0.83, 1.02]}
        >
          <torusGeometry args={[0.2, 0.035, 8, 16]} />
          <meshStandardMaterial color="#ea580c" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.14, 8]} />
        <meshStandardMaterial color="#365314" roughness={0.9} />
      </mesh>
    </group>
  )
}

function GoldenMelon() {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (mat.current) mat.current.emissiveIntensity = 0.55 + Math.sin(t * 3) * 0.3
    if (ring.current) ring.current.rotation.z = t * 1.2
  })
  return (
    <group>
      <mesh position={[0, 0.36, 0]} scale={[1, 0.9, 1]} castShadow>
        <sphereGeometry args={[0.4, 18, 18]} />
        <meshStandardMaterial
          ref={mat}
          color="#fbbf24"
          roughness={0.35}
          emissive="#f59e0b"
          emissiveIntensity={0.6}
        />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[0, 0.36, 0]}
          rotation={[0, (i * Math.PI) / 4, 0]}
          scale={[0.97, 0.91, 1.03]}
        >
          <torusGeometry args={[0.24, 0.03, 8, 18]} />
          <meshStandardMaterial color="#b45309" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.74, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.065, 0.15, 8]} />
        <meshStandardMaterial color="#365314" roughness={0.9} />
      </mesh>
      <mesh ref={ring} position={[0, 0.36, 0]} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[0.62, 0.035, 8, 32]} />
        <meshBasicMaterial color="#fde68a" transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  )
}
