# Guía de autoría · Google Agents Ecosystem

Tutorial **interactivo y animado** (en español) para aprender a construir agentes en la plataforma de Google: Gemini Enterprise Agent Platform, ADK, Agent Runtime, MCP Toolbox, Memory Bank, Model Armor, Gemini Enterprise. El lector ya sabe qué es un LLM, RAG, tool calling y MCP; quiere el **paso práctico**: qué comando corro, qué pantalla toco, qué código escribo, qué pasa por dentro.

Stack: React 19 + Vite 8 + TypeScript 7 + React Router 8 (pnpm). **Sin librerías extra**: SVG + CSS + hooks propios. Iconos: `lucide-react`.

## Fuente de verdad

`docs/research/google-agent-platform-2026-11.md`. Todo nombre de producto, comando, flag, import, clase, campo de consola, modelo o precio tiene que salir de ahí (o de `src/sim/*.ts`, que lo codifica). **Si no está, no lo inventes**; di "a confirmar en la documentación". Cada lección cierra con `<Sources items=[...] />` apuntando a las páginas oficiales que usó.

## Idioma y tono

- Español neutro latinoamericano, **tuteo**. Técnico y directo, sin relleno ("En esta lección veremos…" ✗).
- Párrafos de 2–4 frases que preparan lo que el lab muestra. **El lab es el protagonista.**
- Honestidad con la simulación: las pantallas de consola, terminales y respuestas del modelo son simuladas → dilo con `<ConsoleDisclaimer />` o un `<Callout tone="info">`. Los comandos, APIs y formatos son reales.
- Nombres: usa los actuales (Gemini Enterprise Agent Platform, Agent Runtime, Gemini Enterprise) y menciona el anterior la primera vez entre paréntesis ("Agent Runtime (antes Agent Engine)").
- Modelos de los ejemplos: `gemini-4-hydrogen` (raíz/orquestador), `gemini-3.8-flash` (especialistas), `gemini-3.5-flash-lite` (routers/jueces). Exportados en `src/sim/models.ts` como `MODEL_ROOT`, `MODEL_WORKER`, `MODEL_LITE`.
- Escenario: **Andes Market** (retail chileno ficticio) y su agente **Andi** (`andes_ops`); cliente Camila Rojas (`cus_7781`); pedidos 4821 (en ruta), 5102 (preparando), 4790 (entregado). Todo en `src/sim/scenario.ts`. Reutilízalo para que el tutorial cuente una sola historia.
- El código mostrado debe coincidir con `examples/` (andes_hello, andes_data, andes_workflow, andes_prod, andes_portal). Cita la ruta del archivo en el `title` del `<Code>`: `title="examples/andes_hello/agent.py"`.

## Archivos de una lección

```
src/lessons/<slug>/
  meta.ts     ← export const meta: LessonMeta (slug, module, order, title, short?, summary, minutes, concepts, archStage?)
  index.tsx   ← export default function Lesson() { ... }
  *.tsx       ← sub-labs (recomendado si index.tsx > 400 líneas)
  data.ts     ← datos/guiones de la lección
  lesson.css  ← estilos propios; prefija TODAS las clases con el slug: `.datos-xxx`
```

La cabecera (título, resumen, chips, navegación) la genera `LessonPage`. Tu componente devuelve solo el cuerpo: una secuencia de `<Section>`.

**No edites** archivos fuera de tu carpeta (`src/components`, `src/sim`, `src/styles*`, otras lecciones). Si necesitas algo compartido, impleméntalo localmente.

## Lecciones (slug · módulo · etapa de arquitectura)

| # | slug | módulo | archStage | tema |
|---|---|---|---|---|
| 01 | `ecosistema` | mapa | – | qué es cada pieza, renombres, pilares |
| 02 | `modelos` | mapa | – | modelos Gemini, precios, thinking, cómo elegir |
| 03 | `preparar` | mapa | – | proyecto, APIs, gcloud, instalar ADK, adk create |
| 04 | `primer-agente` | construir | 1 | LlmAgent, function tool, Runner/eventos, adk web |
| 05 | `herramientas` | construir | – | function tools, ToolContext, MCP (McpToolset), confirmación humana |
| 06 | `datos` | construir | 2 | MCP Toolbox: Cloud SQL + Postgres externo + BigQuery; Application Integration |
| 07 | `workflows` | construir | 3 | coordinador + sub-agentes (modes), Workflow grafo/rutas, RequestInput |
| 08 | `sesiones-memoria` | escalar | 4 | Sessions, estado con prefijos, Memory Bank |
| 09 | `desplegar` | escalar | 5 | adk deploy agent_engine, consola Agent Runtime, consultar, SDK/REST |
| 10 | `seguridad` | gobernar | 6 | callbacks vs plugins, Model Armor, Agent Identity, Gateway/Registry |
| 11 | `evaluar` | gobernar | 7 | evalset, adk eval, criterios, Cloud Trace |
| 12 | `gemini-enterprise` | publicar | 8 | registrar en Gemini Enterprise (consola + REST), A2A |
| 13 | `integrar` | publicar | 9 | integrar desde tu propia app (chat SSE, botón, evento), WIF desde AWS, formas de orquestar, qué gobernanza sigue aplicando |
| 14 | `proyecto-completo` | publicar | – | recorrido del repo examples/, arquitectura completa, checklist de producción |

