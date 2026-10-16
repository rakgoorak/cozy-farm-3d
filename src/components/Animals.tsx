import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFarmStore, AnimalInstance } from '../store/farmStore'
import { ANIMALS, PEN } from '../game/constants'

interface WanderData {
  initialized: boolean
  x: number
  z: number
  a: number
  tx: number
  tz: number
}

function stepWander(w: WanderData, dt: number, speed: number, retargetChance: number): void {
  if (!w.initialized) {
    const r = Math.random() * PEN.r * 0.7
    const a = Math.random() * Math.PI * 2
    w.x = Math.cos(a) * r
    w.z = Math.sin(a) * r
    w.tx = w.x
    w.tz = w.z
    w.initialized = true
  }
  const dx = w.tx - w.x
  const dz = w.tz - w.z
  const dist = Math.hypot(dx, dz)
  if (dist < 0.1) {
    if (Math.random() < retargetChance) {
      const r = Math.random() * PEN.r * 0.85
      const a = Math.random() * Math.PI * 2
      w.tx = Math.cos(a) * r
      w.tz = Math.sin(a) * r
    }
  } else {
    const sp = speed * dt
    w.x += (dx / dist) * sp
    w.z += (dz / dist) * sp
    w.a = Math.atan2(dx, dz)
  }
}

function useAnimalReady(readyAt: number): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const check = () => setReady(Date.now() >= readyAt)
    check()
    const delay = Math.max(50, readyAt - Date.now())
    const timer = setTimeout(check, delay)
    return () => clearTimeout(timer)
  }, [readyAt])
  return ready
}

