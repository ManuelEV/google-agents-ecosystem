import { Callout, KeyIdeas, Section, Sources, Term } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { ArchDiagram } from '../../components/Arch'
import { DelegationLab } from './DelegationLab'
import { GraphLab } from './GraphLab'
import { DescriptionLab, ModesLab } from './SmallLabs'
import { CODE_COORDINATOR } from './data'
import './lesson.css'

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Un agente no debería hacerlo todo">
        <p>
          Andi ya consulta pedidos, stock y reembolsos desde un solo <code>Agent</code>. Funciona, pero cada herramienta nueva engorda la instrucción,
          sube el costo por turno y hace más probable que el modelo elija mal. ADK 2.x ofrece dos formas de repartir el trabajo:
        </p>
        <ul>
          <li>
            <strong>Workflow colaborativo</strong>: un coordinador con <code>sub_agents</code>. El modelo del raíz decide a quién delegar leyendo la{' '}
            <code>description</code> de cada sub-agente; ADK inyecta una herramienta de delegación por sub-agente.
          </li>
          <li>
            <strong>Workflow en grafo</strong>: un <code>Workflow</code> con <code>edges</code>. Agentes, funciones y herramientas son nodos; la ruta la
            decide código Python (<code>Event(route=…)</code>) y un nodo puede pausar todo para pedir una decisión humana (<code>RequestInput</code>).
          </li>
        </ul>
        <p>
          Las dos versiones de <code>andes_ops</code> viven en <code>examples/andes_workflow/</code>: <code>agent.py</code> (coordinador) y{' '}
          <code>graph.py</code> (grafo). Usan las mismas herramientas de la lección anterior.
        </p>
      </Section>

      <Section n={2} title="Delegación por descripción (coordinador + sub_agents)">
        <p>
          Sigue una devolución de principio a fin. Fíjate en tres cosas: el raíz <em>no</em> llama herramientas de negocio, el sub-agente en{' '}
          <Term tip='mode="task": el sub-agente puede pedir aclaraciones al usuario y devuelve el control automáticamente al llamar finish_task.'>modo task</Term>{' '}
          puede pedir una confirmación, y el retorno al coordinador es una llamada a <code>finish_task</code>.
        </p>
        <DelegationLab />
        <Code code={CODE_COORDINATOR} lang="python" title="examples/andes_workflow/agent.py (extracto)" highlight={linesOf(CODE_COORDINATOR, 'mode="task"', 'description=', 'sub_agents=[')} maxHeight={380} />
        <ModesLab />
        <Callout tone="warn" title="Restricciones de mode (nov-2026)">
          <code>mode</code> se configura solo en sub-agentes, nunca en el raíz. Los agentes en modo <code>task</code> deben ser hojas (sin sub-agentes
          propios) y el modo task está desactivado dentro de grafos en ADK Python 2.0.0. Solo los <code>single_turn</code> pueden correr en paralelo.
        </Callout>
        <DescriptionLab />
      </Section>

      <Section n={3} title="Workflow en grafo: rutas deterministas y humanos en el circuito">
        <p>
          Cuando el flujo está regulado (reembolsos, aprobaciones, auditoría) conviene que la ruta la decida código y no un modelo. En ADK 2.0 un{' '}
          <code>Workflow</code> es un grafo: <code>("START", a, b)</code> encadena nodos; un nodo función devuelve <code>Event(route="X")</code> y un
          dict en la arista mapea cada ruta a su nodo. La salida de cada nodo es el <code>node_input</code> del siguiente.
        </p>
        <GraphLab />
        <Callout tone="info" title="Lo que el lab simplifica">
          El payload exacto con que ADK reanuda una invocación pausada (y el endpoint que lo recibe en <code>adk api_server</code>) está en la guía
          "Resume Agents" de adk.dev; aquí solo ves el efecto. Los ciclos (aristas de vuelta) exigen al menos una arista ruteada y{' '}
          <strong>no se acotan solos</strong>: tu condición de salida debe cumplirse o el grafo gira para siempre.
        </Callout>
        <Callout tone="tip" title="¿Y SequentialAgent, ParallelAgent, LoopAgent?">
          Son los "template workflows" de ADK 1.x: siguen funcionando (con <code>output_key</code>, <code>{'{estado}'}</code> en instrucciones,{' '}
          <code>max_iterations</code> y <code>exit_loop</code> con <code>tool_context.actions.escalate = True</code>), pero la documentación los marca
          como deprecados a favor de los grafos y los workflows dinámicos. Para proyectos nuevos, empieza con <code>Workflow</code>.
        </Callout>
      </Section>

      <Section n={4} title="Cuándo usar cada enfoque">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th></th>
                <th>Coordinador + sub_agents</th>
                <th>Workflow en grafo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Quién decide la ruta</td>
                <td>El LLM del raíz, por las descriptions</td>
                <td>Código Python (router), testeable sin modelo</td>
              </tr>
              <tr>
                <td>Conversaciones abiertas / aclaraciones</td>
                <td>Natural (modo chat o task)</td>
                <td>Posible, pero cada rama es explícita</td>
              </tr>
              <tr>
                <td>Humano en el circuito</td>
                <td><code>require_confirmation</code> en la herramienta</td>
                <td>Nodo con <code>RequestInput</code> (pausa todo el grafo)</td>
              </tr>
              <tr>
                <td>Costo por turno</td>
                <td>Una llamada extra al raíz por delegación</td>
                <td>Un clasificador barato + el especialista</td>
              </tr>
              <tr>
                <td>Auditoría / regulación</td>
                <td>Depende del modelo</td>
                <td>Ruta determinista y reproducible</td>
              </tr>
              <tr>
                <td>Paralelismo</td>
                <td>Solo sub-agentes single_turn</td>
                <td>Ramas del grafo (workflow dinámico con <code>ctx.run_node</code>)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          En la práctica se combinan: un grafo para el esqueleto regulado y, dentro de un nodo, un agente con sub-agentes para la parte conversacional.
        </p>
      </Section>

      <Section n={5} title="Lo que agregamos a la arquitectura">
        <p>
          Tres sub-agentes especializados bajo el coordinador y un supervisor humano que aprueba devoluciones grandes. Las herramientas y bases de
          datos son las mismas: cambió quién las usa.
        </p>
        <ArchDiagram stage={3} />
      </Section>

      <KeyIdeas
        items={[
          <>
            Con <code>sub_agents</code>, ADK inyecta una herramienta de delegación por sub-agente; el raíz elige por la <strong>description</strong>.
            Escríbela para el coordinador, no para el usuario.
          </>,
          <>
            <code>mode="task"</code> = puede aclarar y vuelve solo con <code>finish_task</code>; <code>chat</code> = vuelve con{' '}
            <code>transfer_to_agent</code>; <code>single_turn</code> = sin interacción y paralelizable.
          </>,
          <>
            Un <code>Workflow</code> es un grafo: <code>("START", a, b)</code>, routers que devuelven <code>Event(route=…)</code>, dicts ruta→nodo, y{' '}
            <code>RequestInput</code> para pausar hasta que un humano responda.
          </>,
          <>Los ciclos no se acotan solos y los template workflows (Sequential/Parallel/Loop) están deprecados: grafos para lo nuevo.</>,
        ]}
      />
      <Sources
        items={[
          { label: 'ADK · Workflows (overview)', href: 'https://adk.dev/workflows/' },
          { label: 'ADK · Collaborative workflows (sub_agents, modes, finish_task)', href: 'https://adk.dev/workflows/collaboration/' },
          { label: 'ADK · Graph workflows', href: 'https://adk.dev/graphs/' },
          { label: 'ADK · Routes (Event(route=…), ciclos)', href: 'https://adk.dev/graphs/routes/' },
          { label: 'ADK · Human input (RequestInput)', href: 'https://adk.dev/graphs/human-input/' },
          { label: 'ADK · Dynamic workflows (ctx.run_node)', href: 'https://adk.dev/graphs/dynamic/' },
          { label: 'ADK · Template workflow agents (deprecados)', href: 'https://adk.dev/agents/workflow-agents/' },
          { label: 'ADK · Tool confirmation', href: 'https://adk.dev/tools-custom/confirmation/' },
        ]}
      />
    </>
  )
}
