// @vitest-environment jsdom
/**
 * Tes asap: me-mount App penuh dengan data publik asli (fetch dialihkan ke berkas lokal)
 * dan memastikan alur utama: muat data, ganti kondisi, pilih rute, putar langkah, hasil akhir, residual.
 */
import fs from 'node:fs'
import path from 'node:path'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import App from './App.vue'
import MapCanvas from './components/MapCanvas.vue'
import StepPlayer from './components/StepPlayer.vue'
import type { RoutesFile } from './core/types'

const dataDir = path.resolve(__dirname, '../public/data')
const routes = JSON.parse(fs.readFileSync(path.join(dataDir, 'routes.json'), 'utf-8')) as RoutesFile

beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const file = path.join(dataDir, path.basename(url))
    if (!fs.existsSync(file)) return { ok: false, status: 404, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(file, 'utf-8')) }
  })
})

afterEach(() => vi.clearAllTimers())

async function mountApp() {
  const wrapper = mount(App, { attachTo: document.body })
  for (let i = 0; i < 8; i++) await flushPromises()
  return wrapper
}

const clickByText = async (wrapper: ReturnType<typeof mount>, selector: string, text: string) => {
  const el = wrapper.findAll(selector).find((b) => b.text().includes(text))
  expect(el, `${selector} berisi "${text}"`).toBeTruthy()
  await el!.trigger('click')
  for (let i = 0; i < 6; i++) await flushPromises()
}

describe('App (smoke)', () => {
  it('memuat run default: arus maksimum, panel algoritma, dua kondisi, dan rute', async () => {
    const wrapper = await mountApp()
    expect(wrapper.find('header').text()).toContain('Arus maksimum')
    expect(wrapper.text()).toContain('Algoritma Ford-Fulkerson')
    expect(wrapper.text()).toContain('Tanpa pasar vs pasar penuh')
    expect(wrapper.text()).toContain('Semua rute')
    expect(wrapper.text()).toContain('Awal: belum ada arus')
    wrapper.unmount()
  })

  it('memutar ke langkah 1 menampilkan sisa kapasitas, ruas tersempit, dan total arus', async () => {
    const wrapper = await mountApp()
    wrapper.findComponent(StepPlayer).vm.$emit('update:currentStepIndex', 1)
    await flushPromises()
    expect(wrapper.text()).toContain('Langkah 1 dari')
    expect(wrapper.text()).toContain('tersempit')
    expect(wrapper.text()).toContain('Total arus:')
    wrapper.unmount()
  })

  it('di langkah terakhir menampilkan hasil akhir dan Σ kapasitas potongan = max flow', async () => {
    const wrapper = await mountApp()
    const player = wrapper.findComponent(StepPlayer)
    player.vm.$emit('update:currentStepIndex', player.props('totalSteps') as number)
    await flushPromises()
    expect(wrapper.text()).toContain('Hasil akhir')
    expect(wrapper.text()).toContain('max flow ✓')
    wrapper.unmount()
  })

  it('mengganti kondisi ke pasar penuh mengubah lencana kondisi di header', async () => {
    const wrapper = await mountApp()
    await clickByText(wrapper, 'button', 'Pasar penuh')
    expect(wrapper.find('header').text()).toContain('Pasar penuh')
    await clickByText(wrapper, 'button', 'Tanpa pasar')
    expect(wrapper.find('header').text()).toContain('Tanpa pasar')
    wrapper.unmount()
  })

  it('memilih satu rute hanya menampilkan ruas rute itu; Semua rute mengembalikannya', async () => {
    const wrapper = await mountApp()
    const map = wrapper.findComponent(MapCanvas)
    expect(map.props('visibleEdgeIds')).toBeNull()

    const pair = wrapper.findAll('button').find((b) => b.text().includes('S1 → T1'))!
    await pair.trigger('click')
    for (let i = 0; i < 6; i++) await flushPromises()
    const route = routes.routes.find((r) => r.source === 'S1' && r.sink === 'T1')!
    await clickByText(wrapper, 'button', route.corridor)
    expect(wrapper.findComponent(MapCanvas).props('visibleEdgeIds')).toEqual(route.edgeIds)

    await clickByText(wrapper, 'button', 'Semua rute')
    expect(wrapper.findComponent(MapCanvas).props('visibleEdgeIds')).toBeNull()
    wrapper.unmount()
  })

  it('mode residual memunculkan entri edge balik di legenda', async () => {
    const wrapper = await mountApp()
    expect(wrapper.text()).not.toContain('Edge balik (↩)')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(wrapper.text()).toContain('Edge balik (↩)')
    wrapper.unmount()
  })
})
