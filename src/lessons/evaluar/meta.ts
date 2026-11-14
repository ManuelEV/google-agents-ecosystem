import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'evaluar',
  module: 'gobernar',
  order: 2,
  title: 'Evaluar con adk eval y observar con Cloud Trace',
  short: 'Evaluar y observar',
  summary:
    'Un agente se evalúa por la trayectoria de herramientas que recorre, no solo por lo que contesta. Aprende el formato de un evalset, los criterios de adk eval, cómo integrarlo en pytest y cómo leer una traza del agente en Cloud Trace.',
  minutes: 16,
  concepts: ['evalset', 'adk eval', 'tool_trajectory_avg_score', 'AgentEvaluator', 'Cloud Trace', '--otel_to_cloud'],
  archStage: 7,
}
