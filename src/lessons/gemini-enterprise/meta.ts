import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'gemini-enterprise',
  module: 'publicar',
  order: 1,
  title: 'Publicar en Gemini Enterprise y hablar A2A',
  short: 'Gemini Enterprise y A2A',
  summary:
    'Registra el agente desplegado en Agent Runtime dentro de una app de Gemini Enterprise para que los empleados lo usen, y conéctalo con agentes de otros equipos mediante el protocolo A2A: exponer con to_a2a, consumir con RemoteA2aAgent.',
  minutes: 16,
  concepts: ['Gemini Enterprise', 'Add agent', 'reasoningEngines', 'A2A', 'Agent Card', 'RemoteA2aAgent'],
  archStage: 8,
}
