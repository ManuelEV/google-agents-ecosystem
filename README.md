# google-agents-ecosystem

Tutorial **interactivo y animado** (en español) para dar el paso práctico de "sé qué es un LLM, RAG, tool calling y MCP" a **construir agentes reales en la plataforma de Google**: Gemini Enterprise Agent Platform (antes Vertex AI), ADK 2.x, MCP Toolbox for Databases, Agent Runtime, Sessions y Memory Bank, Model Armor, Agent Identity/Gateway, evaluación con `adk eval`, Cloud Trace, Gemini Enterprise y A2A.

Cada lección combina explicación corta + laboratorios: **consola de Google Cloud simulada** paso a paso, **terminales animados**, visor de **eventos de ADK**, diagramas con paquetes viajando y una **arquitectura que crece lección a lección**. El escenario es un retail ficticio (*Andes Market*) y su agente de operaciones *Andi*: pedidos en Cloud SQL, inventario en un Postgres on-prem, ventas en BigQuery, un transportista con API externa y un supervisor que aprueba reembolsos.

Los comandos, APIs, nombres de productos, formatos y precios son **reales** (verificados en la documentación oficial el 13-nov-2026, ver [`docs/research/`](docs/research/google-agent-platform-2026-11.md)). Las pantallas, salidas de terminal y respuestas del modelo son **simuladas**.

## Contenido

| Módulo | Lecciones |
|---|---|
| 1 · El mapa | El ecosistema pieza por pieza · Modelos Gemini · Preparar el proyecto |
| 2 · Construir con ADK | Tu primer agente · Herramientas (funciones, MCP, confirmación) · Bases de datos dentro y fuera de Google (MCP Toolbox) · Multi-agente y workflows |
| 3 · Escalar | Sesiones, estado y Memory Bank · Desplegar en Agent Runtime |
| 4 · Gobernar y optimizar | Seguridad (Model Armor, Agent Identity, Gateway) · Evaluar y observar |
| 5 · Publicar | Gemini Enterprise y A2A · Integrar en tu propia app (chat, botón, evento) · El proyecto completo |

## Código para probar

[`examples/`](examples/README.md) tiene cuatro agentes ADK completos (Python ≥ 3.11): `andes_hello`, `andes_data` (MCP Toolbox + Docker con dos Postgres + servidor MCP del transportista), `andes_workflow` (coordinador y grafo con humano en el circuito) y `andes_prod` (plugins, Memory Bank, despliegue, consulta remota, evalset, A2A, registro en Gemini Enterprise), más `andes_portal`: el backend de un portal alojado fuera de Google (AWS) que consume el agente por chat SSE, botón y eventos, con Workload Identity Federation.

## Desarrollo del sitio

React 19 · React Router 8 · Vite 8 · TypeScript 7 · `lucide-react` · pnpm. Sin librerías de gráficos ni animación: SVG + CSS + hooks propios.

```bash
pnpm install
pnpm dev          # http://localhost:5190
pnpm build        # typecheck + build a dist/
pnpm visual       # capturas con Chrome headless (scripts/shots/) para revisar UX
```

```
src/
  components/   ui, Code, Player, Flow, Console (consola simulada), Terminal, Events (eventos ADK), Arch
  sim/          scenario (Andes Market), models (Gemini), platform (catálogo), architecture (etapas)
  lessons/<slug>/  meta.ts + index.tsx (+ labs, data.ts, lesson.css); se registran solas por glob
  pages/        Home, LessonPage, 404
docs/AUTHORING.md          convenciones para escribir lecciones
docs/research/             hechos verificados + fuentes
examples/                  agentes ADK de ejemplo
```
