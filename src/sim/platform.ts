import type { Tone } from '../components/ui'

/* Catálogo de la plataforma de agentes de Google, tal como la documenta Google
   en noviembre de 2026 (docs.cloud.google.com/agent-builder/overview). */

export type PillarId = 'build' | 'scale' | 'govern' | 'optimize' | 'gemini-enterprise'

export type PlatformComponent = {
  id: string
  name: string
  /** nombre anterior, si lo tuvo */
  formerly?: string
  pillar: PillarId
  tone: Tone
  oneLiner: string
  detail: string
  /** lección donde se trabaja */
  lesson?: string
  docs: string
  /** si es código abierto / se puede usar fuera de Google Cloud */
  open?: boolean
}

export const PILLARS: { id: PillarId; title: string; tone: Tone; blurb: string }[] = [
  { id: 'build', title: 'Build · construir', tone: 'model', blurb: 'Diseñar, prototipar y programar agentes.' },
  { id: 'scale', title: 'Scale · escalar', tone: 'data', blurb: 'Ejecutarlos en producción con sesiones y memoria administradas.' },
  { id: 'govern', title: 'Govern · gobernar', tone: 'guard', blurb: 'Catalogar, identificar y controlar qué puede hacer cada agente.' },
  { id: 'optimize', title: 'Optimize · optimizar', tone: 'tool', blurb: 'Evaluar, observar y mejorar.' },
  { id: 'gemini-enterprise', title: 'Gemini Enterprise', tone: 'user', blurb: 'Donde los empleados encuentran y usan los agentes.' },
]

