import { RefObject, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF, Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useFarmStore } from '../store/farmStore'
import { useKeys } from '../game/useKeys'
import { MOVE_SPEED, BOUNDS, OUTFIT_COLORS, OutfitOption } from '../game/constants'
import { sfx } from '../game/sounds'
import { ModelErrorBoundary, FallbackFarmer, modelPath } from './ModelWithFallback'
import { useCurrentTime } from '../game/useCurrentTime'

function KenneyFarmer({ moving, acting }: { moving: boolean; acting: boolean }) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(modelPath('models/farmer.glb'))
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    const idle = actions['idle'] ?? (names[0] ? actions[names[0]] : null)
    const walk = actions['walk'] ?? (names[1] ? actions[names[1]] : null)
    const jump = actions['jump'] ?? walk
    if (!idle) return
    const active = acting ? (jump ?? walk ?? idle) : moving ? (walk ?? idle) : idle
    active?.reset().fadeIn(0.18).play()
    return () => {
      active?.fadeOut(0.18)
    }
  }, [moving, acting, actions, names])

  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((obj) => {
      if ('isMesh' in obj && obj.isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
    return c
  }, [scene])

  return (
    <group ref={group} scale={1.8} position={[0, 0.36, 0]}>
      <primitive object={cloned} />
    </group>
  )
}

