import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'sesiones-memoria',
  module: 'escalar',
  order: 1,
  title: 'Sesiones, estado y Memory Bank',
  short: 'Sesiones y memoria',
  summary:
    'Qué recuerda un agente ADK y dónde vive: la sesión (eventos + estado con prefijos user:, app:, temp:), los SessionService administrados por Agent Runtime y Memory Bank, que extrae hechos de las conversaciones para que Andi reconozca a Camila semanas después.',
  minutes: 17,
  concepts: ['Session', 'session.state', 'user: / app: / temp:', 'output_key', 'VertexAiSessionService', 'Memory Bank', 'preload_memory'],
  archStage: 4,
}
