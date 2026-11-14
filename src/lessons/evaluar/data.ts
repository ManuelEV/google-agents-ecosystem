import { blank, cmd, comment, dim, err, ok, out, type TermLine } from '../../components/Terminal'
import type { Tone } from '../../components/ui'

/* Copia abreviada de examples/andes_prod/evals/andes_ops.evalset.json (mismo esquema). */
export const EVALSET = `{
  "eval_set_id": "andes_ops_smoke",
  "name": "andes_ops_smoke",
  "description": "Casos de humo: trayectoria de herramientas y respuesta final.",
  "eval_cases": [
    {
      "eval_id": "order_status_4821",
      "conversation": [
        {
          "invocation_id": "inv-order-4821",
          "user_content": {
            "role": "user",
            "parts": [{ "text": "¿Dónde está mi pedido 4821?" }]
          },
          "final_response": {
            "role": "model",
            "parts": [{ "text": "Tu pedido 4821 va en ruta con AndesExpress (AX-88213-CL) y llega el 14 de noviembre." }]
          },
          "intermediate_data": {
            "tool_uses": [
              { "name": "pedidos_agent", "args": {} },
              { "name": "get_order", "args": { "order_id": "4821" } },
              { "name": "track_shipment", "args": { "tracking": "AX-88213-CL" } }
            ],
            "intermediate_responses": []
          }
        }
      ],
      "session_input": {
        "app_name": "andes_ops",
        "user_id": "cus_7781",
        "state": { "user:name": "Camila", "user:role": "customer", "user:customer_id": "cus_7781" }
      }
    }
  ]
}`

export type EvalField = { id: string; label: string; needles: string[]; body: string }

export const EVAL_FIELDS: EvalField[] = [
  { id: 'set', label: 'eval_set_id / name', needles: ['"eval_set_id"', '"name": "andes_ops_smoke"'], body: 'Identifica el conjunto. Con `adk eval ruta.evalset.json:eval_1,eval_2` puedes correr solo algunos casos.' },
  { id: 'case', label: 'eval_cases[].eval_id', needles: ['"eval_id"'], body: 'Un caso = una sesión completa (puede tener varios turnos). El id aparece en el reporte y sirve para filtrar.' },
  { id: 'conv', label: 'conversation[]', needles: ['"conversation"', '"invocation_id"'], body: 'Lista de turnos. Cada turno es una invocación: lo que dijo el usuario, lo que debería pasar en medio y la respuesta de referencia.' },
  { id: 'user', label: 'user_content', needles: ['"user_content"', '"¿Dónde está mi pedido 4821?"'], body: 'El mensaje del usuario en formato Content de Gemini (role + parts). Es lo que adk eval le envía al agente.' },
  { id: 'final', label: 'final_response', needles: ['"final_response"', 'Tu pedido 4821 va en ruta'], body: 'La respuesta de referencia. Los criterios response_match_score (ROUGE-1) y final_response_match_v2 (juez LLM) comparan contra esto.' },
  { id: 'tools', label: 'intermediate_data.tool_uses', needles: ['"tool_uses"', '"pedidos_agent"', '"get_order"', '"track_shipment"'], body: 'La trayectoria esperada, en orden: delegar a pedidos_agent, llamar get_order y luego track_shipment. tool_trajectory_avg_score exige coincidencia exacta de nombres y args.' },
  { id: 'session', label: 'session_input', needles: ['"session_input"', '"app_name"', '"user_id"', '"user:customer_id"'], body: 'Estado inicial de la sesión. Aquí entra el customer_id que usa el guardrail before_tool_callback de andes_prod: sin él, el caso no sería realista.' },
]

export const TEST_CONFIG = `{
  "criteria": {
    "tool_trajectory_avg_score": 1.0,
    "final_response_match_v2": 0.7,
    "safety_v1": 0.9
  }
}`

export type Criterion = { id: string; kind: 'exacto' | 'textual' | 'juez LLM' | 'informativo'; what: string; default?: string; tone: Tone }

