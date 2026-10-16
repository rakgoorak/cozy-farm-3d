// ดาวน์โหลดโมเดล 3D .glb จากคลัง KenneyNL บน GitHub + ตรวจสอบโครงสร้างไฟล์ .glb ทั้งหมด
// รัน: node scripts/verify-glb.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models')
const texDir = join(root, 'Textures')
mkdirSync(texDir, { recursive: true })

const KENNEY_SOURCES = [
  {
    file: 'farmer.glb',
    url: 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-3D-Platformer/master/models/character.glb',
  },
  {
    file: 'cloud.glb',
    url: 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-3D-Platformer/master/models/cloud.glb',
  },
  {
    file: 'grass-tuft.glb',
    url: 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-3D-Platformer/master/models/grass.glb',
  },
  {
    file: 'coin.glb',
    url: 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-3D-Platformer/master/models/coin-gold.glb',
  },
  {
    file: 'flag.glb',
    url: 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-3D-Platformer/master/models/flag.glb',
  },
  {
    file: 'barn.glb',
    url: 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-City-Builder/master/models/building-small-a.glb',
  },
  {
    file: 'fountain.glb',
    url: 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-City-Builder/master/models/pavement-fountain.glb',
  },
  {
    file: 'tree.glb',
    url: 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-City-Builder/master/models/grass-trees.glb',
  },
  {
    file: 'windmill.glb',
    url: 'https://raw.githubusercontent.com/KenneyNL/Starter-Kit-City-Builder/master/models/building-small-b.glb',
  },
]

async function ensureDownloaded() {
  for (const item of KENNEY_SOURCES) {
    const target = join(root, item.file)
    if (existsSync(target) && statSync(target).size > 12) continue
    try {
      const res = await fetch(item.url, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const ab = await res.arrayBuffer()
        const buf = Buffer.from(ab)
        if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'glTF') {
          writeFileSync(target, buf)
          console.log(`Downloaded ${item.file} (${buf.length} bytes) from KenneyNL`)
        }
      }
    } catch (e) {
      console.warn(`Skipped download for ${item.file}: ${e.message}`)
    }
  }
}

function parseGlb(buf, name) {
  const report = { file: name, size: buf.length, ok: false, errors: [] }
  if (buf.length === 0) {
    report.errors.push('empty file (size 0)')
    return report
  }
  if (buf.length < 12) {
    report.errors.push('too small for glb header')
    return report
  }
  const magic = buf.subarray(0, 4).toString('ascii')
  const version = buf.readUInt32LE(4)
  const length = buf.readUInt32LE(8)
  report.magic = magic
  report.version = version
  report.headerLength = length
  if (magic !== 'glTF') report.errors.push(`bad magic: ${magic}`)
  if (version !== 2) report.errors.push(`unexpected version: ${version}`)
  if (length !== buf.length) report.errors.push(`header length ${length} != actual ${buf.length}`)

  // chunk 0 = JSON
  const offset = 12
  if (offset + 8 > buf.length) {
    report.errors.push('missing json chunk header')
    return report
  }
  const jsonLen = buf.readUInt32LE(offset)
  const jsonType = buf.subarray(offset + 4, offset + 8).toString('ascii')
  report.jsonChunk = { length: jsonLen, type: jsonType }
  if (jsonType !== 'JSON') report.errors.push(`json chunk type != JSON: ${jsonType}`)
  const jsonBuf = buf.subarray(offset + 8, offset + 8 + jsonLen)
  let json
  try {
    json = JSON.parse(jsonBuf.toString('utf8'))
  } catch (e) {
    report.errors.push(`json parse failed: ${e.message}`)
    return report
  }
  report.asset = json.asset
  report.nodeCount = (json.nodes || []).length
  report.meshCount = (json.meshes || []).length
  report.meshes = (json.meshes || []).map((m, i) => ({
    index: i,
    name: m.name ?? `mesh-${i}`,
    primitives: m.primitives.length,
  }))
  report.animations = (json.animations || []).map((a) => a.name ?? '(unnamed)')
  report.materials = (json.materials || []).map((m) => m.name ?? '(unnamed)')

  // ประเมิน bounding box จาก accessor min/max ของ POSITION
  const boxes = []
  for (const m of json.meshes || []) {
    for (const p of m.primitives) {
      const posIdx = p.attributes?.POSITION
      const acc = json.accessors?.[posIdx]
      if (acc?.min && acc?.max) boxes.push({ min: acc.min, max: acc.max })
    }
  }
  if (boxes.length) {
    const gmin = [Infinity, Infinity, Infinity]
    const gmax = [-Infinity, -Infinity, -Infinity]
    for (const b of boxes) {
      for (let i = 0; i < 3; i++) {
        gmin[i] = Math.min(gmin[i], b.min[i])
        gmax[i] = Math.max(gmax[i], b.max[i])
      }
    }
    report.boundingBox = { min: gmin, max: gmax }
    report.estimatedHeight = +(gmax[1] - gmin[1]).toFixed(3)
    report.estimatedWidth = +(gmax[0] - gmin[0]).toFixed(3)
    report.estimatedDepth = +(gmax[2] - gmin[2]).toFixed(3)
  }
  report.ok = report.errors.length === 0
  return report
}

await ensureDownloaded()

const files = readdirSync(root).filter((f) => f.endsWith('.glb'))
if (!files.length) {
  console.error('no .glb files found in public/models')
  process.exit(1)
}
const reports = []
let fail = 0
for (const f of files) {
  const p = join(root, f)
  const st = statSync(p)
  const buf = readFileSync(p)
  const r = parseGlb(buf, f)
  r.mtimeSize = st.size
  reports.push(r)
  console.log(`\n=== ${f} (${st.size} bytes) ===`)
  console.log(`magic=${r.magic} version=${r.version} ok=${r.ok}`)
  if (r.errors.length) {
    fail++
    for (const e of r.errors) console.log(`  ERROR: ${e}`)
  }
  console.log(`  meshes(${r.meshCount}): ${(r.meshes || []).map((m) => m.name).join(', ')}`)
  console.log(`  animations(${r.animations.length}): ${r.animations.join(', ') || '-'}`)
  if (r.boundingBox) {
    console.log(
      `  bbox W×H×D ≈ ${r.estimatedWidth} × ${r.estimatedHeight} × ${r.estimatedDepth}`,
      JSON.stringify(r.boundingBox),
    )
  }
}
writeFileSync(join(root, 'verify-report.json'), JSON.stringify(reports, null, 2))
console.log(`\nWrote public/models/verify-report.json — ${reports.length - fail}/${reports.length} OK`)
process.exit(fail ? 1 : 0)
