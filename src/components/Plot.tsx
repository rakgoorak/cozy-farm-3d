import { memo, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFarmStore, PlotData } from '../store/farmStore'
import { PLOT_SIZE, PLOT_COLORS, WET_COLOR, stageTimes, CROPS } from '../game/constants'
import { Plant } from './Plant'

// นับเวลาโตของแปลง (คืนค่า progress 0..1 ของระยะปัจจุบัน)
function useGrowthTimer(plot: PlotData): number {
  const advanceGrowth = useFarmStore((s) => s.advanceGrowth)
  const weatherType = useFarmStore((s) => s.weather.type)
  const [progress, setProgress] = useState(0)

  const id = plot.id
  const state = plot.state
  const growth = plot.growth
  const crop = plot.crop

  useEffect(() => {
    if (state !== 'growing' || !crop) return
    const rate = weatherType === 'sunny' ? 1.2 : 1
    const total = (stageTimes(crop)[Math.min(growth, 2)] * 1000) / rate
    const start = Date.now()
    const iv = setInterval(() => {
      const p = (Date.now() - start) / total
      if (p >= 1) {
        clearInterval(iv)
        setProgress(0)
        advanceGrowth(id)
      } else {
        setProgress(p)
      }
    }, 100)
    return () => clearInterval(iv)
  }, [state, growth, crop, id, advanceGrowth, weatherType])

  return state === 'growing' ? progress : 0
}