## Estructura recomendada

1. `Section n={1}` — la idea en 1–3 párrafos + un lab "de intuición" (diagrama clicable, comparación).
2. `Section n={2..4}` — cómo se hace: **un lab paso a paso** (`usePlayer` + `PlayerBar` + `Narration`) que anime el mecanismo con datos concretos (consola simulada, terminal, eventos de ADK, diagrama con paquetes viajando) y labs para jugar (segmented, sliders, toggles).
3. Una sección práctica: código real (10–50 líneas) con `<Code>` resaltando líneas sincronizadas con los pasos (`linesOf`), trade-offs (tabla `.tbl`), errores comunes (`<Callout tone="warn">`).
4. Si la lección tiene `archStage`: una sección corta "Lo que agregamos a la arquitectura" con `<ArchDiagram stage={n} />`.
5. Cierra con `<KeyIdeas items={[...]} />` y `<Sources items={[...]} />`.

Mínimo **3 labs** por lección, al menos **uno animado paso a paso** y, cuando aplique, **uno con la consola simulada o el terminal**.

## Componentes compartidos

```tsx
import { Section, Lab, Callout, KeyIdeas, Term, Pill, Panel, Segmented, Slider, Tabs, Toggle, BarRow, Stat, Checklist, DocLink, Sources, toneVar, type Tone } from '../../components/ui'
import { Code, Json, linesOf } from '../../components/Code'
import { PlayerBar, Narration, type StepInfo } from '../../components/Player'
import { FlowDiagram, type FlowNode, type FlowEdge } from '../../components/Flow'
import { GcpConsole, Focus, ConsoleField, ConsoleButton, ConsoleCheck, ConsoleCard, ConsoleTable, ConsoleSteps, ConsoleBanner, ConsoleStatus, ConsoleDisclaimer } from '../../components/Console'
import { Terminal, useTerminalPlayer, cmd, out, ok, err, dim, warn, comment, blank, type TermLine } from '../../components/Terminal'
import { EventList, StateView, ChatBubbles, eventKind } from '../../components/Events'
import { ArchDiagram } from '../../components/Arch'
import { usePlayer, useTypewriter, useCountUp } from '../../lib/hooks'
```

| Componente | Uso |
|---|---|
| `<Section n title id?>` | bloque numerado con `<h2>`. Dentro: `<p>`, `<h3>`, listas, labs. |
| `<Lab title hint? badge? footer?>` | panel interactivo enmarcado. `hint` = instrucción breve ("Reproduce o haz clic en un paso"). |
| `<Callout tone="info\|tip\|warn\|danger\|ok" title?>` | nota destacada. |
| `<KeyIdeas items />`, `<Sources items={[{label, href}]} />` | cierre. |
| `<Term tip>` | glosario al pasar el mouse. `<DocLink href>` enlace a doc oficial. |
| `<Pill tone mono?>`, `<Panel title tone right?>`, `<Stat>`, `<BarRow>` | piezas de UI. |
| `<Segmented>`, `<Slider>`, `<Tabs numbered?>`, `<Toggle>` | controles. |
| `<Checklist items current />` | pasos con estado hecho/actual/pendiente. |
| `<Code code lang title highlight dim maxHeight />` | código; `lang`: python, ts, json, bash, yaml, sql, toml, http. `linesOf(code, 'texto')` encuentra líneas para `highlight`. |
| `usePlayer(n, {interval})` + `<PlayerBar player labels />` + `<Narration steps step />` | animación por pasos. |
| `<FlowDiagram nodes edges width height flows active dimInactive onNodeClick />` | diagrama SVG; `flows={['a>b']}` anima un paquete. Nodos aceptan `cls` ("is-outside" borde discontinuo) y `badge`. |
| `<GcpConsole title product nav activeNav url crumbs tabs activeTab>` | **consola de Google Cloud simulada**. Dentro: `ConsoleField` (label, value, kind text/select/textarea/code, `focus`), `ConsoleButton` (primary, `focus`), `ConsoleCheck`, `ConsoleCard`, `ConsoleTable`, `ConsoleSteps` (stepper de asistente), `ConsoleBanner`, `ConsoleStatus`. `focus` dibuja un anillo pulsante + cursor: úsalo para indicar qué toca el paso actual. Cierra el lab con `<ConsoleDisclaimer />` en `footer`. |
| `<Terminal lines upTo typed title player footer />` + `useTerminalPlayer(lines)` | terminal animado: `cmd()` se tipea, `out/ok/err/dim/warn/comment` aparecen línea a línea. Si pasas `player`, muestra controles propios. Para sincronizar con un `usePlayer`, pasa `upTo` calculado por paso. |
| `<EventList events upTo highlight showTiming showUsage />` | eventos de ADK (`AdkEvent` de `src/sim/scenario.ts`): user / function_call / function_response / texto / transfer / state_delta. |
| `<StateView state changed />` | `session.state` con prefijos user:/app:/temp: coloreados. |
| `<ChatBubbles items typing />` | lo que ve el usuario en el chat. |
| `<ArchDiagram stage flows active />` | arquitectura objetivo hasta la etapa `stage` (nodos nuevos entran animados; clic navega a la lección). |

