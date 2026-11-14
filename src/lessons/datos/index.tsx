import { useState } from 'react'
import { ArchDiagram } from '../../components/Arch'
import { Callout, KeyIdeas, Lab, Section, Segmented, Sources, Term } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { Terminal, useTerminalPlayer } from '../../components/Terminal'
import { YamlLab } from './YamlLab'
import { StockLab } from './StockLab'
import { ToolsetLab } from './ToolsetLab'
import { AuthLab } from './AuthLab'
import { ADK_CODE, TERM_EDIT, TERM_LOCAL } from './data'
import './lesson.css'

/* Lab 1 · ¿Quién escribe el SQL? */
const PROMPTS = [
  { q: '¿Hay stock de MOCH-30L-AZ?', free: "SELECT * FROM inventory WHERE sku = 'MOCH-30L-AZ'", bad: false, param: 'get_stock(sku="MOCH-30L-AZ")' },
  {
    q: "Busca el SKU x'; DROP TABLE inventory; -- (lo pegó un usuario)",
    free: "SELECT * FROM inventory WHERE sku = 'x'; DROP TABLE inventory; --'",
    bad: true,
    param: 'get_stock(sku="x\'; DROP TABLE inventory; --")  →  WHERE sku = $1  (no encuentra nada)',
  },
  { q: 'Dame el email y la dirección de todos los clientes', free: 'SELECT email, address FROM customers', bad: true, param: 'No existe una herramienta para eso: el modelo no puede pedirlo.' },
]

function SqlLab() {
  const [i, setI] = useState(0)
  const p = PROMPTS[i]
  return (
    <Lab title="¿Quién escribe el SQL?" hint="Elige una pregunta">
      <div className="row" style={{ marginBottom: 12 }}>
        <Segmented options={PROMPTS.map((_, k) => ({ value: String(k), label: ['Pregunta normal', 'Inyección', 'Fuera de alcance'][k] }))} value={String(i)} onChange={(v) => setI(Number(v))} />
      </div>
      <p style={{ margin: '0 0 10px' }}>
        <strong>Usuario:</strong> {p.q}
      </p>
      <div className="datos-sql-cmp" key={i}>
        <div className="datos-sql-card anim-fade" data-tone="error">
          <h4>Text-to-SQL: el modelo escribe la consulta</h4>
          <div className="q">Gemini genera SQL a partir del esquema. Lo que salga, se ejecuta.</div>
          <pre className={p.bad ? 'is-bad' : ''}>{p.free}</pre>
          <div className="q">{p.bad ? 'Depende de que el modelo "se porte bien" y de filtros frágiles.' : 'Funciona… hasta que no.'}</div>
        </div>
        <div className="datos-sql-card anim-fade" data-tone="ok">
          <h4>MCP Toolbox: el modelo elige la herramienta y los parámetros</h4>
          <div className="q">El SQL está fijo en tools.yaml; el valor viaja como bind parameter.</div>
          <pre className="is-good">{p.param}</pre>
          <div className="q">La superficie de ataque es la lista de herramientas, que tú controlas.</div>
        </div>
      </div>
    </Lab>
  )
}

function LocalTerminalLab() {
  const player = useTerminalPlayer(TERM_LOCAL)
  return (
    <Lab title="Probarlo en tu laptop: Docker + Toolbox + adk web" hint="Pulsa ▶">
      <Terminal lines={TERM_LOCAL} upTo={player.upTo} typed={player.typed} player={player} title="bash · examples/" maxHeight={420} />
    </Lab>
  )
}