export function Player() {
  const group = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const keys = useKeys()
  const walkTime = useRef(0)
  const targetAngle = useRef(Math.PI)
  const pos = useRef({ x: 0, z: 5.4 })
  const lastSent = useRef({ x: 0, z: 5.4, t: 0 })
  const lastStepSfx = useRef(0)
  const movingRef = useRef(false)
  const actingRef = useRef(false)
  const camForward = useRef(new THREE.Vector3())
  const camRight = useRef(new THREE.Vector3())
  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const [isMoving, setIsMoving] = useState(false)
  const [isActing, setIsActing] = useState(false)

  const outfitId = useFarmStore((s) => s.outfitId)
  const playerName = useFarmStore((s) => s.playerName)
  const activeEmote = useFarmStore((s) => s.activeEmote)
  const outfit = OUTFIT_COLORS.find((o) => o.id === outfitId) ?? OUTFIT_COLORS[0]
  const now = useCurrentTime()
  const showEmote = Boolean(activeEmote && activeEmote.until > now)

  useFrame((state, delta) => {
    const k = keys.current
    const st = useFarmStore.getState()
    const now = state.clock.elapsedTime
    const nowMs = Date.now()

    const actNow = st.lastActAt > 0 && nowMs - st.lastActAt < 550
    if (actNow !== actingRef.current) {
      actingRef.current = actNow
      setIsActing(actNow)
    }

    const tm = st.touchMove
    const boots = st.upgrades.speedBoots
    const foodBuff = st.speedBuffUntil > nowMs
    const speed = MOVE_SPEED * (boots ? 1.4 : 1) * (foodBuff ? 1.5 : 1)

    // inputForward > 0 คือเดินขึ้นหน้าจอ (W / ArrowUp), < 0 คือเดินลงหน้าจอ (S / ArrowDown)
    const inputForward = ((k['up'] ? 1 : 0) - (k['down'] ? 1 : 0)) + (tm.f || 0)
    // inputRight > 0 คือเดินไปทางขวาของหน้าจอ (D / ArrowRight), < 0 คือเดินไปทางซ้าย (A / ArrowLeft)
    const inputRight = ((k['right'] ? 1 : 0) - (k['left'] ? 1 : 0)) + (tm.s || 0)

    const moving = inputForward !== 0 || inputRight !== 0
    if (moving !== movingRef.current) {
      movingRef.current = moving
      setIsMoving(moving)
    }
    const dt = Math.min(delta, 0.05)

    if (moving) {
      // คำนวณทิศทางอ้างอิงตามมุมกล้องปัจจุบันบนระนาบพื้น (Camera-Relative XZ Movement)
      state.camera.getWorldDirection(camForward.current)
      camForward.current.y = 0
      if (camForward.current.lengthSq() > 0.0001) {
        camForward.current.normalize()
      } else {
        camForward.current.set(0, 0, -1)
      }
      camRight.current.crossVectors(camForward.current, upVec).normalize()

      const moveX = camForward.current.x * inputForward + camRight.current.x * inputRight
      const moveZ = camForward.current.z * inputForward + camRight.current.z * inputRight
      const len = Math.hypot(moveX, moveZ) || 1
      const dx = moveX / len
      const dz = moveZ / len

      const nx = pos.current.x + dx * speed * dt
      const nz = pos.current.z + dz * speed * dt
      pos.current.x = THREE.MathUtils.clamp(nx, -BOUNDS, BOUNDS)
      pos.current.z = THREE.MathUtils.clamp(nz, -BOUNDS, BOUNDS)
      targetAngle.current = Math.atan2(dx, dz)
      walkTime.current += dt * (foodBuff ? 14 : 10)

      if (now - lastStepSfx.current > 0.3) {
        lastStepSfx.current = now
        sfx.step()
      }

      const moved = Math.hypot(
        pos.current.x - lastSent.current.x,
        pos.current.z - lastSent.current.z,
      )
      if (moved > 0.1 || now - lastSent.current.t > 0.12) {
        lastSent.current = { x: pos.current.x, z: pos.current.z, t: now }
        st.setPlayerTransform(pos.current.x, pos.current.z, targetAngle.current, true)
      }
    } else {
      if (lastSent.current.t > 0 && now - lastSent.current.t > 0.3) {
        lastSent.current.t = now
        st.setPlayerTransform(pos.current.x, pos.current.z, targetAngle.current, false)
      }
    }

    if (!group.current) return
    group.current.position.set(pos.current.x, 0, pos.current.z)
    const g = group.current
    let diff = targetAngle.current - g.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    g.rotation.y += diff * Math.min(1, dt * 12)

    const t = walkTime.current
    if (moving) {
      g.position.y = Math.abs(Math.sin(t)) * 0.09
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
      const idle = state.clock.elapsedTime
      g.position.y = actingRef.current
        ? Math.abs(Math.sin(idle * 12)) * 0.12
        : Math.sin(idle * 2) * 0.015
      if (bodyRef.current) {
        bodyRef.current.rotation.z = 0
        bodyRef.current.position.y = 0.62 + Math.sin(idle * 2) * 0.008
      }
      for (const r of [armL, armR, legL, legR]) {
        if (r.current) r.current.rotation.x *= 0.85
      }
    }
  })

  const fallbackNode = (
    <ChibiBody
      bodyRef={bodyRef}
      armL={armL}
      armR={armR}
      legL={legL}
      legR={legR}
      outfit={outfit}
    />
  )

  return (
    <group ref={group} position={[0, 0, 5.4]} rotation={[0, Math.PI, 0]}>
      {/* เงาใต้ตัวละคร */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[0.42, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>

      {/* ป้ายชื่อและ Emote ลอยเหนือหัวผู้เล่น */}
      <Billboard position={[0, 1.95, 0]}>
        <Text
          fontSize={0.24}
          color="#fde047"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#1c1917"
        >
          {playerName}
        </Text>
        {showEmote && (
          <group position={[0, 0.38, 0]}>
            <Text
              fontSize={0.34}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="#1c1917"
            >
              {activeEmote?.text}
            </Text>
          </group>
        )}
      </Billboard>

      <ModelErrorBoundary fallback={fallbackNode}>
        <Suspense fallback={fallbackNode}>
          <KenneyFarmer moving={isMoving} acting={isActing} />
        </Suspense>
      </ModelErrorBoundary>
    </group>
  )
}

interface ChibiBodyProps {
  bodyRef: RefObject<THREE.Group | null>
  armL: RefObject<THREE.Group | null>
  armR: RefObject<THREE.Group | null>
  legL: RefObject<THREE.Group | null>
  legR: RefObject<THREE.Group | null>
  outfit?: OutfitOption
}

function ChibiBody({ bodyRef, armL, armR, legL, legR, outfit }: ChibiBodyProps) {
  const shirtColor = outfit?.shirt ?? '#58b368'
  const hatColor = outfit?.hat ?? '#eab308'

  return (
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
          <meshStandardMaterial color={shirtColor} roughness={0.8} />
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
        {[-0.19, 0.19].map((x) => (
          <mesh key={x} position={[x, -0.09, 0.232]}>
            <boxGeometry args={[0.09, 0.06, 0.015]} />
            <meshStandardMaterial color="#f9a8d4" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0.29, 0]} castShadow>
          <cylinderGeometry args={[0.46, 0.46, 0.06, 16]} />
          <meshStandardMaterial color={hatColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.27, 0.3, 0.2, 12]} />
          <meshStandardMaterial color={hatColor} roughness={0.9} />
        </mesh>
      </group>
      <mesh position={[0, 0.68, -0.28]} castShadow>
        <boxGeometry args={[0.4, 0.42, 0.18]} />
        <meshStandardMaterial color="#a16207" roughness={0.9} />
      </mesh>
    </group>
  )
}

export { FallbackFarmer }
