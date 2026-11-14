/* Utilidades numéricas y de formato compartidas por las lecciones. */

/** Generador pseudoaleatorio determinista (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Estimación didáctica de tokens (≈ 3,8 caracteres por token en español). */
export const countTokens = (text: string) => Math.max(1, Math.round(text.length / 3.8))

export const fmt = (n: number, d = 2) => n.toLocaleString('es-CL', { maximumFractionDigits: d, minimumFractionDigits: d })
export const fmtInt = (n: number) => Math.round(n).toLocaleString('es-CL')
export const fmtUsd = (n: number, d = n < 0.01 ? 5 : n < 1 ? 4 : 2) => `US$ ${n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d })}`
export const fmtClp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`
export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`

/** minúsculas sin tildes, para comparar texto. */
export const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