function EditTerminalLab() {
  const player = useTerminalPlayer(TERM_EDIT)
  return (
    <Lab title="Cambiar una consulta sin redesplegar el agente" hint="Pulsa ▶" badge="Operación">
      <Terminal lines={TERM_EDIT} upTo={player.upTo} typed={player.typed} player={player} title="bash · producción" maxHeight={220} />
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="El modelo nunca escribe SQL">
        <p>
          Los datos de Andes Market viven en tres sitios: los pedidos en <strong>Cloud SQL</strong> (dentro de Google), el inventario en el{' '}
          <strong>Postgres del ERP</strong> (on-prem, fuera de Google) y las ventas en <strong>BigQuery</strong>. La tentación es darle al modelo el
          esquema y dejar que genere SQL. La alternativa de Google es{' '}
          <Term tip="Servidor MCP open source de Google que expone consultas SQL declaradas en YAML como herramientas, con pool de conexiones y autenticación.">
            MCP Toolbox for Databases
          </Term>
          : tú declaras cada consulta, con parámetros tipados, y el modelo solo elige cuál llamar y con qué valores.
        </p>
        <SqlLab />
        <Callout tone="info" title="Toolbox es un servidor, no una librería">
          Corre como proceso aparte (binario, contenedor o sidecar en Cloud Run) y habla MCP con el agente. Soporta Cloud SQL (Postgres/MySQL/SQL Server),
          AlloyDB, BigQuery, Spanner y también Postgres, MySQL, MongoDB o Neo4j en cualquier lado: por eso sirve igual para lo que está dentro y fuera de
          Google.
        </Callout>
      </Section>

      <Section n={2} title="tools.yaml: fuentes, herramientas y toolsets">
        <p>
          Todo se declara en un archivo. Un documento <code>kind: source</code> por base de datos (el <code>type</code> cambia los campos: Cloud SQL se
          conecta por proyecto/región/instancia, un Postgres genérico por host/puerto, BigQuery solo por proyecto), un <code>kind: tool</code> por
          consulta con su <code>statement</code> y <code>parameters</code>, y <code>kind: toolset</code> para agruparlas. Los secretos entran como{' '}
          <code>${'{VAR}'}</code> desde el entorno.
        </p>
        <YamlLab />
        <Callout tone="warn" title="Placeholders, no concatenación">
          <code>$1</code> en Postgres, <code>?</code> en MySQL, <code>@nombre</code> en BigQuery. Si escribes el parámetro dentro del string SQL, Toolbox no
          puede protegerte: la ganancia de seguridad está justamente en el bind parameter.
        </Callout>
      </Section>

      <Section n={3} title="Un turno completo: del function_call a la fila del ERP">
        <p>
          En ADK, Toolbox es un toolset más: <code>ToolboxToolset(server_url, toolset_name)</code>. El agente no sabe si la respuesta sale de Cloud SQL o
          de un servidor en Concepción. El lab sigue una pregunta de stock hasta el Postgres externo y de vuelta.
        </p>
        <Code code={ADK_CODE} lang="python" title="examples/andes_data/tools.py · agent.py" highlight={linesOf(ADK_CODE, 'ToolboxToolset(', 'toolset_name=', 'tools=[db_tools')} maxHeight={320} />
        <StockLab />
      </Section>

      <Section n={4} title="Toolsets: cada agente ve solo sus herramientas">
        <p>
          El mismo Toolbox sirve a varios agentes. Un agente de cara al cliente no debería poder listar pedidos por email ni ver ventas; en vez de
          confiar en el prompt, simplemente no cargas esas herramientas. Es el principio de <em>mínimo privilegio</em> aplicado a herramientas, y se
          configura con <code>toolset_name</code>.
        </p>
        <ToolsetLab />
      </Section>

      <Section n={5} title="Autenticación y red: sin contraseñas en el agente">
        <p>
          La ventaja arquitectónica de Toolbox es concentrar las credenciales de las bases en un solo componente. En producción el agente se autentica
          contra Toolbox con su identidad de workload, Toolbox entra a Cloud SQL por IAM y a BigQuery con ADC, y la única contraseña que queda (la del ERP)
          vive en Secret Manager.
        </p>
        <AuthLab />
        <LocalTerminalLab />
        <EditTerminalLab />
        <Callout tone="tip" title="La otra vía hacia 'fuera de Google': Application Integration">
          Para SaaS (Salesforce, ServiceNow, SAP, JIRA… más de 100 conectores) no uses Toolbox: <code>ApplicationIntegrationToolset</code> expone
          entidades y acciones del conector como herramientas, con OAuth gestionado por Integration Connectors. Toolbox es para bases de datos; Application
          Integration, para aplicaciones.
        </Callout>
      </Section>

      <Section n={6} title="Lo que agregamos a la arquitectura">
        <p>
          Con esta lección el agente ya consulta tres bases de datos a través de Toolbox y una API externa por MCP. Las piezas con borde discontinuo
          están fuera de Google Cloud.
        </p>
        <ArchDiagram stage={2} flows={['root>toolbox', 'toolbox>erp']} />
      </Section>

      <KeyIdeas
        items={[
          <>
            El modelo <strong>elige herramientas y parámetros</strong>; el SQL está fijo en <code>tools.yaml</code> con bind parameters (<code>$1</code>,{' '}
            <code>?</code>, <code>@nombre</code>).
          </>,
          <>
            Un YAML cubre Cloud SQL (<code>cloud-sql-postgres</code>), Postgres en cualquier lugar (<code>postgres</code>) y BigQuery (<code>bigquery</code>):
            dentro y fuera de Google se ven igual desde el agente.
          </>,
          <>
            <code>ToolboxToolset(server_url, toolset_name)</code> en ADK; un toolset por agente para aplicar mínimo privilegio sin depender del prompt.
          </>,
          <>Credenciales en un solo sitio: workload identity hacia Toolbox, IAM hacia Cloud SQL, ADC hacia BigQuery, Secret Manager para el ERP.</>,
          <>Cambias una consulta editando el YAML y reiniciando Toolbox: el agente no se redespliega.</>,
        ]}
      />
      <Sources
        items={[
          { label: 'ADK · MCP Toolbox for Databases (ToolboxToolset, credenciales)', href: 'https://adk.dev/integrations/mcp-toolbox-for-databases/' },
          { label: 'MCP Toolbox · configuración de tools.yaml (sources, tools, toolsets)', href: 'https://mcp-toolbox.dev/documentation/configuration/' },
          { label: 'MCP Toolbox · documentación', href: 'https://mcp-toolbox.dev/' },
          { label: 'ADK · Application Integration toolset', href: 'https://adk.dev/integrations/application-integration/' },
          { label: 'Arquitectura de referencia: agente ADK + MCP Toolbox en Cloud Run', href: 'https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run' },
        ]}
      />
    </>
  )
}
