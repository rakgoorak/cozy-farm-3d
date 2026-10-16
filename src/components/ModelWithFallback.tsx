import { Component, ReactNode, Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { ThreeElements } from '@react-three/fiber'

interface ErrorBoundaryProps {
  fallback?: ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

// กันจอขาว 100%: ถ้าโมเดล .glb โหลดไม่ได้หรือหาไม่พบ -> วาด fallback ทรงเรขาคณิตแบบ Cute Low-Poly แทนทันที
export class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(): void {
    this.setState({ failed: true })
  }

  render(): ReactNode {
    if (this.state.failed) return this.props.fallback ?? null
    return this.props.children
  }
}

type GroupProps = ThreeElements['group']

interface KenneyModelProps extends GroupProps {
  src: string
  fallback?: ReactNode
}

export function modelPath(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/'
  const cleanBase = base.endsWith('/') ? base : `${base}/`
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${cleanBase}${cleanPath}`
}

function GltfInner({ src, ...props }: KenneyModelProps) {
  const resolved = modelPath(src)
  const { scene } = useGLTF(resolved)
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
    <group {...props}>
      <primitive object={cloned} />
    </group>
  )
}

export function KenneyModel({ src, fallback = null, ...props }: KenneyModelProps) {
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GltfInner src={src} {...props} />
      </Suspense>
    </ModelErrorBoundary>
  )
}

try {
  useGLTF.preload(modelPath('models/farmer.glb'))
  useGLTF.preload(modelPath('models/tree.glb'))
  useGLTF.preload(modelPath('models/barn.glb'))
  useGLTF.preload(modelPath('models/cloud.glb'))
  useGLTF.preload(modelPath('models/fountain.glb'))
  useGLTF.preload(modelPath('models/grass-tuft.glb'))
} catch {
  /* ignore preload errors */
}

// ---------- โมเดลสำรอง Cute Low-Poly / Voxel ----------

export function FallbackTree() {
  return (
    <group>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.26, 1.2, 8]} />
        <meshStandardMaterial color="#7c4a21" roughness={1} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <coneGeometry args={[0.95, 1.7, 8]} />
        <meshStandardMaterial color="#3e8948" roughness={1} />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[0.65, 1.1, 8]} />
        <meshStandardMaterial color="#4da355" roughness={1} />
      </mesh>
    </group>
  )
}

export function FallbackBarn() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.8, 2.2]} />
        <meshStandardMaterial color="#dc2626" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.15, 0]} castShadow>
        <cylinderGeometry args={[0.01, 1.75, 1.1, 4, 1]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.7, 1.11]}>
        <boxGeometry args={[0.9, 1.2, 0.06]} />
        <meshStandardMaterial color="#451a03" roughness={1} />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.3]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>
    </group>
  )
}

export function FallbackCloud() {
  const puffs: Array<[number, number, number, number]> = [
    [0, 0, 0, 0.55],
    [0.6, -0.1, 0.1, 0.4],
    [-0.6, -0.12, -0.05, 0.42],
  ]
  return (
    <group>
      {puffs.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[s, 12, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  )
}

export function FallbackFarmer() {
  return (
    <group>
      <mesh position={[-0.14, 0.17, 0]} castShadow>
        <boxGeometry args={[0.19, 0.3, 0.22]} />
        <meshStandardMaterial color="#5b3a1e" roughness={0.9} />
      </mesh>
      <mesh position={[0.14, 0.17, 0]} castShadow>
        <boxGeometry args={[0.19, 0.3, 0.22]} />
        <meshStandardMaterial color="#5b3a1e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.58, 0.55, 0.42]} />
        <meshStandardMaterial color="#58b368" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.57, 0.215]}>
        <boxGeometry args={[0.34, 0.32, 0.03]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.8} />
      </mesh>
      <mesh position={[-0.38, 0.62, 0]} castShadow>
        <boxGeometry args={[0.17, 0.44, 0.19]} />
        <meshStandardMaterial color="#ffd9b3" roughness={0.8} />
      </mesh>
      <mesh position={[0.38, 0.62, 0]} castShadow>
        <boxGeometry args={[0.17, 0.44, 0.19]} />
        <meshStandardMaterial color="#ffd9b3" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.18, 0]} castShadow>
        <boxGeometry args={[0.52, 0.46, 0.46]} />
        <meshStandardMaterial color="#ffdfc4" roughness={0.7} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 1.21, 0.235]}>
          <boxGeometry args={[0.075, 0.11, 0.02]} />
          <meshStandardMaterial color="#1f2937" roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1.47, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.46, 0.06, 16]} />
        <meshStandardMaterial color="#eab308" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.58, 0]} castShadow>
        <cylinderGeometry args={[0.27, 0.3, 0.2, 12]} />
        <meshStandardMaterial color="#facc15" roughness={0.9} />
      </mesh>
    </group>
  )
}