function Chick({ animal }: { animal: AnimalInstance }) {
  const wander = useRef<WanderData>({ initialized: false, x: 0, z: 0, a: 0, tx: 0, tz: 0 })
  const g = useRef<THREE.Group>(null)
  const isReady = useAnimalReady(animal.readyAt)

  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05)
    const w = wander.current
    stepWander(w, d, 0.9, 0.02)
    if (g.current) {
      g.current.position.set(
        PEN.x + w.x,
        Math.abs(Math.sin(clock.elapsedTime * 8 + animal.id)) * 0.08,
        PEN.z + w.z,
      )
      g.current.rotation.y = w.a
    }
  })

  return (
    <group
      ref={g}
      onClick={(e) => {
        e.stopPropagation()
        useFarmStore.getState().collectAnimal(animal.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh position={[0, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#fde047" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color="#fef08a" roughness={0.8} />
      </mesh>
      {[-0.06, 0.06].map((x) => (
        <mesh key={x} position={[x, 0.45, 0.13]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0.15]} rotation={[0.4, 0, 0]}>
        <coneGeometry args={[0.045, 0.09, 6]} />
        <meshStandardMaterial color="#f97316" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <coneGeometry args={[0.05, 0.12, 6]} />
        <meshStandardMaterial color="#f97316" roughness={0.8} />
      </mesh>
      {isReady && <ReadyRing y={0.05} />}
    </group>
  )
}

function Sheep({ animal }: { animal: AnimalInstance }) {
  const wander = useRef<WanderData>({ initialized: false, x: 0, z: 0, a: 0, tx: 0, tz: 0 })
  const g = useRef<THREE.Group>(null)
  const isReady = useAnimalReady(animal.readyAt)

  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05)
    const w = wander.current
    stepWander(w, d, 0.6, 0.015)
    if (g.current) {
      g.current.position.set(
        PEN.x + w.x,
        Math.abs(Math.sin(clock.elapsedTime * 5 + animal.id)) * 0.04,
        PEN.z + w.z,
      )
      g.current.rotation.y = w.a
    }
  })

  const wool = useMemo<Array<[number, number, number, number]>>(
    () => [
      [0, 0.42, 0, 0.26],
      [0.2, 0.38, 0.08, 0.19],
      [-0.2, 0.38, -0.05, 0.19],
      [0.08, 0.55, -0.1, 0.18],
      [-0.08, 0.5, 0.14, 0.17],
    ],
    [],
  )

  const legs: Array<[number, number]> = [
    [-0.14, -0.1],
    [0.14, -0.1],
    [-0.14, 0.12],
    [0.14, 0.12],
  ]

  return (
    <group
      ref={g}
      onClick={(e) => {
        e.stopPropagation()
        useFarmStore.getState().collectAnimal(animal.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {wool.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[s, 10, 10]} />
          <meshStandardMaterial color="#f8fafc" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0.32, 0.26]} castShadow>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color="#44403c" roughness={0.9} />
      </mesh>
      {[-0.05, 0.05].map((x) => (
        <mesh key={x} position={[x, 0.36, 0.36]}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.1, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 6]} />
          <meshStandardMaterial color="#44403c" roughness={0.9} />
        </mesh>
      ))}
      {isReady && <ReadyRing y={0.03} />}
    </group>
  )
}

function Cow({ animal }: { animal: AnimalInstance }) {
  const wander = useRef<WanderData>({ initialized: false, x: 0, z: 0, a: 0, tx: 0, tz: 0 })
  const g = useRef<THREE.Group>(null)
  const isReady = useAnimalReady(animal.readyAt)

  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05)
    const w = wander.current
    stepWander(w, d, 0.5, 0.012)
    if (g.current) {
      g.current.position.set(
        PEN.x + w.x,
        Math.abs(Math.sin(clock.elapsedTime * 4 + animal.id)) * 0.03,
        PEN.z + w.z,
      )
      g.current.rotation.y = w.a
    }
  })

  const legs: Array<[number, number]> = [
    [-0.18, -0.16],
    [0.18, -0.16],
    [-0.18, 0.16],
    [0.18, 0.16],
  ]

  return (
    <group
      ref={g}
      scale={1.2}
      onClick={(e) => {
        e.stopPropagation()
        useFarmStore.getState().collectAnimal(animal.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {/* ลำตัววัวลายขาวดำ */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.48, 0.42, 0.65]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>
      {/* ลายจุดสีดำ */}
      <mesh position={[0.245, 0.48, 0.05]}>
        <boxGeometry args={[0.02, 0.2, 0.24]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-0.245, 0.4, -0.1]}>
        <boxGeometry args={[0.02, 0.18, 0.22]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* หัววัว */}
      <mesh position={[0, 0.58, 0.38]} castShadow>
        <boxGeometry args={[0.34, 0.32, 0.28]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>
      {/* จมูกสีชมพู */}
      <mesh position={[0, 0.5, 0.52]}>
        <boxGeometry args={[0.26, 0.16, 0.1]} />
        <meshStandardMaterial color="#fca5a5" roughness={0.8} />
      </mesh>
      {/* เขาคู่ */}
      {[-0.14, 0.14].map((hx) => (
        <mesh key={hx} position={[hx, 0.78, 0.36]} rotation={[0, 0, hx > 0 ? -0.3 : 0.3]}>
          <coneGeometry args={[0.035, 0.12, 6]} />
          <meshStandardMaterial color="#eab308" roughness={0.6} />
        </mesh>
      ))}

      {/* 4 ขา */}
      {legs.map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.11, lz]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.22, 6]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
      ))}

      {isReady && <ReadyRing y={0.03} />}
    </group>
  )
}

function ReadyRing({ y }: { y: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 5) * 0.12
      ref.current.scale.set(s, s, 1)
    }
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <ringGeometry args={[0.3, 0.4, 20]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.95} toneMapped={false} />
    </mesh>
  )
}

export function Animals() {
  const animals = useFarmStore((s) => s.animals)
  return (
    <group>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[PEN.x + Math.cos(a) * PEN.r, 0.25, PEN.z + Math.sin(a) * PEN.r]}
            castShadow
          >
            <boxGeometry args={[0.14, 0.5, 0.14]} />
            <meshStandardMaterial color="#b45309" roughness={0.9} />
          </mesh>
        )
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PEN.x, 0.005, PEN.z]} receiveShadow>
        <circleGeometry args={[PEN.r, 28]} />
        <meshStandardMaterial color="#a3c46b" roughness={1} />
      </mesh>
      <mesh position={[PEN.x - 1.1, 0.25, PEN.z - 1.1]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.5, 10]} />
        <meshStandardMaterial color="#eab308" roughness={1} />
      </mesh>
      {animals.map((a) => {
        if (a.kind === ANIMALS.chick.id) return <Chick key={a.id} animal={a} />
        if (a.kind === ANIMALS.sheep.id) return <Sheep key={a.id} animal={a} />
        return <Cow key={a.id} animal={a} />
      })}
    </group>
  )
}
