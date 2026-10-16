import { RefObject, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Sky, Stars } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { Ground } from './Ground'
import { PlotGrid } from './Plot'
import { Player } from './Player'
import { RemotePlayers } from './RemotePlayers'
import { Animals } from './Animals'
import { FishingDock } from './FishingDock'
import { ForagingNodes } from './ForagingNodes'
import { CookingStation } from './CookingStation'
import { Floaters } from './Floaters'
import { useFarmStore } from '../store/farmStore'
import { computeSky } from '../game/constants'

// Deterministic pseudo-random helper (0..1) เพื่อให้ useMemo บริสุทธิ์ 100%
function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

// กล้องติดตามตัวละครแบบนุ่มนวล (Smooth Follow Camera) พร้อมรองรับการซูม/หมุนเมาส์
function FollowRig({ controlsRef }: { controlsRef: RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0.4, 0))
  const desired = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const { x, z } = useFarmStore.getState().playerPos
    desired.current.set(x, 0.4, z)
    target.current.lerp(desired.current, 1 - Math.exp(-4 * dt))
    const ctl = controlsRef.current
    if (ctl) {
      const offset = new THREE.Vector3().subVectors(camera.position, ctl.target)
      ctl.target.copy(target.current)
      camera.position.copy(target.current).add(offset)
      ctl.update()
    }
  })
  return null
}

function Sun() {
  const clockMin = useFarmStore((s) => s.clockMin)
  const sky = computeSky(clockMin)
  const h = clockMin / 60
  const dayT = Math.min(Math.max((h - 5) / 14, 0), 1)
  const x = THREE.MathUtils.lerp(-12, 12, dayT)
  const y = sky.night ? 9 : 4 + Math.sin(dayT * Math.PI) * 10
  return (
    <directionalLight
      position={[sky.night ? sky.sunPos[0] : x, y, sky.night ? sky.sunPos[2] : 7]}
      intensity={sky.sunIntensity}
      color={sky.sunColor}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-16}
      shadow-camera-right={16}
      shadow-camera-top={16}
      shadow-camera-bottom={-16}
      shadow-camera-far={50}
      shadow-bias={-0.0004}
    />
  )
}

function Rain() {
  const ref = useRef<THREE.Points>(null)
  const count = 700
  const { positions, speeds } = useMemo(() => {
    const posArr = new Float32Array(count * 3)
    const spdArr = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      posArr[i * 3] = (hash01(i * 3 + 1) - 0.5) * 26
      posArr[i * 3 + 1] = hash01(i * 3 + 2) * 13
      posArr[i * 3 + 2] = (hash01(i * 3 + 3) - 0.5) * 26
      spdArr[i] = 9 + hash01(i * 7 + 5) * 5
    }
    return { positions: posArr, speeds: spdArr }
  }, [])

  useFrame((_, delta) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position
    const arr = pos.array as Float32Array
    const dt = Math.min(delta, 0.05)
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i] * dt
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 13
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#93c5fd" size={0.14} transparent opacity={0.75} sizeAttenuation />
    </points>
  )
}

function Fireflies() {
  const ref = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.PointsMaterial>(null)
  const count = 26
  const seeds = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        x: (hash01(i * 5 + 1) - 0.5) * 18,
        z: (hash01(i * 5 + 2) - 0.5) * 18,
        y: 0.5 + hash01(i * 5 + 3) * 2,
        p: hash01(i * 5 + 4) * Math.PI * 2,
        s: 0.4 + hash01(i * 5 + 5) * 0.8,
      })),
    [],
  )
  const positions = useMemo(() => new Float32Array(count * 3), [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    const posAttr = ref.current.geometry.attributes.position
    const arr = posAttr.array as Float32Array
    for (let i = 0; i < count; i++) {
      const f = seeds[i]
      arr[i * 3] = f.x + Math.sin(t * f.s + f.p) * 1.2
      arr[i * 3 + 1] = f.y + Math.sin(t * f.s * 1.4 + f.p * 2) * 0.4
      arr[i * 3 + 2] = f.z + Math.cos(t * f.s * 0.8 + f.p) * 1.2
    }
    posAttr.needsUpdate = true
    if (matRef.current) {
      matRef.current.opacity = 0.55 + Math.sin(t * 2.4) * 0.35
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        color="#fef08a"
        size={0.16}
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function SkyRig() {
  const clockMin = useFarmStore((s) => s.clockMin)
  const weatherType = useFarmStore((s) => s.weather.type)
  const sky = computeSky(clockMin)
  const h = clockMin / 60
  const dayT = Math.min(Math.max((h - 5) / 14, 0), 1)
  return (
    <>
      <color attach="background" args={[weatherType === 'rainy' && !sky.night ? '#9db8c9' : sky.bg]} />
      <fog attach="fog" args={[weatherType === 'rainy' && !sky.night ? '#a8bdd0' : sky.fog, 26, 50]} />
      <ambientLight intensity={sky.night ? 0.35 : 0.55} color={sky.night ? '#c7d2fe' : '#fff7ed'} />
      <hemisphereLight args={[sky.hemiSky, sky.hemiGround, sky.hemiInt]} />
      {!sky.night && (
        <Sky
          distance={450000}
          sunPosition={[THREE.MathUtils.lerp(-12, 12, dayT), 4 + Math.sin(dayT * Math.PI) * 10, 7]}
          inclination={0.52}
          azimuth={0.25}
          turbidity={sky.skyTurbidity}
          rayleigh={sky.night ? 0.5 : 1.8}
        />
      )}
      {sky.night && <Stars radius={120} depth={40} count={2500} factor={5} fade speed={0.6} />}
      {sky.night && <Fireflies />}
      {weatherType === 'rainy' && <Rain />}
    </>
  )
}

export function FarmScene() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [7.5, 8.5, 11.5], fov: 42 }}
      style={{ background: '#bfe3ff' }}
    >
      <SkyRig />
      <Sun />
      <directionalLight position={[-6, 4, -6]} intensity={0.25} color="#fed7aa" />

      <Ground />
      <PlotGrid />
      <FishingDock />
      <ForagingNodes />
      <CookingStation />
      <Animals />
      <RemotePlayers />
      <Player />
      <Floaters />
      <FollowRig controlsRef={controlsRef} />

      <ContactShadows position={[0, 0.01, 0]} opacity={0.26} scale={20} blur={2.4} far={4} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0.4, 0]}
        maxPolarAngle={Math.PI / 2.35}
        minDistance={4}
        maxDistance={26}
        enableDamping
        enablePan={false}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
    </Canvas>
  )
}
