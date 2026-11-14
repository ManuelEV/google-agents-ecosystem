/* Catálogo de modelos Gemini disponibles en la plataforma.
   Verificado el 13-nov-2026 contra:
   - docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions (ciclo de vida)
   - docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/4-argon (ficha)
   - aistudio.google.com/docs/pricing (precios de la API de Gemini, nivel pagado)
   Los precios de Vertex pueden diferir levemente; revisa siempre la página oficial antes de presupuestar. */

export type ModelTier = 'frontier' | 'everyday' | 'flash' | 'lite'

export type GeminiModel = {
  id: string
  name: string
  tier: ModelTier
  /** US$ por 1M tokens */
  input: number
  output: number
  /** precio que regirá después de la promoción, si aplica */
  inputAfter?: number
  outputAfter?: number
  promoUntil?: string
  /** ventana de contexto (tokens) */
  context: number
  status: 'GA' | 'Corto plazo' | 'Preview'
  released: string
  retires?: string
  thinking: string
  bestFor: string
  /** latencia relativa 1 (rápido) … 5 (lento) y "capacidad" 1…5, para el lab de decisión */
  speed: number
  capability: number
  notes?: string
}

export const MODELS: GeminiModel[] = [
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    tier: 'frontier',
    input: 2,
    output: 10,
    inputAfter: 4,
    outputAfter: 20,
    promoUntil: '2026-11-30',
    context: 1_048_576,
    status: 'GA',
    released: '2026-10-13',
    retires: '≥ 2027-10-13',
    thinking: 'LOW / MEDIUM (defecto) / HIGH',
    bestFor: 'Razonamiento profundo: planificación larga, análisis difíciles, código complejo.',
    speed: 4,
    capability: 5,
    notes: 'Ignora temperature/top_p/top_k. No soporta thinking_budget ni caché explícita. Solo endpoints global/us/eu.',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon',
    tier: 'frontier',
    input: 2,
    output: 10,
    inputAfter: 4,
    outputAfter: 20,
    promoUntil: '2026-11-30',
    context: 1_048_576,
    status: 'Corto plazo',
    released: '2026-11-10',
    thinking: 'LOW / MEDIUM / HIGH',
    bestFor: 'Razonamiento profundo (segunda variante frontier de la familia 4).',
    speed: 4,
    capability: 5,
    notes: 'Lanzado como modelo de corto plazo: sin fecha de retiro anunciada todavía.',
  },
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen',
    tier: 'everyday',
    input: 1.5,
    output: 7.5,
    context: 1_048_576,
    status: 'Corto plazo',
    released: '2026-11-12',
    thinking: 'niveles',
    bestFor: 'El "modelo de todos los días" para código y flujos agénticos: rápido y 1M de contexto.',
    speed: 2,
    capability: 4,
    notes: 'Google lo presenta como sucesor de la línea Flash para trabajo agéntico. Recién lanzado: valida disponibilidad en tu región.',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tier: 'flash',
    input: 0.75,
    output: 3.75,
    inputAfter: 1.5,
    outputAfter: 7.5,
    promoUntil: '2026-12-31',
    context: 1_048_576,
    status: 'GA',
    released: '2026-09-02',
    retires: '≥ 2027-09-02',
    thinking: 'niveles',
    bestFor: 'Sub-agentes especializados, herramientas, clasificación y resúmenes con buena relación costo/calidad.',
    speed: 2,
    capability: 3,
    notes: 'Es el Flash GA más reciente y el reemplazo sugerido para 2.5 Pro/Flash y 3.6/3.7 Flash.',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    tier: 'flash',
    input: 0.5,
    output: 3,
    context: 1_048_576,
    status: 'GA',
    released: '2026-05-19',
    retires: '≥ 2027-05-19',
    thinking: 'niveles',
    bestFor: 'Alternativa estable si tu organización todavía no homologó 3.8.',
    speed: 2,
    capability: 3,
    notes: 'Precio no listado en la página de la API consultada; cifra orientativa.',
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    tier: 'lite',
    input: 0.3,
    output: 2.5,
    context: 1_048_576,
    status: 'GA',
    released: '2026-07-21',
    retires: '≥ 2027-07-21',
    thinking: 'niveles',
    bestFor: 'Routers, guardrails "LLM como juez", extracción simple y tareas de altísimo volumen.',
    speed: 1,
    capability: 2,
  },
]

/** Alias que usan los ejemplos de la documentación de ADK: siempre apunta al Flash estable más nuevo. */
export const FLASH_ALIAS = 'gemini-flash-latest'

/** Modelos que usan los ejemplos del repositorio. */
export const MODEL_ROOT = 'gemini-4-hydrogen'
export const MODEL_WORKER = 'gemini-3.8-flash'
export const MODEL_LITE = 'gemini-3.5-flash-lite'

export const modelById = (id: string) => MODELS.find((m) => m.id === id)

/** Costo en US$ de una llamada. */
export function costOf(model: GeminiModel, inputTokens: number, outputTokens: number, after = false) {
  const i = after && model.inputAfter ? model.inputAfter : model.input
  const o = after && model.outputAfter ? model.outputAfter : model.output
  return (inputTokens / 1e6) * i + (outputTokens / 1e6) * o
}
