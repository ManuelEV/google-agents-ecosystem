import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'seguridad',
  module: 'gobernar',
  order: 1,
  title: 'Seguridad: guardrails, Model Armor, identidad y gateway',
  short: 'Seguridad y guardrails',
  summary:
    'Prompt injection, exfiltración y acciones no autorizadas: dónde se detiene cada ataque. Guardrails en la herramienta, callbacks, plugins, Model Armor, Agent Identity con mínimo privilegio y Agent Gateway con Agent Registry.',
  minutes: 18,
  concepts: ['prompt injection', 'ModelArmorPlugin', 'before_tool_callback', 'Agent Identity', 'Agent Gateway', 'mínimo privilegio'],
  archStage: 6,
}