### Colores semánticos (`tone`) — úsalos siempre igual

`user` (azul) usuario · `model` (violeta) LLM/agentes · `tool` (naranja) herramientas · `data` (verde) datos/bases · `memory` (rosa) memoria/estado de usuario · `guard` (ámbar) guardrails/seguridad · `system` (gris) plataforma/infra · `error` · `ok` · `accent`.

En CSS: `var(--c-user)`, … o `data-tone="tool"` y luego `var(--tone)`. Superficies `--bg`, `--bg-elev`, `--bg-sunken`, `--bg-inset`; texto `--text`, `--text-2`, `--text-3`; bordes `--border`, `--border-strong`; fuentes `--font-mono`, `--font-display`. Colores de marca Google solo para logo/consola: `--g-blue/--g-red/--g-yellow/--g-green`, `--gc-blue`. **Nunca hardcodees hex**: debe funcionar en tema claro y oscuro.

### Clases utilitarias

`.row`, `.stack`, `.grid-2`, `.grid-3`, `.split`, `.label`, `.muted`, `.mono`, `.small`, `.tabular`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.input`, `.textarea`, `.select`, `.table-wrap` + `table.tbl` (`tr.is-hl`, `td.num`), `.cmp`/`.cmp-row > .k` (comparativa), `.anim-in`, `.anim-fade`, `.caret`.

## Simulación compartida (`src/sim/`)

- `scenario.ts`: `COMPANY`, `PROJECT_ID`, `PROJECT_NUMBER`, `LOCATION`, `AGENT_NAME`, `AGENT_DISPLAY`, `REASONING_ENGINE_ID`, `STAGING_BUCKET`, `CUSTOMER`, `ORDERS`, `INVENTORY`, `REFUND_POLICY`, `TOOLS` (FunctionDeclarations), `TOOLBOX_TOOLS`, `runTool(name, args)`, `ROOT_INSTRUCTION`, tipos `AdkEvent`/`Part`, `FIRST_RUN_EVENTS`, `SESSION_EXAMPLE`.
- `models.ts`: `MODELS` (id, precios, contexto, estado, fechas, thinking, speed/capability), `MODEL_ROOT/WORKER/LITE`, `FLASH_ALIAS`, `costOf()`.
- `platform.ts`: `PILLARS`, `COMPONENTS` (nombre, antes, pilar, tono, oneLiner, detail, lesson, docs), `RENAMES`.
- `architecture.ts`: `ARCH_NODES`/`ARCH_EDGES` con `stage`, `ARCH_STAGES`.
- `math.ts`: `rng`, `countTokens`, `fmt`, `fmtInt`, `fmtUsd`, `fmtClp`, `pct`, `fold`, `clamp`.

## Calidad visual

- Animaciones con propósito: cada paso muestra **qué cambia y dónde** (resalta el elemento activo, atenúa el resto). En la consola simulada, un `focus` por paso.
- Responsive desde ~360 px (`.split`, `.grid-2`, SVG con `viewBox`). Sin scroll horizontal de página.
- Respeta `prefers-reduced-motion` (ya global). No uses `alert/confirm/prompt`.
- Accesibilidad: `aria-label` en SVG, botones con texto o `aria-label`.

## Validación

```bash
pnpm typecheck        # 0 errores en tus archivos
pnpm dev              # http://localhost:5190/leccion/<slug>
pnpm visual <slug>    # captura la lección con Chrome headless en scripts/shots/ (revisa que se vea bien)
pnpm fuzz             # avanza todos los players y pulsa todos los botones de cada lección; reporta errores
```

Ambos scripts necesitan el dev server corriendo (`pnpm dev`) y Chrome instalado (`CHROME_PATH` si no está en la ruta por defecto).

Consejo de layout: `FlowDiagram` se lee mejor a ancho completo que dentro de una grilla de dos columnas; pon la narración debajo, no al lado.
