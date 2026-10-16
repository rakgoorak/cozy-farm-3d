import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFarmStore } from '../store/farmStore'
import { KenneyModel, FallbackTree, FallbackBarn, FallbackCloud } from './ModelWithFallback'

export function Ground() {
  const lampOn = useFarmStore((s) => {
    const h = s.clockMin / 60
    return h < 5.5 || h >= 17.5
  })
  return (
    <group>
      {/* พื้นหญ้าหลักและฐานฟาร์ม */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.11, 0]}>
        <planeGeometry args={[52, 52]} />
        <meshStandardMaterial color="#7cc35f" roughness={1} />
      </mesh>
      <mesh receiveShadow position={[0, -0.06, 0]}>
        <boxGeometry args={[13.6, 0.12, 13.6]} />
        <meshStandardMaterial color="#6aa84f" roughness={1} />
      </mesh>

      {/* บ่อน้ำและน้ำพุ */}
      <group position={[-8.6, 0, -7.2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <circleGeometry args={[1.8, 28]} />
          <meshStandardMaterial color="#7dd3fc" roughness={0.25} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[1.8, 2.15, 28]} />
          <meshStandardMaterial color="#d6c39a" roughness={1} />
        </mesh>
        <KenneyModel
          src="/models/fountain.glb"
          position={[0, 0, 0]}
          scale={2.2}
          fallback={
            <mesh position={[0, 0.35, 0]} castShadow>
              <cylinderGeometry args={[0.4, 0.5, 0.7, 10]} />
              <meshStandardMaterial color="#a8a29e" roughness={0.9} />
            </mesh>
          }
        />
      </group>

      {/* โรงนาหลัก */}
      <group position={[8.4, 0, -7.4]} rotation={[0, -0.5, 0]}>
        <KenneyModel src="/models/barn.glb" scale={2.5} fallback={<FallbackBarn />} />
      </group>

      {/* กระท่อมเก็บเมล็ดพันธุ์ฝั่งซ้าย */}
      <group position={[-9.2, 0, 6.8]} rotation={[0, 0.6, 0]}>
        <KenneyModel src="/models/windmill.glb" scale={2.1} fallback={<FallbackBarn />} />
      </group>

      <Fence />
      <Trees />
      <Clouds />
      <GrassTufts />
      <Rocks />
      <Lamp position={[-4.9, 0, 0.5]} lampOn={lampOn} />
      <Lamp position={[4.9, 0, -0.5]} lampOn={lampOn} />
    </group>
  )
}

function Lamp({ position, lampOn }: { position: [number, number, number]; lampOn: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 2.2, 8]} />
        <meshStandardMaterial color="#44403c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[0.4, 0.45, 0.4]} />
        <meshStandardMaterial
          color={lampOn ? '#fef3c7' : '#78716c'}
          emissive={lampOn ? '#fbbf24' : '#000000'}
          emissiveIntensity={lampOn ? 1.6 : 0}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[0.35, 0.3, 4]} />
        <meshStandardMaterial color="#44403c" roughness={0.8} />
      </mesh>
      {lampOn && (
        <pointLight position={[0, 2.3, 0]} color="#ffd9a0" intensity={24} distance={11} decay={2} />
      )}
    </group>
  )
}

function Fence() {
  const posts: Array<[number, number]> = []
  const half = 7.3
  for (let i = -5; i <= 5; i++) {
    posts.push([i * 1.46, -half])
    posts.push([i * 1.46, half])
    posts.push([-half, i * 1.46])
    posts.push([half, i * 1.46])
  }
  return (
    <group>
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]} castShadow>
          <boxGeometry args={[0.16, 0.6, 0.16]} />
          <meshStandardMaterial color="#a9713f" roughness={0.9} />
        </mesh>
      ))}
      {[-half, half].map((z, i) => (
        <mesh key={`h${i}`} position={[0, 0.45, z]} castShadow>
          <boxGeometry args={[14.8, 0.1, 0.1]} />
          <meshStandardMaterial color="#c08a52" roughness={0.9} />
        </mesh>
      ))}
      {[-half, half].map((x, i) => (
        <mesh key={`v${i}`} position={[x, 0.45, 0]} castShadow>
          <boxGeometry args={[0.1, 0.1, 14.8]} />
          <meshStandardMaterial color="#c08a52" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function Trees() {
  const spots: Array<[number, number, number]> = [
    [-9.6, -2.5, 2.6],
    [9.4, 1.8, 2.2],
    [-8.8, 7.6, 2.8],
    [3.5, 9.2, 2.0],
    [-3.8, -9.4, 2.4],
    [9.8, 7.8, 2.3],
    [-10.2, 2.2, 2.5],
    [10.2, -3.5, 2.4],
  ]
  return (
    <group>
      {spots.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <KenneyModel src="/models/tree.glb" fallback={<FallbackTree />} />
        </group>
      ))}
    </group>
  )
}

function Clouds() {
  const clouds: Array<{ pos: [number, number, number]; s: number; v: number }> = [
    { pos: [-10, 9, -8], s: 1.6, v: 0.25 },
    { pos: [6, 10, -10], s: 2.1, v: 0.18 },
    { pos: [11, 8.5, 4], s: 1.3, v: 0.3 },
  ]
  return (
    <group>
      {clouds.map((c, i) => (
        <DriftCloud key={i} pos={c.pos} s={c.s} v={c.v} />
      ))}
    </group>
  )
}

function DriftCloud({ pos, s, v }: { pos: [number, number, number]; s: number; v: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.position.x += Math.min(dt, 0.05) * v
    if (ref.current.position.x > 16) ref.current.position.x = -16
  })
  return (
    <group ref={ref} position={pos} scale={s}>
      <KenneyModel src="/models/cloud.glb" fallback={<FallbackCloud />} />
    </group>
  )
}

function GrassTufts() {
  const spots: Array<[number, number]> = [
    [-5.2, 3.4],
    [5.4, 4.6],
    [-4.6, -4.9],
    [4.8, -4.2],
    [0.5, 6.6],
    [-6.3, 0.8],
    [6.5, -1.2],
    [2.2, -6.4],
    [-6.8, -5.5],
    [7.0, 5.8],
  ]
  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0.02, z]} scale={1.4}>
          <KenneyModel
            src="/models/grass-tuft.glb"
            fallback={
              <mesh castShadow>
                <coneGeometry args={[0.16, 0.4, 6]} />
                <meshStandardMaterial color="#4da355" roughness={1} />
              </mesh>
            }
          />
        </group>
      ))}
    </group>
  )
}

function Rocks() {
  const rocks: Array<[number, number, number]> = [
    [-6.5, -3, 0.32],
    [6.8, 1.5, 0.44],
    [1.8, 7.4, 0.28],
    [-8.0, 4.2, 0.36],
  ]
  return (
    <group>
      {rocks.map(([x, z, s], i) => (
        <mesh key={i} position={[x, s * 0.4, z]} castShadow>
          <dodecahedronGeometry args={[s, 0]} />
          <meshStandardMaterial color="#b8bfc4" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}
