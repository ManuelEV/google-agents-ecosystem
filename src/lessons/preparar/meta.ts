import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'preparar',
  module: 'mapa',
  order: 3,
  title: 'Preparar el proyecto: consola, gcloud y ADK',
  short: 'Preparar el proyecto',
  summary:
    'Crea el proyecto en la consola, habilita las APIs, autentícate con gcloud, instala ADK y genera tu primer agente con adk create. Con la consola y el terminal simulados paso a paso.',
  minutes: 15,
  concepts: ['proyecto', 'APIs', 'gcloud auth', 'pip install google-adk', 'adk create', '.env'],
}
