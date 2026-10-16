import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useFarmStore, FloaterData } from '../store/farmStore'

function Floater({ f }: { f: FloaterData }) {
  const ref = useRef<THREE.Group>(null)
  const born = useRef<number | null>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    if (born.current === null) born.current = clock.elapsedTime
    const age = clock.elapsedTime - born.current
    ref.current.position.y = 1.7 + age * 0.9
  })
  return (
    <Billboard ref={ref} position={[f.x, 1.7, f.z]}>
      <Text
        fontSize={0.3}
        color={f.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#1c1917"
      >
        {f.text}
      </Text>
    </Billboard>
  )
}

export function Floaters() {
  const floaters = useFarmStore((s) => s.floaters)
  if (!floaters.length) return null
  return (
    <Suspense fallback={null}>
      {floaters.map((f) => (
        <Floater key={f.id} f={f} />
      ))}
    </Suspense>
  )
}
