import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'workflows',
  module: 'construir',
  order: 4,
  title: 'Multi-agente: coordinador, sub-agentes y workflows en grafo',
  short: 'Multi-agente y workflows',
  summary:
    'Dos formas de repartir el trabajo entre agentes con ADK 2.x: un coordinador que delega por descripción (sub_agents con modos) o un Workflow en grafo con router determinista y pausa para aprobación humana.',
  minutes: 18,
  concepts: ['sub_agents', 'mode="task"', 'Workflow', 'Event(route=…)', 'RequestInput', 'finish_task'],
  archStage: 3,
}
