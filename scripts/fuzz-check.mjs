// Fuzz de interactividad: entra a cada lección, pulsa "Paso siguiente" hasta el final en cada PlayerBar,
// luego hace clic una vez en cada botón visible (salvo navegación), y reporta errores de página/consola.
import { readdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const base = 'http://localhost:5190'
const root = 'C:/Users/desig/Desktop/Proyectos/agents/google-agents-ecosystem'
const slugs = readdirSync(`${root}/src/lessons`, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] })
let bad = 0
for (const slug of slugs) {
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await page.setViewport({ width: 1280, height: 900 })
  await page.goto(`${base}/leccion/${slug}`, { waitUntil: 'networkidle0' })
  // 1) avanzar todos los players
  let steps = 0
  for (let i = 0; i < 60; i++) {
    const n = await page.$$eval('button[aria-label="Paso siguiente"]:not([disabled])', (bs) => { bs.forEach((b) => b.click()); return bs.length })
    if (!n) break
    steps += n
    await new Promise((r) => setTimeout(r, 120))
  }
  // 2) clic en cada botón (una vez), saltando navegación/tema
  const clicked = await page.evaluate(async () => {
    const skip = /Abrir menú|Cambiar a tema|Reiniciar|Paso anterior|Paso siguiente|Reproducir|Pausar|Mostrar todo|Copiar/
    const bs = [...document.querySelectorAll('main button')].filter((b) => !skip.test(b.getAttribute('aria-label') || '') && !skip.test(b.textContent || '') && !b.disabled)
    let c = 0
    for (const b of bs) { b.click(); c++; await new Promise((r) => setTimeout(r, 15)) }
    return c
  })
  await new Promise((r) => setTimeout(r, 800))
  const status = errs.length ? `✗ ${errs.slice(0, 3).join(' | ')}` : '✓'
  if (errs.length) bad++
  console.log(`${status} ${slug}: ${steps} pasos avanzados, ${clicked} botones pulsados`)
  await page.close()
}
await browser.close()
console.log(bad ? `${bad} lecciones con errores` : 'Sin errores de interacción')
