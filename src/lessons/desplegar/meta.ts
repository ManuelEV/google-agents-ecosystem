import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'desplegar',
  module: 'escalar',
  order: 2,
  title: 'Desplegar en Agent Runtime y consultar el agente',
  short: 'Desplegar en Agent Runtime',
  summary:
    'El mismo agente que corrías con adk web pasa a un hosting administrado: adk deploy agent_engine, qué aparece en la consola, cómo crear sesiones y consultar al agente desplegado por SDK y por REST con streaming.',
  minutes: 16,
  concepts: ['Agent Runtime', 'adk deploy agent_engine', 'reasoningEngines', 'async_stream_query', 'AGENT_IDENTITY'],
  archStage: 5,
}