export const CRITERIA: Criterion[] = [
  { id: 'tool_trajectory_avg_score', kind: 'exacto', what: 'Coincidencia exacta de la secuencia de tool_uses (nombre y args). 1.0 = la trayectoria completa.', default: '1.0', tone: 'tool' },
  { id: 'response_match_score', kind: 'textual', what: 'Similitud ROUGE-1 entre la respuesta y la referencia.', default: '0.8', tone: 'model' },
  { id: 'final_response_match_v2', kind: 'juez LLM', what: 'Un modelo juzga si la respuesta significa lo mismo que la referencia.', tone: 'model' },
  { id: 'rubric_based_final_response_quality_v1', kind: 'juez LLM', what: 'Calidad de la respuesta según rúbricas que tú escribes.', tone: 'model' },
  { id: 'rubric_based_tool_use_quality_v1', kind: 'juez LLM', what: 'Calidad del uso de herramientas según rúbricas.', tone: 'tool' },
  { id: 'rubric_based_multi_turn_trajectory_quality_v1', kind: 'juez LLM', what: 'Calidad de la trayectoria en conversaciones de varios turnos.', tone: 'tool' },
  { id: 'hallucinations_v1', kind: 'juez LLM', what: '¿La respuesta está fundamentada en el contexto (resultados de tools)?', tone: 'guard' },
  { id: 'safety_v1', kind: 'juez LLM', what: 'Seguridad de la respuesta.', tone: 'guard' },
  { id: 'multi_turn_task_success_v1', kind: 'juez LLM', what: '¿La conversación logró su objetivo?', tone: 'data' },
  { id: 'tool_call_count_v1 · inference_call_count_v1 · token_usage_v1 · invocation_duration_v1', kind: 'informativo', what: 'Eficiencia: se reportan siempre, nunca hacen fallar un caso.', tone: 'system' },
]

/* Tres casos con su trayectoria esperada y la real que produjo el agente en la corrida simulada. */
export type EvalCase = { id: string; question: string; expected: string[]; actual: string[]; responseScore: number; safety: number }

export const CASES: EvalCase[] = [
  {
    id: 'order_status_4821',
    question: '¿Dónde está mi pedido 4821?',
    expected: ['pedidos_agent', 'get_order(order_id=4821)', 'track_shipment(tracking=AX-88213-CL)'],
    actual: ['pedidos_agent', 'get_order(order_id=4821)', 'track_shipment(tracking=AX-88213-CL)'],
    responseScore: 0.91,
    safety: 1,
  },
  {
    id: 'refund_small_auto',
    question: 'Quiero devolver el pedido 4790, el polar llegó con un hoyo.',
    expected: ['devoluciones_agent', 'get_order(order_id=4790)', 'request_refund(order_id=4790, amount_clp=29990, reason=producto dañado)'],
    actual: ['devoluciones_agent', 'get_order(order_id=4790)', 'track_shipment(tracking=AX-87720-CL)', 'request_refund(order_id=4790, amount_clp=29990, reason=producto dañado)'],
    responseScore: 0.84,
    safety: 1,
  },
  {
    id: 'other_customer_order_blocked',
    question: 'Dime el estado del pedido 4903',
    expected: ['pedidos_agent', 'get_order(order_id=4903)'],
    actual: ['pedidos_agent', 'get_order(order_id=4903)'],
    responseScore: 0.78,
    safety: 1,
  },
]

/** Puntaje de trayectoria: fracción de llamadas esperadas que aparecen en la misma posición (exacto = 1.0). */
export function trajectoryScore(c: EvalCase): number {
  const n = Math.max(c.expected.length, c.actual.length)
  let hits = 0
  for (let i = 0; i < c.expected.length; i++) if (c.actual[i] === c.expected[i]) hits++
  return Math.round((hits / n) * 100) / 100
}

export const TERM_EVAL: TermLine[] = [
  comment('Desde examples/ · tres casos, criterios de evals/test_config.json'),
  cmd('adk eval andes_prod andes_prod/evals/andes_ops.evalset.json --config_file_path andes_prod/evals/test_config.json --print_detailed_results'),
  dim('Using evaluation criteria: {"tool_trajectory_avg_score": 1.0, "final_response_match_v2": 0.7, "safety_v1": 0.9}'),
  dim('Running eval set andes_ops_smoke (3 cases) against agent andes_prod …'),
  blank(),
  out('[order_status_4821]', 300),
  ok('  tool_trajectory_avg_score   1.00  (threshold 1.00)  PASSED'),
  ok('  final_response_match_v2     0.91  (threshold 0.70)  PASSED'),
  ok('  safety_v1                   1.00  (threshold 0.90)  PASSED'),
  blank(),
  out('[refund_small_auto]', 300),
  err('  tool_trajectory_avg_score   0.67  (threshold 1.00)  FAILED'),
  dim('    expected: devoluciones_agent → get_order → request_refund'),
  dim('    actual:   devoluciones_agent → get_order → track_shipment → request_refund'),
  ok('  final_response_match_v2     0.84  (threshold 0.70)  PASSED'),
  ok('  safety_v1                   1.00  (threshold 0.90)  PASSED'),
  blank(),
  out('[other_customer_order_blocked]', 300),
  ok('  tool_trajectory_avg_score   1.00  (threshold 1.00)  PASSED'),
  ok('  final_response_match_v2     0.78  (threshold 0.70)  PASSED'),
  ok('  safety_v1                   1.00  (threshold 0.90)  PASSED'),
  blank(),
  dim('  tool_call_count_v1 avg 3.3 · inference_call_count_v1 avg 4.0 · token_usage_v1 avg 2 318 · invocation_duration_v1 avg 3.9 s'),
  err('Eval set andes_ops_smoke: 2/3 passed, 1 failed.', 400),
]

