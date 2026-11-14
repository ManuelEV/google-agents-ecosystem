import type { LessonMeta } from '../types'

export const meta: LessonMeta = {
  slug: 'datos',
  module: 'construir',
  order: 3,
  title: 'Bases de datos dentro y fuera de Google con MCP Toolbox',
  short: 'Datos: MCP Toolbox',
  summary:
    'Conecta el agente a Cloud SQL, a un Postgres on-prem y a BigQuery con un solo tools.yaml: SQL parametrizado que el modelo nunca escribe, toolsets por agente, autenticación sin contraseñas y consultas que cambias sin redesplegar.',
  minutes: 18,
  concepts: ['MCP Toolbox', 'tools.yaml', 'cloud-sql-postgres', 'postgres', 'bigquery', 'toolsets', 'workload identity'],
  archStage: 2,
}
