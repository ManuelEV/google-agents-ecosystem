import { Bot, Boxes, Brain, Cloud, Database, Eye, Fingerprint, GitBranch, Globe, Layers, Network, Plug, Server, ShieldCheck, User, UserCheck, Wrench } from 'lucide-react'
import type { FlowEdge, FlowNode } from '../components/Flow'

/* Arquitectura objetivo del tutorial. Cada nodo tiene una `stage`: la lección
   que lo agrega. Así el mismo diagrama crece lección a lección.

   stage 1  primer agente: usuario → agente ADK → Gemini
   stage 2  herramientas: funciones + API externa (MCP) + MCP Toolbox → Cloud SQL / Postgres externo / BigQuery
   stage 3  workflows: sub-agentes y aprobación humana
   stage 4  sesiones + Memory Bank
   stage 5  despliegue en Agent Runtime
   stage 6  gobierno: Model Armor, Agent Identity, Gateway/Registry
   stage 7  evaluación + observabilidad
   stage 8  Gemini Enterprise + A2A
   stage 9  integrado en una app propia fuera de Google (portal en AWS) */

export type ArchNode = FlowNode & { stage: number; lesson?: string; where: 'google' | 'outside' | 'local' }

export const ARCH_W = 980
export const ARCH_H = 560

export const ARCH_NODES: ArchNode[] = [
  { id: 'user', x: 80, y: 280, w: 120, label: 'Usuario', sub: 'cliente / interno', tone: 'user', icon: User, stage: 1, where: 'local', lesson: 'primer-agente' },
  { id: 'ge', x: 80, y: 120, w: 130, h: 62, label: 'Gemini', sub: 'Enterprise (app)', tone: 'user', icon: Layers, stage: 8, where: 'google', lesson: 'gemini-enterprise' },
  { id: 'armor', x: 250, y: 280, w: 130, label: 'Model Armor', sub: 'prompt / respuesta', tone: 'guard', icon: ShieldCheck, stage: 6, where: 'google', lesson: 'seguridad' },
  { id: 'root', x: 440, y: 280, w: 170, h: 70, label: 'andes_ops (raíz)', sub: 'ADK · Workflow', tone: 'model', icon: Bot, stage: 1, where: 'google', lesson: 'primer-agente' },
  { id: 'gemini', x: 440, y: 90, w: 160, label: 'Gemini', sub: 'gemini-4-hydrogen', tone: 'model', icon: Brain, stage: 1, where: 'google', lesson: 'modelos' },
  { id: 'orders', x: 640, y: 180, w: 150, label: 'pedidos_agent', sub: 'sub-agente', tone: 'model', icon: GitBranch, stage: 3, where: 'google', lesson: 'workflows' },
  { id: 'returns', x: 640, y: 280, w: 150, label: 'devoluciones', sub: 'sub-agente', tone: 'model', icon: GitBranch, stage: 3, where: 'google', lesson: 'workflows' },
  { id: 'analytics', x: 640, y: 380, w: 150, label: 'analitica_agent', sub: 'sub-agente', tone: 'model', icon: GitBranch, stage: 3, where: 'google', lesson: 'workflows' },
  { id: 'human', x: 640, y: 480, w: 150, label: 'Supervisor', sub: 'aprobación (HITL)', tone: 'user', icon: UserCheck, stage: 3, where: 'local', lesson: 'workflows' },
  { id: 'toolbox', x: 850, y: 230, w: 150, h: 62, label: 'MCP Toolbox', sub: 'tools.yaml', tone: 'tool', icon: Wrench, stage: 2, where: 'google', lesson: 'datos' },
  { id: 'cloudsql', x: 850, y: 120, w: 150, label: 'Cloud SQL', sub: 'pedidos (Postgres)', tone: 'data', icon: Database, stage: 2, where: 'google', lesson: 'datos' },
  { id: 'erp', x: 850, y: 340, w: 150, label: 'ERP Postgres', sub: 'on-prem · inventario', tone: 'data', icon: Server, stage: 2, where: 'outside', lesson: 'datos' },
  { id: 'bq', x: 850, y: 440, w: 150, label: 'BigQuery', sub: 'ventas', tone: 'data', icon: Boxes, stage: 2, where: 'google', lesson: 'datos' },
  { id: 'carrier', x: 850, y: 30, w: 150, label: 'AndesExpress', sub: 'API externa · MCP', tone: 'tool', icon: Plug, stage: 2, where: 'outside', lesson: 'herramientas' },
  { id: 'sessions', x: 250, y: 430, w: 140, label: 'Sessions', sub: 'estado + historial', tone: 'data', icon: Cloud, stage: 4, where: 'google', lesson: 'sesiones-memoria' },
  { id: 'memory', x: 440, y: 450, w: 160, label: 'Memory Bank', sub: 'memoria por usuario', tone: 'memory', icon: Brain, stage: 4, where: 'google', lesson: 'sesiones-memoria' },
  { id: 'runtime', x: 440, y: 520, w: 420, h: 36, label: 'Agent Runtime (hosting administrado)', tone: 'system', icon: Cloud, stage: 5, where: 'google', lesson: 'desplegar' },
  { id: 'identity', x: 250, y: 160, w: 140, label: 'Agent Identity', sub: 'principal://…', tone: 'guard', icon: Fingerprint, stage: 6, where: 'google', lesson: 'seguridad' },
  { id: 'gateway', x: 250, y: 60, w: 140, label: 'Agent Gateway', sub: '+ Registry', tone: 'guard', icon: ShieldCheck, stage: 6, where: 'google', lesson: 'seguridad' },
  { id: 'trace', x: 80, y: 430, w: 130, label: 'Cloud Trace', sub: 'eval + OTel', tone: 'tool', icon: Eye, stage: 7, where: 'google', lesson: 'evaluar' },
  { id: 'a2a', x: 80, y: 20, w: 130, h: 56, label: 'Agente logística', sub: 'otro equipo · A2A', tone: 'tool', icon: Network, stage: 8, where: 'outside', lesson: 'gemini-enterprise' },
  { id: 'portal', x: 80, y: 358, w: 130, h: 56, label: 'Portal soporte', sub: 'tu app · AWS', tone: 'user', icon: Globe, stage: 9, where: 'outside', lesson: 'integrar' },
]

