// Salin GRAPH_DATA dari graph/index.html ke graph/data/graf.json untuk landing page (/).
// Satu sumber kebenaran tetap GRAPH_DATA di index.html. Jalankan ulang setiap GRAPH_DATA berubah:
//   node graph/ekstrak_graf.mjs
// Cara ambilnya sama dengan visualizer/scripts/build_map_data.mjs: cari kurung kurawal pasangannya, lalu node:vm.
import fs from 'node:fs'
import vm from 'node:vm'

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8')
const start = html.indexOf('const GRAPH_DATA = ')
if (start < 0) throw new Error('GRAPH_DATA tidak ditemukan di graph/index.html')
const i0 = html.indexOf('{', start)
let depth = 0, j = i0
for (; j < html.length; j++) { if (html[j] === '{') depth++; else if (html[j] === '}' && --depth === 0) break }
const data = vm.runInNewContext('(' + html.slice(i0, j + 1) + ')')

const out = new URL('./data/graf.json', import.meta.url)
fs.mkdirSync(new URL('./data/', import.meta.url), { recursive: true })
fs.writeFileSync(out, JSON.stringify(data) + '\n')
console.log(`graf.json: ${Object.keys(data.nodes).length} simpul, ${data.paths.length} rute, ${(data.cctvPoints || []).length} titik CCTV`)