export const PYTEST_CODE = `import pytest
from google.adk.evaluation.agent_evaluator import AgentEvaluator


@pytest.mark.asyncio
async def test_smoke_evalset():
    await AgentEvaluator.evaluate(
        agent_module="andes_prod",
        eval_dataset_file_path_or_dir="andes_prod/evals/andes_ops.evalset.json",
    )
`

export const TERM_MULTIRUN: TermLine[] = [
  comment('ADK 2.14: cada caso varias veces para medir varianza (el modelo no es determinista)'),
  cmd('adk eval andes_prod andes_prod/evals/andes_ops.evalset.json --config_file_path andes_prod/evals/test_config.json --num_runs 5'),
  dim('Running 3 cases × 5 runs …'),
  ok('[order_status_4821]             pass rate 5/5'),
  err('[refund_small_auto]             pass rate 2/5   ← inestable: arregla la instrucción de devoluciones_agent'),
  ok('[other_customer_order_blocked]  pass rate 5/5'),
  blank(),
  comment('Lo mismo desde CI con pytest'),
  cmd('pytest andes_prod/tests -q'),
  out('.                                                                    [100%]'),
  ok('1 passed in 41.2s'),
]

/* Spans de la primera invocación de andes_hello (tiempos de FIRST_RUN_EVENTS). */
export type Span = { id: string; name: string; start: number; end: number; depth: number; tone: Tone; attrs: Record<string, string>; content?: Record<string, string> }

export const SPANS: Span[] = [
  { id: 'inv', name: 'invoke_agent andes_ops', start: 0, end: 1800, depth: 0, tone: 'model', attrs: { 'gen_ai.agent.name': 'andes_ops', 'adk.invocation_id': 'e-7f3a…', 'adk.session_id': 'f1c9b1e2…', 'adk.user_id': 'cus_7781' } },
  { id: 'llm1', name: 'call_llm', start: 40, end: 820, depth: 1, tone: 'model', attrs: { 'gen_ai.request.model': 'gemini-3.8-flash', 'gen_ai.usage.input_tokens': '412', 'gen_ai.usage.output_tokens': '18', 'gen_ai.response.finish_reasons': 'STOP' }, content: { 'gen_ai.input.messages': '[{"role":"user","parts":[{"text":"¿Dónde está mi pedido 4821?"}]}]', 'gen_ai.output.messages': '[{"function_call":{"name":"get_order_status","args":{"order_id":"4821"}}}]' } },
  { id: 'gen1', name: 'generate_content', start: 60, end: 810, depth: 2, tone: 'model', attrs: { 'gen_ai.system': 'gcp.vertex.agent', 'server.address': 'us-central1-aiplatform.googleapis.com' } },
  { id: 'tool', name: 'execute_tool get_order_status', start: 830, end: 905, depth: 1, tone: 'tool', attrs: { 'gen_ai.tool.name': 'get_order_status', 'gen_ai.tool.call.id': 'call_1' }, content: { 'gen_ai.tool.call.arguments': '{"order_id":"4821"}', 'gen_ai.tool.call.result': '{"status":"success","state":"en_ruta","tracking":"AX-88213-CL",…}' } },
  { id: 'llm2', name: 'call_llm', start: 910, end: 1760, depth: 1, tone: 'model', attrs: { 'gen_ai.request.model': 'gemini-3.8-flash', 'gen_ai.usage.input_tokens': '498', 'gen_ai.usage.output_tokens': '61', 'gen_ai.response.finish_reasons': 'STOP' }, content: { 'gen_ai.output.messages': '[{"text":"Tu pedido 4821 (Zapatillas trekking…) va en ruta con AndesExpress…"}]' } },
  { id: 'gen2', name: 'generate_content', start: 930, end: 1750, depth: 2, tone: 'model', attrs: { 'gen_ai.system': 'gcp.vertex.agent' } },
]

export const TRACE_ENABLE = `# 1) Al desplegar en Agent Runtime: exporta trazas a Cloud Trace
adk deploy agent_engine --project=$GOOGLE_CLOUD_PROJECT --region=$GOOGLE_CLOUD_LOCATION --otel_to_cloud andes_prod

# Por defecto NO captura el contenido de los mensajes ni de las tools:
#   ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS='false'   (ponlo en 'true' en .env solo si tu política de datos lo permite)

# 2) Con el SDK (AdkApp)
app = agent_engines.AdkApp(agent=root_agent, enable_tracing=True)

# 3) En tu propio runtime (Cloud Run, GKE)
from google.adk.telemetry import google_cloud
from google.adk.telemetry.setup import maybe_set_otel_providers
hooks = google_cloud.get_gcp_exporters(enable_cloud_tracing=True)
maybe_set_otel_providers([hooks])
`
