import type { Tone } from '../components/ui'
import type { ModuleId } from './types'

export type ModuleInfo = { id: ModuleId; n: number; title: string; tone: Tone; description: string }

/* Los módulos siguen los cuatro pilares con que Google organiza la plataforma
   (Build → Scale → Govern → Optimize) más un cierre: publicar en Gemini Enterprise. */
export const MODULES: ModuleInfo[] = [
  {
    id: 'mapa',
    n: 1,
    title: 'El mapa',
    tone: 'system',
    description: 'Qué es cada pieza de la plataforma (y cómo se llamaba antes), qué modelo Gemini elegir y cómo dejar listo tu proyecto.',
  },
  {
    id: 'construir',
    n: 2,
    title: 'Construir con ADK',
    tone: 'model',
    description: 'Tu primer agente, herramientas, bases de datos dentro y fuera de Google, y workflows multi-agente con humanos en el circuito.',
  },
  {
    id: 'escalar',
    n: 3,
    title: 'Escalar',
    tone: 'data',
    description: 'Sesiones, estado y Memory Bank; despliegue en Agent Runtime y cómo consultar al agente desplegado.',
  },
  {
    id: 'gobernar',
    n: 4,
    title: 'Gobernar y optimizar',
    tone: 'guard',
    description: 'Guardrails con Model Armor, Agent Identity y Agent Gateway; evaluación con adk eval y trazas en Cloud Trace.',
  },
  {
    id: 'publicar',
    n: 5,
    title: 'Publicar',
    tone: 'user',
    description: 'Registrar el agente en Gemini Enterprise, hablar A2A con agentes de otros equipos y recorrer el proyecto completo.',
  },
]
