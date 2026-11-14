/* Captura lecciones con Chrome headless (puppeteer-core) para revisar la UX.

   pnpm visual                 → home + todas las lecciones (claro y oscuro, desktop y móvil)
   pnpm visual datos preparar  → solo esas
   Opciones: --base http://localhost:5190  --no-mobile  --click (pulsa los botones "play" de cada lab antes de capturar)

   Las capturas quedan en scripts/shots/<slug>-<tema>-<ancho>.png. También imprime los
   errores de consola del navegador y las excepciones de página. */

import { mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : def
}
const base = opt('base', 'http://localhost:5190')
const slugs = args.filter((a) => !a.startsWith('--') && a !== opt('base', ''))
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const outDir = join(process.cwd(), 'scripts', 'shots')
mkdirSync(outDir, { recursive: true })

const allSlugs = readdirSync(join(process.cwd(), 'src', 'lessons'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
const targets = slugs.length ? slugs : ['home', ...allSlugs]

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
const widths = flag('no-mobile') ? [1280] : [1280, 390]
let problems = 0

for (const slug of targets) {
  for (const theme of ['dark', 'light']) {
    for (const width of widths) {
      const page = await browser.newPage()
      const errors = []
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text())
      })
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 })
      await page.evaluateOnNewDocument((t) => localStorage.setItem('theme', t), theme)
      const url = slug === 'home' ? `${base}/` : `${base}/leccion/${slug}`
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
        await new Promise((r) => setTimeout(r, 600))
        if (flag('click')) {
          const n = await page.$$eval('button[aria-label="Reproducir"]', (bs) => {
            bs.forEach((b) => b.click())
            return bs.length
          })
          await new Promise((r) => setTimeout(r, 1500))
          if (n) console.log(`  ${slug}: pulsados ${n} play`)
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        const file = join(outDir, `${slug}-${theme}-${width}.png`)
        await page.screenshot({ path: file, fullPage: true })
        const notFound = await page.evaluate(() => document.body.innerText.includes('Esta página no existe') || document.body.innerText.includes('falló al renderizar'))
        const status = [overflow > 0 ? `OVERFLOW ${overflow}px` : '', notFound ? 'NOT FOUND / RENDER ERROR' : '', ...errors].filter(Boolean)
        if (status.length) problems++
        console.log(`${status.length ? '✗' : '✓'} ${slug} ${theme} ${width}px ${status.join(' · ')}`)
      } catch (e) {
        problems++
        console.log(`✗ ${slug} ${theme} ${width}px: ${e.message}`)
      }
      await page.close()
    }
  }
}
await browser.close()
console.log(problems ? `\n${problems} capturas con problemas` : '\nTodo OK')
process.exit(problems ? 1 : 0)
