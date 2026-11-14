import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'herramientas',
  module: 'construir',
  order: 2,
  title: 'Herramientas: funciones, MCP y confirmación humana',
  short: 'Herramientas',
  summary:
    'Cómo ADK convierte una función Python en una herramienta para Gemini, qué ve y qué no ve el modelo, cómo se conecta un servidor MCP externo con McpToolset y cómo pausar al agente para que un humano apruebe una acción sensible.',
  minutes: 18,
  concepts: ['FunctionTool', 'ToolContext', 'McpToolset', 'tool_filter', 'require_confirmation', 'LongRunningFunctionTool'],
}