export const COMPONENTS: PlatformComponent[] = [
  {
    id: 'platform',
    name: 'Gemini Enterprise Agent Platform',
    formerly: 'Vertex AI',
    pillar: 'build',
    tone: 'system',
    oneLiner: 'El paraguas: todo el ciclo de vida de modelos y agentes en Google Cloud.',
    detail:
      'En Cloud Next (abril de 2026) Google renombró Vertex AI como Gemini Enterprise Agent Platform. Las URLs de la consola y muchas APIs siguen diciendo "vertex-ai" o "aiplatform.googleapis.com".',
    docs: 'https://docs.cloud.google.com/agent-builder/overview',
  },
  {
    id: 'adk',
    name: 'Agent Development Kit (ADK)',
    pillar: 'build',
    tone: 'model',
    oneLiner: 'Framework open source (Python, TypeScript, Go, Java) para programar agentes.',
    detail:
      'ADK 2.x (GA en Python desde mayo de 2026, versión 2.14.1 el 12-nov-2026) ejecuta agentes, herramientas y funciones como nodos de un grafo (Workflow Runtime). Corre en tu laptop, en Cloud Run o en Agent Runtime. Requiere Python ≥ 3.11.',
    lesson: 'primer-agente',
    docs: 'https://adk.dev/',
    open: true,
  },
  {
    id: 'agent-studio',
    name: 'Agent Studio',
    pillar: 'build',
    tone: 'model',
    oneLiner: 'Espacio low-code en la consola para probar modelos, afinar instrucciones y prototipar.',
    detail: 'Útil para iterar un system prompt o comparar modelos lado a lado antes de llevarlo a código con ADK.',
    docs: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/agent-studio',
  },
  {
    id: 'agent-garden',
    name: 'Agent Garden',
    pillar: 'build',
    tone: 'model',
    oneLiner: 'Agentes y plantillas prehechas para partir rápido.',
    detail: 'Ejemplos y muestras listas para desplegar o adaptar.',
    docs: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/agent-garden',
  },
  {
    id: 'model-garden',
    name: 'Model Garden',
    pillar: 'build',
    tone: 'model',
    oneLiner: 'Catálogo de modelos: Gemini, abiertos y de terceros (p. ej. Claude).',
    detail: 'ADK es agnóstico de modelo: puedes usar Gemini directo o modelos de Model Garden vía LiteLLM.',
    lesson: 'modelos',
    docs: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-garden/explore-models',
  },
  {
    id: 'mcp-toolbox',
    name: 'MCP Toolbox for Databases',
    pillar: 'build',
    tone: 'tool',
    oneLiner: 'Servidor MCP open source que convierte consultas SQL en herramientas seguras.',
    detail:
      'Un tools.yaml declara fuentes (Cloud SQL, AlloyDB, BigQuery, Postgres/MySQL en cualquier lado, MongoDB, Neo4j…) y herramientas parametrizadas. El agente nunca escribe SQL libre.',
    lesson: 'datos',
    docs: 'https://mcp-toolbox.dev/',
    open: true,
  },
  {
    id: 'agent-runtime',
    name: 'Agent Runtime',
    formerly: 'Vertex AI Agent Engine',
    pillar: 'scale',
    tone: 'data',
    oneLiner: 'Hosting administrado del agente: escalado, identidad, sesiones, memoria.',
    detail:
      'Se despliega con `adk deploy agent_engine` o con el SDK (`client.runtimes.create`). El recurso sigue llamándose reasoningEngine en la API. Expone :query y :streamQuery.',
    lesson: 'desplegar',
    docs: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/deploy-an-agent',
  },
  {
    id: 'sessions',
    name: 'Sessions',
    pillar: 'scale',
    tone: 'data',
    oneLiner: 'Historial y estado de una conversación, persistidos por Google.',
    detail: 'En ADK: VertexAiSessionService(project, location, agent_engine_id). El estado tiene prefijos user:, app:, temp:.',
    lesson: 'sesiones-memoria',
    docs: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/sessions',
  },
  {
    id: 'memory-bank',
    name: 'Memory Bank',
    pillar: 'scale',
    tone: 'memory',
    oneLiner: 'Memoria de largo plazo: extrae hechos de las conversaciones y los consolida por usuario.',
    detail: 'Un LLM extrae "memorias" por scope (app + usuario), con TTL, revisiones y búsqueda por similitud. En ADK: VertexAiMemoryBankService + preload_memory.',
    lesson: 'sesiones-memoria',
    docs: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank',
  },
  {
    id: 'code-exec',
    name: 'Code Execution',
    pillar: 'scale',
    tone: 'data',
    oneLiner: 'Sandbox administrado para ejecutar código generado por el modelo.',
    detail: 'Nunca ejecutes código del modelo en tu propio proceso: usa el sandbox o BuiltInCodeExecutor.',
    docs: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/sandbox/code-execution-overview',
  },
  {
    id: 'agent-registry',
    name: 'Agent Registry',
    pillar: 'govern',
    tone: 'guard',
    oneLiner: 'Catálogo central de agentes, servidores MCP, herramientas y endpoints aprobados.',
    detail: 'Registra automáticamente las cargas de trabajo soportadas del proyecto; lo externo se registra a mano. Agent Gateway lo consulta antes de dejar pasar una conexión.',
    lesson: 'seguridad',
    docs: 'https://docs.cloud.google.com/agent-registry/overview',
  },
  {
    id: 'agent-identity',
    name: 'Agent Identity',
    pillar: 'govern',
    tone: 'guard',
    oneLiner: 'Cada agente tiene su propio principal IAM (principal://…, formato SPIFFE).',
    detail: 'Se activa con identity_type = AGENT_IDENTITY al desplegar. Permite mínimo privilegio por agente y auditoría; las credenciales van atadas al runtime (mTLS).',
    lesson: 'seguridad',
    docs: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/agent-identity',
  },
  {
    id: 'agent-gateway',
    name: 'Agent Gateway',
    pillar: 'govern',
    tone: 'guard',
    oneLiner: 'Punto de aplicación de políticas para el tráfico del agente (MCP, A2A, APIs).',
    detail: 'Deniega por defecto; inspecciona JSON-RPC de MCP para aplicar políticas por herramienta; aplica Model Armor en ida y vuelta. Administrado en Agent Runtime; en Cloud Run/GKE "próximamente".',
    lesson: 'seguridad',
    docs: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview',
  },
  {
    id: 'model-armor',
    name: 'Model Armor',
    pillar: 'govern',
    tone: 'guard',
    oneLiner: 'Filtra prompts y respuestas: prompt injection, jailbreak, datos sensibles, contenido dañino.',
    detail: 'En ADK se conecta con ModelArmorPlugin (ADK ≥ 2.8) usando plantillas por proyecto/región. También se aplica en Agent Gateway.',
    lesson: 'seguridad',
    docs: 'https://adk.dev/integrations/model-armor/',
  },
  {
    id: 'evaluation',
    name: 'Evaluación de agentes',
    pillar: 'optimize',
    tone: 'tool',
    oneLiner: 'adk eval + Gen AI Evaluation Service: trayectoria de herramientas, respuesta final, rúbricas, alucinaciones.',
    detail: 'Casos en *.evalset.json; criterios en test_config.json; desde ADK 2.14 se puede correr cada caso varias veces para medir varianza.',
    lesson: 'evaluar',
    docs: 'https://adk.dev/evaluate/',
  },
  {
    id: 'observability',
    name: 'Observabilidad',
    pillar: 'optimize',
    tone: 'tool',
    oneLiner: 'Trazas OpenTelemetry (invoke_agent, call_llm, execute_tool) en Cloud Trace, logs y métricas.',
    detail: 'Se activa con --otel_to_cloud al desplegar o enable_tracing=True en AdkApp. Por defecto no captura el contenido de los mensajes.',
    lesson: 'evaluar',
    docs: 'https://adk.dev/integrations/cloud-trace/',
  },
  {
    id: 'gemini-enterprise',
    name: 'Gemini Enterprise',
    formerly: 'Agentspace',
    pillar: 'gemini-enterprise',
    tone: 'user',
    oneLiner: 'La app para empleados: chat, búsqueda empresarial y galería de agentes registrados.',
    detail: 'Un admin registra agentes (desde Agent Runtime, vía A2A o del Marketplace) y la organización los descubre y usa con su identidad.',
    lesson: 'gemini-enterprise',
    docs: 'https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-adk-agent',
  },
  {
    id: 'a2a',
    name: 'Protocolo A2A',
    pillar: 'gemini-enterprise',
    tone: 'user',
    oneLiner: 'Agent-to-Agent: agentes de distintos equipos o proveedores se descubren por Agent Card y se delegan tareas.',
    detail: 'ADK expone un agente con to_a2a() y consume otros con RemoteA2aAgent. Gemini Enterprise soporta A2A v0.3 (streaming).',
    lesson: 'gemini-enterprise',
    docs: 'https://adk.dev/a2a/',
    open: true,
  },
  {
    id: 'agents-cli',
    name: 'Agents CLI',
    pillar: 'build',
    tone: 'system',
    oneLiner: 'CLI (preview) que encadena scaffold → eval → deploy → publish y trae skills para asistentes de código.',
    detail: 'uvx google-agents-cli setup. Windows solo vía WSL 2. Complementa a la CLI de ADK, no la reemplaza.',
    lesson: 'preparar',
    docs: 'https://google.github.io/agents-cli/',
    open: true,
  },
]

