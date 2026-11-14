import { Callout, KeyIdeas, Section, Sources, Term } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { ArchDiagram } from '../../components/Arch'
import { MemoryBankLab, PrefixLab, ServicesLab, TemplateLab } from './labs'
import { CODE_MEMORY, CODE_MEMORY_SERVICE, CODE_OUTPUT_KEY } from './data'
import './lesson.css'

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Tres cosas que un agente puede recordar">
        <p>
          ADK separa la memoria en tres capas con nombres precisos. Una <Term tip="Session: una interacción continua entre un usuario y el sistema de agentes. Guarda los Events en orden y un State temporal.">Session</Term> es una conversación: sus eventos
          (mensajes, llamadas a herramientas, respuestas) y un <Term tip="session.state: diccionario de datos de la sesión, p. ej. el último pedido consultado o una preferencia dicha en esta conversación.">State</Term>{' '}
          asociado. La <Term tip="Memory: almacén buscable que puede abarcar muchas sesiones pasadas o fuentes externas; lo administra un MemoryService.">Memory</Term> es
          un almacén que cruza sesiones. Un <code>SessionService</code> administra lo primero; un <code>MemoryService</code>, lo segundo.
        </p>
        <p>
          Hasta ahora Andi usaba <code>InMemorySessionService</code>: todo vivía en la RAM de <code>adk web</code>. Para producción necesitas que el
          estado sobreviva reinicios y que Camila sea reconocida semanas después. Eso es lo que Sessions y Memory Bank de Agent Runtime resuelven.
        </p>
      </Section>

      <Section n={2} title="El estado y sus prefijos">
        <p>
          <code>session.state</code> es un diccionario, pero el <strong>prefijo</strong> de la clave decide su alcance: sin prefijo es de esta sesión;{' '}
          <code>user:</code> se comparte entre todas las sesiones del mismo <code>user_id</code>; <code>app:</code> lo ven todos los usuarios;{' '}
          <code>temp:</code> dura una invocación y se descarta. Se escribe desde herramientas y callbacks (<code>tool_context.state[...]</code>); el
          framework lo registra como <code>state_delta</code> en el evento. Nunca mutes <code>session.state</code> de una sesión que obtuviste con{' '}
          <code>get_session</code>: ese cambio no pasa por el historial y los servicios persistentes lo ignoran.
        </p>
        <PrefixLab />
        <TemplateLab />
        <Code code={CODE_OUTPUT_KEY} lang="python" title="examples/andes_workflow/graph.py · examples/andes_data/tools.py" highlight={linesOf(CODE_OUTPUT_KEY, 'output_key=', 'tool_context.state[')} maxHeight={300} />
        <Callout tone="tip" title="output_key: la forma más simple de pasar datos entre agentes">
          Con <code>output_key="refund_summary"</code> la respuesta final del sub-agente queda en <code>state["refund_summary"]</code> y el siguiente
          agente la lee con <code>{'{refund_summary}'}</code> en su instrucción. Si usas <code>output_schema</code>, se guarda el objeto ya parseado.
        </Callout>
      </Section>

      <Section n={3} title="Dónde se guarda la sesión">
        <p>
          El <code>Runner</code> no sabe ni le importa dónde vive la sesión: le pasas un servicio. En Agent Runtime, <code>VertexAiSessionService</code>{' '}
          usa Sessions, el almacén administrado; si despliegas el agente ahí, es el que se usa por defecto. Para probarlo en local sin desplegar el
          agente, crea un Agent Runtime vacío como almacén y apunta <code>adk web</code> a él.
        </p>
        <ServicesLab />
        <Callout tone="warn" title="ADK 2.0 cambió el esquema de eventos">
          Los eventos ganaron los campos <code>node_info</code> y <code>output</code>. Un <code>DatabaseSessionService</code> con columnas rígidas o un
          validador JSON estricto necesitan actualizarse; Sessions de Agent Runtime lo absorbe por ti. Desde ADK 2.14,{' '}
          <code>VertexAiSessionService.create_session</code> solo acepta argumentos de configuración.
        </Callout>
      </Section>

      <Section n={4} title="Memory Bank: hechos que cruzan sesiones">
        <p>
          Sessions guarda transcripciones; <strong>Memory Bank</strong> guarda <em>hechos</em>. Un LLM lee la conversación, extrae lo relevante
          ("prefiere retiro en tienda"), lo consolida con lo que ya sabía del usuario y lo deja en un scope{' '}
          <code>{'{agent_name, user}'}</code>. Después, cada turno recupera por similitud las memorias que importan para el mensaje actual. En ADK
          son dos piezas: <code>VertexAiMemoryBankService</code> en el Runner y las herramientas <code>preload_memory</code> (automática, cada turno) o{' '}
          <code>load_memory</code> (cuando el agente decide buscar).
        </p>
        <MemoryBankLab />
        <div className="grid-2">
          <Code code={CODE_MEMORY} lang="python" title="examples/andes_prod/agent.py (extracto)" highlight={linesOf(CODE_MEMORY, 'add_session_to_memory', 'tools=[preload_memory]', 'after_agent_callback=')} maxHeight={360} />
          <Code code={CODE_MEMORY_SERVICE} lang="python" title="Runner con Memory Bank (fuera de Agent Runtime)" highlight={linesOf(CODE_MEMORY_SERVICE, 'VertexAiMemoryBankService(')} maxHeight={360} />
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th></th>
                <th>Sessions</th>
                <th>Memory Bank</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Guarda</td>
                <td>Eventos y estado de una conversación</td>
                <td>Hechos extraídos por un LLM, consolidados</td>
              </tr>
              <tr>
                <td>Alcance</td>
                <td>Una sesión (más <code>user:</code>/<code>app:</code> en el estado)</td>
                <td>Scope <code>{'{agent_name, user}'}</code>: todas las sesiones del usuario</td>
              </tr>
              <tr>
                <td>Cuándo se escribe</td>
                <td>Cada evento, automáticamente</td>
                <td>Cuando llamas <code>add_session_to_memory</code> (asíncrono) o creas memorias directo</td>
              </tr>
              <tr>
                <td>Cómo se lee</td>
                <td>Historial completo en cada llamada al modelo</td>
                <td>Búsqueda por similitud (<code>preload_memory</code> / <code>load_memory</code>)</td>
              </tr>
              <tr>
                <td>Controles</td>
                <td><code>delete_session</code>, recorte del historial</td>
                <td>TTL, revisiones, temas y ejemplos few-shot, IAM conditions</td>
              </tr>
              <tr>
                <td>Costo</td>
                <td>Tokens del historial en cada turno</td>
                <td>Por operación (generar, recuperar) + tokens de las memorias</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout tone="danger" title="Memory poisoning">
          Si un usuario (o un documento inyectado) logra que el agente "recuerde" algo falso, ese hecho se aplicará en sesiones futuras. Mitiga: scope
          estricto por usuario (nunca memorias compartidas por defecto), <code>user_id</code> validado por tu autenticación y no por el modelo, Model
          Armor sobre lo que entra, TTL razonable, IAM conditions en las escrituras y un log estructurado propio cada vez que guardas (Sessions y Memory
          Bank no escriben logs de runtime).
        </Callout>
      </Section>

      <Section n={5} title="Lo que agregamos a la arquitectura">
        <p>
          Dos servicios administrados cuelgan ahora del agente: Sessions (historial y estado persistentes) y Memory Bank (memoria por usuario). Ninguno
          requiere infraestructura tuya; ambos viven en el mismo Agent Runtime donde desplegarás a Andi en la próxima lección.
        </p>
        <ArchDiagram stage={4} />
      </Section>

      <KeyIdeas
        items={[
          <>
            <strong>Session</strong> = eventos + estado de una conversación; <strong>Memory</strong> = almacén buscable entre sesiones. Los administran{' '}
            <code>SessionService</code> y <code>MemoryService</code>, que le pasas al <code>Runner</code>.
          </>,
          <>
            El prefijo manda: sin prefijo (sesión), <code>user:</code> (usuario), <code>app:</code> (todos), <code>temp:</code> (se descarta). Escribe por{' '}
            <code>tool_context.state</code>/<code>callback_context.state</code>, nunca mutando <code>session.state</code> directo.
          </>,
          <>
            <code>{'{clave}'}</code> en la instrucción inyecta estado y falla si falta; <code>{'{clave?}'}</code> lo hace opcional. <code>output_key</code>{' '}
            guarda la respuesta final de un agente para el siguiente.
          </>,
          <>
            Memory Bank extrae y consolida hechos por scope. La memoria no se guarda sola: <code>add_session_to_memory()</code> en un callback y{' '}
            <code>preload_memory</code> para leerla. Protege el scope: memory poisoning es el riesgo nuevo.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'ADK · Sessions, State y Memory (conceptos)', href: 'https://adk.dev/sessions/' },
          { label: 'ADK · State (prefijos, output_key, templating)', href: 'https://adk.dev/sessions/state/' },
          { label: 'ADK · Memory (VertexAiMemoryBankService, preload_memory, add_session_to_memory)', href: 'https://adk.dev/sessions/memory/' },
          { label: 'Agent Runtime · Manage sessions with ADK (VertexAiSessionService)', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/sessions/manage-with-adk' },
          { label: 'Memory Bank · overview (generación, scopes, TTL, revisiones)', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank' },
          { label: 'ADK 2.0 · cambios en el esquema de eventos', href: 'https://adk.dev/2.0/' },
          { label: 'ADK · Safety (identidad, memoria, guardrails)', href: 'https://adk.dev/safety/' },
        ]}
      />
    </>
  )
}
