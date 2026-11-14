import type { Tone } from '../../components/ui'
import { MODEL_LITE, MODEL_ROOT, MODEL_WORKER, type ModelTier } from '../../sim/models'

export const TIER_TONE: Record<ModelTier, Tone> = { frontier: 'model', everyday: 'accent', flash: 'data', lite: 'tool' }
export const TIER_LABEL: Record<ModelTier, string> = { frontier: 'Frontier', everyday: 'Diario', flash: 'Flash', lite: 'Lite' }

/* Roles dentro de un sistema de agentes y el modelo que usan los ejemplos. */
export type Role = { id: string; title: string; desc: string; model: string; tone: Tone; why: string }
export const ROLES: Role[] = [
  {
    id: 'root',
    title: 'Raíz / orquestador',
    desc: 'Lee la conversación, decide a qué sub-agente delegar, redacta la respuesta final.',
    model: MODEL_ROOT,
    tone: 'model',
    why: 'Pocas llamadas por turno pero cada decisión importa: errar la delegación arruina todo lo que sigue. Hydrogen da capacidad alta con 1M de contexto a precio de "modelo diario".',
  },
  {
    id: 'worker',
    title: 'Especialistas con herramientas',
    desc: 'pedidos_agent, devoluciones_agent, analitica_agent: llaman herramientas y resumen resultados.',
    model: MODEL_WORKER,
    tone: 'data',
    why: 'Son la mayoría de las llamadas. Tareas acotadas con herramientas bien descritas: un Flash GA las resuelve y cuesta la mitad que Hydrogen (hasta el 31-dic-2026, un cuarto).',
  },
  {
    id: 'router',
    title: 'Router / juez / extracción',
    desc: 'Clasificar un mensaje en una etiqueta, juzgar si una respuesta es segura, extraer campos.',
    model: MODEL_LITE,
    tone: 'tool',
    why: 'Una etiqueta de salida, latencia mínima y volumen altísimo: Flash-Lite. Es también lo que la guía de seguridad de ADK sugiere para "Gemini como juez".',
  },
  {
    id: 'deep',
    title: 'Análisis profundo (puntual)',
    desc: 'Un informe semanal, un análisis de causa raíz, código complejo.',
    model: 'gemini-4-argon',
    tone: 'guard',
    why: 'Solo cuando el razonamiento largo vale lo que cuesta. Argon ignora temperature y no acepta thinking_budget: controlas el esfuerzo con el nivel de thinking.',
  },
]

/* Lab de thinking: cómo crece el output según el nivel (proporciones ilustrativas). */
export type ThinkLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export const THINK: Record<ThinkLevel, { thinking: number; answer: number; trace: string[] }> = {
  LOW: {
    thinking: 90,
    answer: 70,
    trace: ['El pedido 4821 tiene tracking → llamo a get_order_status.', 'Respondo con estado y ETA.'],
  },
  MEDIUM: {
    thinking: 420,
    answer: 80,
    trace: [
      'Usuario pregunta por el pedido 4821: necesito datos reales → get_order_status.',
      'Resultado: en_ruta, AndesExpress, ETA 2026-11-14. ¿Conviene también track_shipment? Hay tracking, pero el usuario no pidió detalle del transportista.',
      'Respondo breve: estado, transportista, ETA. Formato de monto $69.990.',
    ],
  },
  HIGH: {
    thinking: 1600,
    answer: 95,
    trace: [
      'Objetivo: estado del pedido 4821. Herramientas disponibles: get_order_status, track_shipment, request_refund.',
      'Plan: 1) get_order_status; 2) si hay tracking y la ETA es hoy o pasada, track_shipment para dar el último evento; 3) no ofrecer reembolso salvo que el usuario lo pida.',
      'Resultado 1: en_ruta, ETA 2026-11-14 (mañana). No hace falta el paso 2.',
      'Reviso reglas: nunca inventar fechas ✓, montos como $69.990 ✓, español neutro ✓.',
      'Redacto en dos frases con el tracking por si quiere seguirlo.',
    ],
  },
}

/* Línea de tiempo (mes índice desde ene-2025 = 0). */
export type LifeBar = { id: string; from: string; to?: string; retired?: boolean; tone: Tone; lane: number }
export const LIFE: LifeBar[] = [
  { id: 'gemini-2.5-pro', from: '2025-06-17', to: '2026-10-20', retired: true, tone: 'system', lane: 0 },
  { id: 'gemini-2.5-flash', from: '2025-06-17', to: '2026-10-20', retired: true, tone: 'system', lane: 1 },
  { id: 'gemini-3.5-flash', from: '2026-05-19', to: '2027-05-19', tone: 'data', lane: 2 },
  { id: 'gemini-3.5-flash-lite', from: '2026-07-21', to: '2027-07-21', tone: 'tool', lane: 3 },
  { id: 'gemini-3.6-flash', from: '2026-07-21', to: '2026-11-19', tone: 'system', lane: 4 },
  { id: 'gemini-3.7-flash', from: '2026-08-13', to: '2027-01-28', tone: 'system', lane: 5 },
  { id: 'gemini-3.8-flash', from: '2026-09-02', to: '2027-09-02', tone: 'data', lane: 6 },
  { id: 'gemini-4-argon', from: '2026-10-13', to: '2027-10-13', tone: 'model', lane: 7 },
  { id: 'gemini-4-carbon', from: '2026-11-10', tone: 'model', lane: 8 },
  { id: 'gemini-4-hydrogen', from: '2026-11-12', tone: 'accent', lane: 9 },
]
export const TODAY = '2026-11-13'