export const componentById = (id: string) => COMPONENTS.find((c) => c.id === id)
export const componentsOf = (p: PillarId) => COMPONENTS.filter((c) => c.pillar === p)

/** Tabla de renombres: lo que leerás en blogs viejos vs. el nombre actual. */
export const RENAMES: { before: string; after: string; since: string; note: string }[] = [
  { before: 'Vertex AI', after: 'Gemini Enterprise Agent Platform', since: 'abr-2026', note: 'Las URLs y la API (aiplatform.googleapis.com) no cambiaron.' },
  { before: 'Vertex AI Agent Engine', after: 'Agent Runtime', since: 'abr-2026', note: 'El recurso sigue siendo reasoningEngines/… y el comando adk deploy agent_engine.' },
  { before: 'Agentspace', after: 'Gemini Enterprise', since: 'oct-2025', note: 'El rol IAM aún se llama discoveryengine.agentspaceAdmin.' },
  { before: 'Vertex AI Agent Builder', after: 'Build (pilar) de la plataforma', since: 'abr-2026', note: 'El nombre sobrevive en algunas rutas de documentación.' },
  { before: 'Agent Engine Sessions / Memory Bank', after: 'Sessions / Memory Bank', since: 'abr-2026', note: 'Mismas APIs; en ADK siguen llamándose VertexAiSessionService y VertexAiMemoryBankService.' },
]
