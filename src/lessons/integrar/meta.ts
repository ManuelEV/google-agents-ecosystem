import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'integrar',
  module: 'publicar',
  order: 2,
  title: 'Integrar el agente en tu propia app: chat, botón o evento',
  short: 'Integrar en tu app',
  summary:
    'Gemini Enterprise es solo una puerta. Si tu portal vive en AWS u otra nube, tu backend llama directo al agente en Agent Runtime: un chat con streaming, un botón que pide una respuesta única o un evento sin nadie al frente. Credenciales sin llaves con Workload Identity Federation, cuatro formas de orquestar y qué parte de la gobernanza sigue aplicando (spoiler: casi toda).',
  minutes: 20,
  concepts: [':streamQuery', 'SSE', 'user_id', 'Workload Identity Federation', 'orquestación', 'Agent Gateway'],
  archStage: 9,
}