export const ARCH_EDGES: (FlowEdge & { stage: number })[] = [
  { from: 'user', to: 'root', stage: 1 },
  { from: 'root', to: 'gemini', stage: 1 },
  { from: 'root', to: 'carrier', stage: 2, dashed: true, curve: -40 },
  { from: 'root', to: 'toolbox', stage: 2 },
  { from: 'toolbox', to: 'cloudsql', stage: 2 },
  { from: 'toolbox', to: 'erp', stage: 2 },
  { from: 'toolbox', to: 'bq', stage: 2 },
  { from: 'root', to: 'orders', stage: 3 },
  { from: 'root', to: 'returns', stage: 3 },
  { from: 'root', to: 'analytics', stage: 3 },
  { from: 'returns', to: 'human', stage: 3, dashed: true },
  { from: 'root', to: 'sessions', stage: 4 },
  { from: 'root', to: 'memory', stage: 4 },
  { from: 'user', to: 'armor', stage: 6 },
  { from: 'armor', to: 'root', stage: 6 },
  { from: 'identity', to: 'root', stage: 6, dashed: true },
  { from: 'gateway', to: 'root', stage: 6, dashed: true, curve: 30 },
  { from: 'root', to: 'trace', stage: 7, dashed: true, curve: -60 },
  { from: 'ge', to: 'root', stage: 8, curve: -30 },
  { from: 'root', to: 'a2a', stage: 8, dashed: true, curve: 80 },
  { from: 'portal', to: 'armor', stage: 9, curve: 12 },
]

export const ARCH_STAGES: { stage: number; title: string; lesson: string }[] = [
  { stage: 1, title: 'Un agente ADK que habla con Gemini', lesson: 'primer-agente' },
  { stage: 2, title: 'Herramientas y datos dentro y fuera de Google', lesson: 'datos' },
  { stage: 3, title: 'Sub-agentes y aprobación humana', lesson: 'workflows' },
  { stage: 4, title: 'Sesiones y Memory Bank', lesson: 'sesiones-memoria' },
  { stage: 5, title: 'Desplegado en Agent Runtime', lesson: 'desplegar' },
  { stage: 6, title: 'Model Armor, identidad y gateway', lesson: 'seguridad' },
  { stage: 7, title: 'Evaluación y trazas', lesson: 'evaluar' },
  { stage: 8, title: 'Publicado en Gemini Enterprise + A2A', lesson: 'gemini-enterprise' },
  { stage: 9, title: 'Integrado en tu propia app (chat, botón, evento)', lesson: 'integrar' },
]