// ละอองน้ำหลังรดน้ำ 1.6 วิ (ควบคุมการแสดงผลใน useFrame โดยตรง)
function WaterSplash({ splashAt }: { splashAt: number }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const active = splashAt > 0 && Date.now() - splashAt < 1600
    ref.current.visible = active
    if (active) {
      ref.current.position.y = 0.5 + ((clock.elapsedTime * 1.4) % 0.5)
    }
  })

  if (!splashAt) return null

  const drops: Array<[number, number, number]> = [
    [-0.25, 0, -0.1],
    [0.22, 0.1, 0.12],
    [0, 0.2, -0.22],
    [-0.1, -0.1, 0.24],
    [0.28, -0.15, -0.2],
  ]

  return (
    <group ref={ref} position={[0, 0.6, 0]} visible={false}>
      {drops.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#7dd3fc" transparent opacity={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

function PlotInner({ plot }: { plot: PlotData }) {
  const interactPlot = useFarmStore((s) => s.interactPlot)
  const setHoverPlot = useFarmStore((s) => s.setHoverPlot)
  const hoverPlotId = useFarmStore((s) => s.hoverPlotId)
  const selectedPlotId = useFarmStore((s) => s.selectedPlotId)
  const playerPos = useFarmStore((s) => s.playerPos)
  const resolveAction = useFarmStore((s) => s.resolveAction)
  const hasSprinkler = useFarmStore((s) => s.upgrades.sprinklers.includes(plot.id))
  const [hovered, setHovered] = useState(false)
  const progress = useGrowthTimer(plot)

  const dist = Math.hypot(plot.x - playerPos.x, plot.z - playerPos.z)
  const inRange = dist < 2.6
  const isHover = hoverPlotId === plot.id || hovered
  const isSelected = selectedPlotId === plot.id

  const wet = plot.state === 'growing' || plot.state === 'mature'
  const soilColor = wet ? WET_COLOR : (PLOT_COLORS[plot.state] ?? PLOT_COLORS.empty)
  const action = resolveAction(plot)
  const actionable =
    plot.state === 'mature' ||
    (action === 'till' && plot.state === 'empty') ||
    (action.startsWith('plant') && plot.state === 'tilled') ||
    (action === 'water' && plot.state === 'seeded')

  // คำนวณ progress รวมทั้ง 3 ระยะ (0..1)
  const overallProgress = plot.state === 'growing' ? (plot.growth + progress) / 3 : 0

  return (
    <group position={[plot.x, 0, plot.z]}>
      <mesh
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          interactPlot(plot.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          setHoverPlot(plot.id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          setHoverPlot(null)
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry args={[PLOT_SIZE, 0.22, PLOT_SIZE]} />
        <meshStandardMaterial
          color={soilColor}
          roughness={0.95}
          emissive={isHover || isSelected ? '#fbbf24' : '#000000'}
          emissiveIntensity={isHover || isSelected ? 0.35 : 0}
        />
      </mesh>

      {/* ร่องดินเมื่อพรวนดินแล้ว */}
      {(plot.state === 'tilled' ||
        plot.state === 'seeded' ||
        plot.state === 'growing' ||
        plot.state === 'mature') && (
        <group position={[0, 0.115, 0]}>
          {[-0.3, 0, 0.3].map((x) => (
            <mesh key={x} position={[x, 0, 0]} receiveShadow>
              <boxGeometry args={[0.12, 0.025, PLOT_SIZE * 0.86]} />
              <meshStandardMaterial color={wet ? '#2b1a0c' : '#4a2f18'} roughness={1} />
            </mesh>
          ))}
        </group>
      )}

      {/* ต้นอ่อนเล็กๆ และเมล็ดพันธุ์ตอนเพิ่งหว่านเมล็ด (รอการรดน้ำ) */}
      {plot.state === 'seeded' && (
        <group position={[0, 0.14, 0]}>
          {(
            [
              [-0.24, -0.18],
              [0.22, -0.1],
              [-0.04, 0.22],
            ] as Array<[number, number]>
          ).map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh castShadow>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#fef3c7" roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.06, 0]} castShadow>
                <coneGeometry args={[0.045, 0.1, 6]} />
                <meshStandardMaterial
                  color={plot.crop ? CROPS[plot.crop].leafColor : '#4ade80'}
                  roughness={0.8}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {plot.state === 'growing' && plot.crop && (
        <Plant cropId={plot.crop} growth={plot.growth} mature={false} />
      )}
      {plot.state === 'mature' && plot.crop && (
        <Plant cropId={plot.crop} growth={2} mature giant={plot.giant} />
      )}

      <WaterSplash splashAt={plot.splashAt} />

      {/* สปริงเกอร์อัตโนมัติ */}
      {hasSprinkler && <SprinklerHead />}

      {/* หลอด Progress Bar ลอยเหนือแปลง */}
      {plot.state === 'growing' && (
        <group position={[0, 1.25, 0]}>
          <mesh>
            <boxGeometry args={[0.76, 0.11, 0.06]} />
            <meshBasicMaterial color="#1f2937" toneMapped={false} />
          </mesh>
          <mesh position={[-0.36 + 0.36 * overallProgress, 0, 0.008]}>
            <boxGeometry args={[Math.max(0.02, 0.72 * overallProgress), 0.065, 0.065]} />
            <meshBasicMaterial color="#4ade80" toneMapped={false} />
          </mesh>
        </group>
      )}

      {/* กรอบ Highlight แปลงที่กำลังเลือก / อยู่ในระยะ */}
      {(isHover || isSelected || (inRange && actionable)) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]}>
          <ringGeometry args={[PLOT_SIZE * 0.52, PLOT_SIZE * 0.64, 24]} />
          <meshBasicMaterial
            color={plot.state === 'mature' ? '#fbbf24' : inRange ? '#4ade80' : '#ffffff'}
            transparent
            opacity={0.92}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  )
}

export const Plot = memo(PlotInner)

function SprinklerHead() {
  const head = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (head.current) head.current.rotation.y += Math.min(dt, 0.05) * 4
  })
  return (
    <group position={[0.48, 0, 0.48]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.5, 8]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} />
      </mesh>
      <group ref={head} position={[0, 0.52, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.07, 0.07]} />
          <meshStandardMaterial color="#3b82f6" metalness={0.4} roughness={0.5} />
        </mesh>
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, -0.02, 0]}>
            <sphereGeometry args={[0.035, 6, 6]} />
            <meshBasicMaterial color="#7dd3fc" toneMapped={false} transparent opacity={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function PlotGrid() {
  const plots = useFarmStore((s) => s.plots)
  return (
    <group>
      {plots.map((p) => (
        <Plot key={p.id} plot={p} />
      ))}
    </group>
  )
}
