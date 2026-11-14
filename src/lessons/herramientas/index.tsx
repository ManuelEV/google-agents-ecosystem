import { Callout, KeyIdeas, Section, Sources, Tabs, Term } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { SignatureLab } from './SignatureLab'
import { StateLab } from './StateLab'
import { McpLab } from './McpLab'
import { ConfirmLab } from './ConfirmLab'
import { AGENT_TOOL_CODE, APP_INTEGRATION_CODE, BIGQUERY_CODE, CONFIRM_CODE, LONG_RUNNING_CODE, MCP_CODE, MCP_SERVER_CODE } from './data'
import './lesson.css'

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Una función Python es una herramienta">
        <p>
          En ADK no declaras esquemas JSON a mano: pones una función en <code>tools=[...]</code> y el framework la envuelve en un{' '}
          <Term tip="Clase de ADK que envuelve una función Python y genera su FunctionDeclaration para Gemini.">FunctionTool</Term>. El esquema sale del
          nombre, el docstring, los type hints y los valores por defecto. Eso tiene consecuencias concretas: el docstring es lo único que el modelo lee para
          decidir cuándo llamarla, y un parámetro sin default es obligatorio aunque lo anotes como <code>Optional</code>.
        </p>
        <p>
          La convención de retorno también importa: devuelve un <code>dict</code> con una clave <code>status</code> y, si algo falla, un{' '}
          <code>error_message</code> legible. El modelo lo lee y decide qué decirle al usuario; una excepción, en cambio, rompe la invocación (y en ADK 2.x
          además desactiva los reintentos automáticos si la atrapas con un <code>except Exception</code> genérico).
        </p>
        <SignatureLab />
        <Callout tone="tip" title="Escribe el docstring para el modelo, no para tu equipo">
          "Úsala cuando el usuario pregunte por un pedido concreto" vale más que una descripción técnica. Nombra los parámetros con ejemplos de formato
          ("4821", "AX-88213-CL"): Gemini copia esos formatos.
        </Callout>
      </Section>

      <Section n={2} title="ToolContext: lo que la herramienta sabe y el modelo no">
        <p>
          Agrega un parámetro anotado como <code>ToolContext</code> y ADK lo inyecta por tipo (el nombre da igual) sin exponerlo al modelo. Desde ahí lees y
          escribes <code>state</code>, pides confirmaciones, guardas artefactos o cambias el flujo con <code>actions</code>. El estado tiene prefijos que
          definen cuánto vive cada clave; el lab muestra qué sobrevive a qué.
        </p>
        <StateLab />
        <Callout tone="danger" title="Seguridad: la política va en el ToolContext, no en los argumentos del modelo">
          Si la herramienta necesita saber de qué cliente es la conversación, léelo de <code>tool_context.state["user:customer_id"]</code> (lo puso tu
          aplicación al crear la sesión), nunca de un argumento <code>customer_id</code> que el modelo pueda rellenar con lo que un prompt malicioso le pida.
          Es la recomendación explícita de la guía de seguridad de ADK; en la lección de seguridad lo verás como <code>before_tool_callback</code>.
        </Callout>
      </Section>

      <Section n={3} title="Herramientas que viven fuera: McpToolset">
        <p>
          El transportista AndesExpress no está en Google Cloud. En vez de escribir una función por endpoint, lo envuelves en un servidor{' '}
          <Term tip="Model Context Protocol: estándar abierto (JSON-RPC 2.0) para que un cliente descubra y llame herramientas de un servidor.">MCP</Term> y
          ADK lo consume con <code>McpToolset</code>. Dos reglas de la documentación: filtra siempre con <code>tool_filter</code> y prefiere{' '}
          <code>auth_scheme</code>/<code>auth_credential</code> a inyectar headers a mano cuando haya OAuth de por medio.
        </p>
        <Tabs
          tabs={[
            { id: 'client', label: 'ADK (cliente) · tools.py', content: <Code code={MCP_CODE} lang="python" title="examples/andes_data/tools.py" highlight={linesOf(MCP_CODE, 'StreamableHTTPConnectionParams(', 'tool_filter=', 'headers=')} /> },
            { id: 'server', label: 'Servidor MCP · server.py', content: <Code code={MCP_SERVER_CODE} lang="python" title="examples/andes_data/carrier_mcp/server.py" highlight={linesOf(MCP_SERVER_CODE, '@mcp.tool()', 'streamable-http')} /> },
          ]}
        />
        <McpLab />
        <Callout tone="info" title="stdio, SSE o Streamable HTTP">
          Para un servidor local que arrancas como proceso (<code>npx …</code>, un script Python) usa <code>StdioConnectionParams</code>; para servidores
          remotos, <code>StreamableHTTPConnectionParams</code> (el transporte actual) o <code>SseConnectionParams</code> si el servidor es antiguo. Las tres
          clases viven en <code style={{ wordBreak: 'break-all' }}>google.adk.tools.mcp_tool.mcp_session_manager</code>.
        </Callout>
      </Section>

      <Section n={4} title="Pausar al agente: confirmación humana">
        <p>
          Hay acciones que no quieres que un modelo ejecute solo: reembolsos grandes, borrar datos, enviar correos. <code>FunctionTool(fn,
          require_confirmation=...)</code> acepta <code>True</code> o una función con los mismos argumentos que la herramienta que devuelve un booleano. Si
          dice que sí, ADK no ejecuta la función: emite un <code>function_call</code> llamado <code>adk_request_confirmation</code> y detiene la invocación
          hasta que tu cliente responda.
        </p>
        <Code code={CONFIRM_CODE} lang="python" title="examples/andes_data/tools.py" highlight={linesOf(CONFIRM_CODE, 'def needs_approval', 'return amount_clp >', 'require_confirmation=needs_approval')} maxHeight={380} />
        <ConfirmLab />
        <h3>Tres formas de "no ejecutar todavía"</h3>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Mecanismo</th>
                <th>Quién decide</th>
                <th>Cuándo usarlo</th>
                <th>Cómo se reanuda</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>require_confirmation</code>
                </td>
                <td>Un humano (sí/no + payload)</td>
                <td>Acciones sensibles o irreversibles: reembolsos, borrados, envíos.</td>
                <td>
                  <code>function_response</code> <code>adk_request_confirmation</code> con el mismo <code>id</code>, <code>confirmed</code> y <code>payload</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <code>tool_context.request_confirmation(hint, payload)</code>
                </td>
                <td>Un humano, pero con datos estructurados de vuelta</td>
                <td>Cuando necesitas que el aprobador complete algo (días aprobados, monto ajustado).</td>
                <td>Igual, y la tool lee <code>tool_context.tool_confirmation.payload</code>.</td>
              </tr>
              <tr>
                <td>
                  <code>LongRunningFunctionTool</code>
                </td>
                <td>Un sistema externo que tarda</td>
                <td>Exportaciones, jobs, aprobaciones en otro sistema. La tool devuelve un ticket; el trabajo pesado va en otro servidor.</td>
                <td>El cliente envía un <code>FunctionResponse</code> intermedio o final con el mismo <code>id</code> (y <code>invocation_id</code> si usas Resume).</td>
              </tr>
              <tr>
                <td>
                  <code>AgentTool</code>
                </td>
                <td>Otro agente</td>
                <td>Delegar una sub-tarea acotada (resumir, clasificar) sin transferir la conversación.</td>
                <td>No pausa: el sub-agente responde y su texto vuelve como resultado de la tool.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid-2">
          <Code code={LONG_RUNNING_CODE} lang="python" title="LongRunningFunctionTool" />
          <Code code={AGENT_TOOL_CODE} lang="python" title="AgentTool" />
        </div>
      </Section>

      <Section n={5} title="Otras herramientas listas para usar">
        <p>
          ADK trae integraciones con servicios de Google y con SaaS de terceros. Dos que usarás en Andes Market: <strong>BigQueryToolset</strong> (ventas) y{' '}
          <strong>ApplicationIntegrationToolset</strong>, que expone los 100+ conectores de Integration Connectors (Salesforce, ServiceNow, SAP, JIRA…) como
          herramientas. Las bases de datos relacionales van por otro camino, MCP Toolbox, y tienen su propia lección.
        </p>
        <div className="grid-2">
          <Code code={BIGQUERY_CODE} lang="python" title="BigQuery · solo lectura" highlight={linesOf(BIGQUERY_CODE, 'WriteMode.BLOCKED')} />
          <Code code={APP_INTEGRATION_CODE} lang="python" title="Application Integration · Salesforce" highlight={linesOf(APP_INTEGRATION_CODE, 'connection=', 'entity_operations=')} />
        </div>
        <Callout tone="warn" title="Roles para Application Integration">
          <code style={{ wordBreak: 'break-all' }}>roles/integrations.integrationEditor</code>, <code>roles/connectors.invoker</code> y{' '}
          <code style={{ wordBreak: 'break-all' }}>roles/secretmanager.secretAccessor</code>. La documentación advierte contra{' '}
          <code style={{ wordBreak: 'break-all' }}>roles/integrations.integrationInvoker</code> en Agent Runtime (provoca 403). Además hay que publicar la
          integración "ExecuteConnection" desde la plantilla Connection Tool en la misma región de la conexión.
        </Callout>
      </Section>

      <KeyIdeas
        items={[
          <>
            Una función Python con type hints y docstring es una herramienta. <strong>Requerido = sin default</strong>; <code>Optional</code> solo no basta;
            devuelve <code>dict</code> con <code>status</code>.
          </>,
          <>
            <code>ToolContext</code> se inyecta por tipo y es invisible para el modelo: ahí viven el estado (<code>user:</code>, <code>app:</code>,{' '}
            <code>temp:</code>) y la política de seguridad.
          </>,
          <>
            <code>McpToolset</code> conecta servidores MCP locales o remotos; filtra con <code>tool_filter</code>. No conecta hasta el primer uso.
          </>,
          <>
            <code>require_confirmation</code> pausa la invocación y espera un <code>function_response</code> <code>adk_request_confirmation</code> con el
            mismo id. Es tu "humano en el circuito" más barato.
          </>,
          <>Para SaaS usa Application Integration; para BigQuery, su toolset con escritura bloqueada; para bases SQL, MCP Toolbox (siguiente lección).</>,
        ]}
      />
      <Sources
        items={[
          { label: 'ADK · Function tools', href: 'https://adk.dev/tools-custom/function-tools/' },
          { label: 'ADK · MCP tools (McpToolset, connection params, tool_filter)', href: 'https://adk.dev/tools-custom/mcp-tools/' },
          { label: 'ADK · Tool confirmation (require_confirmation, adk_request_confirmation)', href: 'https://adk.dev/tools-custom/confirmation/' },
          { label: 'ADK · State (prefijos user:/app:/temp:)', href: 'https://adk.dev/sessions/state/' },
          { label: 'ADK · Safety and security', href: 'https://adk.dev/safety/' },
          { label: 'ADK · BigQuery toolset', href: 'https://adk.dev/integrations/bigquery/' },
          { label: 'ADK · Application Integration toolset', href: 'https://adk.dev/integrations/application-integration/' },
        ]}
      />
    </>
  )
}
