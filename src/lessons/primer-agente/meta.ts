import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'primer-agente',
  module: 'construir',
  order: 1,
  title: 'Tu primer agente con ADK: Andi responde por un pedido',
  short: 'Tu primer agente',
  summary:
    'Un Agent, una función Python como herramienta y adk web. Verás cómo ADK convierte tu docstring en una declaración para Gemini, qué eventos produce una invocación (function_call → function_response → texto) y cómo el Runner lo orquesta por dentro.',
  minutes: 18,
  concepts: ['Agent', 'function tool', 'FunctionDeclaration', 'Runner', 'eventos', 'session.state', 'adk web'],
  archStage: 1,
}
