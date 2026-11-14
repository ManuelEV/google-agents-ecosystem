import { useMemo, useState } from 'react'
import { Boxes, KeyRound, Shield, Sparkles } from 'lucide-react'
import { Callout, Checklist, KeyIdeas, Lab, Panel, Pill, Section, Segmented, Sources } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { ConsoleBanner, ConsoleButton, ConsoleCard, ConsoleDisclaimer, ConsoleField, ConsoleStatus, ConsoleTable, GcpConsole, Focus } from '../../components/Console'
import { Narration, PlayerBar, type StepInfo } from '../../components/Player'
import { Terminal, useTerminalPlayer } from '../../components/Terminal'
import { usePlayer } from '../../lib/hooks'
import { PROJECT_ID, PROJECT_NUMBER, STAGING_BUCKET } from '../../sim/scenario'
import { AGENT_SKELETON, ENV_API_KEY, ENV_VERTEX, TERM_AGENTS_CLI, TERM_SETUP } from './data'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Dos formas de autenticar                                          */
/* ------------------------------------------------------------------------ */
function AuthLab() {
  const [mode, setMode] = useState<'key' | 'vertex'>('vertex')
  return (
    <Lab title="API key o proyecto de Google Cloud" hint="Elige una opción">
      <div className="prep-auth">
        <button className={`prep-auth-card${mode === 'key' ? ' is-active' : ''}`} data-tone="user" onClick={() => setMode('key')}>
          <h4>
            <KeyRound size={16} style={{ verticalAlign: '-3px' }} /> A · API de Gemini (API key)
          </h4>
          <ul>
            <li>Una clave de AI Studio en <code>GOOGLE_API_KEY</code>. Cero configuración de nube.</li>
            <li>Ideal para la primera hora: probar ADK, herramientas, el chat local.</li>
            <li>Sin Agent Runtime, Sessions, Memory Bank, Model Armor ni Gemini Enterprise.</li>
          </ul>
        </button>
        <button className={`prep-auth-card${mode === 'vertex' ? ' is-active' : ''}`} data-tone="data" onClick={() => setMode('vertex')}>
          <h4>
            <Shield size={16} style={{ verticalAlign: '-3px' }} /> B · Agent Platform (proyecto + ADC)
          </h4>
          <ul>
            <li>
              <code>GOOGLE_GENAI_USE_VERTEXAI=TRUE</code> + proyecto + región. Credenciales con <code>gcloud auth application-default login</code>.
            </li>
            <li>Mismo código ADK; habilita todo lo administrado y la facturación/IAM de tu organización.</li>
            <li>Es lo que usarás en producción: empieza aquí si ya tienes proyecto.</li>
          </ul>
        </button>
      </div>
      <div style={{ marginTop: 12 }} className="anim-fade" key={mode}>
        <Code code={mode === 'key' ? ENV_API_KEY : ENV_VERTEX} lang="bash" title="andes_hello/.env" />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Consola: proyecto, APIs, IAM, bucket                              */
/* ------------------------------------------------------------------------ */
type ConsoleStep = StepInfo & { screen: 'project' | 'apis' | 'enable' | 'iam' | 'bucket' | 'done'; focus?: string }

const CONSOLE_STEPS: ConsoleStep[] = [
  {
    title: 'Crea (o elige) el proyecto',
    body: 'Todo en Google Cloud vive en un proyecto con facturación. En el selector de proyectos de la barra superior, "Nuevo proyecto": nombre andes-market-prod. Anota el ID y el número de proyecto; los usarás en comandos y en rutas de recursos.',
    screen: 'project',
    focus: 'create',
  },
  {
    title: 'Busca las APIs',
    body: 'Menú ☰ → APIs y servicios → Biblioteca. Agent Runtime exige dos: la API de la plataforma (en la consola aparece como "Vertex AI API", servicio aiplatform.googleapis.com) y Cloud Resource Manager API.',
    screen: 'apis',
    focus: 'search',
  },
  {
    title: 'Habilítalas',
    body: 'Botón "Habilitar" en cada una. Más adelante sumarás Model Armor API (seguridad) y Discovery Engine API (para registrar el agente en Gemini Enterprise). Con gcloud es un solo comando, como verás en el terminal.',
    screen: 'enable',
    focus: 'enable',
  },
  {
    title: 'Permisos para tu usuario',
    body: 'IAM → tu cuenta → roles "Agent Platform User" (roles/aiplatform.user) y "Storage Admin" (roles/storage.admin). El primero te deja desplegar y consultar agentes; el segundo, crear el bucket de staging. Son para TI, no para el agente: el agente tendrá su propia identidad.',
    screen: 'iam',
    focus: 'save',
  },
  {
    title: 'Bucket de staging',
    body: 'Cloud Storage → Crear bucket: gs://andes-market-prod-agents-staging en la misma región del agente (us-central1). adk deploy sube ahí tu código antes de construir el contenedor del Agent Runtime.',
    screen: 'bucket',
    focus: 'createBucket',
  },
  {
    title: 'Listo para el terminal',
    body: 'Proyecto, dos APIs, dos roles y un bucket. Todo lo demás (instalar ADK, crear el agente, desplegar) se hace desde la línea de comandos.',
    screen: 'done',
  },
]

function ConsoleScreen({ s }: { s: ConsoleStep }) {
  const f = (id: string) => s.focus === id
  const nav = [
    { id: 'home', label: 'Inicio' },
    { id: 'apis', label: 'APIs y servicios' },
    { id: 'iam', label: 'IAM y administración' },
    { id: 'storage', label: 'Cloud Storage' },
    { id: 'ai', label: 'Agent Platform' },
  ]
  if (s.screen === 'project')
    return (
      <GcpConsole product="Google Cloud" title="Nuevo proyecto" url="projectcreate" nav={nav} activeNav="home" crumbs={['Selector de proyectos', 'Nuevo proyecto']}>
        <ConsoleField label="Nombre del proyecto" value={PROJECT_ID} required hint={`ID del proyecto: ${PROJECT_ID} · No se puede cambiar después.`} width={420} />
        <ConsoleField label="Organización" value="andesmarket.cl" kind="select" width={420} />
        <ConsoleField label="Ubicación" value="andesmarket.cl" kind="select" hint="Organización o carpeta principal" width={420} />
        <div className="row">
          <ConsoleButton primary focus={f('create')}>
            Crear
          </ConsoleButton>
          <ConsoleButton>Cancelar</ConsoleButton>
        </div>
      </GcpConsole>
    )
  if (s.screen === 'apis' || s.screen === 'enable')
    return (
      <GcpConsole title="Biblioteca de APIs" url="apis/library" nav={nav} activeNav="apis" crumbs={['APIs y servicios', 'Biblioteca']}>
        <Focus on={f('search')} style={{ display: 'block' }}>
          <ConsoleField label="Buscar APIs y servicios" value={s.screen === 'apis' ? 'Vertex AI API' : 'Vertex AI API'} />
        </Focus>
        <div className="stack" style={{ gap: 8 }}>
          <div className="prep-api-row">
            <Sparkles size={18} color="var(--g-blue)" />
            <div style={{ flex: 1 }}>
              <div className="nm">Vertex AI API</div>
              <div className="ds">aiplatform.googleapis.com · Agent Platform, Agent Runtime, modelos Gemini</div>
            </div>
            {s.screen === 'enable' ? <ConsoleStatus ok>API habilitada</ConsoleStatus> : <ConsoleButton primary focus={f('enable')} small>Habilitar</ConsoleButton>}
          </div>
          <div className="prep-api-row">
            <Boxes size={18} color="var(--g-blue)" />
            <div style={{ flex: 1 }}>
              <div className="nm">Cloud Resource Manager API</div>
              <div className="ds">cloudresourcemanager.googleapis.com · la necesita el despliegue</div>
            </div>
            {s.screen === 'enable' ? <ConsoleStatus ok>API habilitada</ConsoleStatus> : <ConsoleButton small>Habilitar</ConsoleButton>}
          </div>
          <div className="prep-api-row">
            <Shield size={18} color="var(--g-blue)" />
            <div style={{ flex: 1 }}>
              <div className="nm">Model Armor API</div>
              <div className="ds">modelarmor.googleapis.com · la usarás en la lección de seguridad</div>
            </div>
            <ConsoleButton small>Habilitar</ConsoleButton>
          </div>
        </div>
      </GcpConsole>
    )
  if (s.screen === 'iam')
    return (
      <GcpConsole title="Editar acceso a “andes-market-prod”" url="iam-admin/iam" nav={nav} activeNav="iam" crumbs={['IAM y administración', 'IAM']}>
        <ConsoleField label="Principal" value="dev.agentes@andesmarket.cl" width={420} />
        <ConsoleCard title="Asignar roles">
          <ConsoleField label="Rol 1" value="Agent Platform User  (roles/aiplatform.user)" kind="select" />
          <ConsoleField label="Rol 2" value="Storage Admin  (roles/storage.admin)" kind="select" />
          <ConsoleButton small>+ Agregar otro rol</ConsoleButton>
        </ConsoleCard>
        <div className="row">
          <ConsoleButton primary focus={f('save')}>
            Guardar
          </ConsoleButton>
          <ConsoleButton>Cancelar</ConsoleButton>
        </div>
      </GcpConsole>
    )
  if (s.screen === 'bucket')
    return (
      <GcpConsole title="Crear un bucket" url="storage/create-bucket" nav={nav} activeNav="storage" crumbs={['Cloud Storage', 'Buckets', 'Crear']}>
        <ConsoleField label="Nombre del bucket" value={STAGING_BUCKET.replace('gs://', '')} required hint="Debe ser único a nivel global. Aquí irá el código que sube adk deploy." width={460} />
        <ConsoleField label="Tipo de ubicación" value="Región · us-central1 (Iowa)" kind="select" width={460} />
        <ConsoleField label="Clase de almacenamiento" value="Standard" kind="select" width={460} />
        <div className="row">
          <ConsoleButton primary focus={f('createBucket')}>
            Crear
          </ConsoleButton>
          <ConsoleButton>Cancelar</ConsoleButton>
        </div>
      </GcpConsole>
    )
  return (
    <GcpConsole title="Panel del proyecto" url="home/dashboard" nav={nav} activeNav="home" crumbs={['Inicio', 'Panel']}>
      <ConsoleBanner tone="ok">Proyecto listo para desplegar agentes.</ConsoleBanner>
      <ConsoleTable
        cols={['Recurso', 'Valor']}
        rows={[
          ['ID del proyecto', <span className="mono">{PROJECT_ID}</span>],
          ['Número del proyecto', <span className="mono">{PROJECT_NUMBER}</span>],
          ['APIs habilitadas', 'Vertex AI API · Cloud Resource Manager API'],
          ['Roles de tu usuario', 'roles/aiplatform.user · roles/storage.admin'],
          ['Bucket de staging', <span className="mono">{STAGING_BUCKET}</span>],
        ]}
      />
    </GcpConsole>
  )
}

function ConsoleLab() {
  const player = usePlayer(CONSOLE_STEPS.length, { interval: 5200 })
  const s = CONSOLE_STEPS[player.step]
  return (
    <Lab title="La consola, paso a paso" hint="Reproduce o haz clic en un paso" footer={<ConsoleDisclaimer />}>
      <PlayerBar player={player} labels={CONSOLE_STEPS.map((x) => x.title)} />
      <div className="prep-console-grid" style={{ marginTop: 12 }}>
        <div className="anim-fade" key={player.step}>
          <ConsoleScreen s={s} />
        </div>
        <div className="stack">
          <Narration steps={CONSOLE_STEPS} step={player.step} />
          <Checklist items={['Proyecto creado', 'APIs habilitadas', 'Roles IAM', 'Bucket de staging']} current={[0, 0, 1, 2, 3, 4][player.step]} />
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · Terminal: gcloud + ADK                                            */
/* ------------------------------------------------------------------------ */
const TERM_PHASES = [
  { until: 'gcloud config set project', label: 'Autenticación' },
  { until: 'gcloud services enable', label: 'APIs' },
  { until: 'adk --version', label: 'Instalar ADK' },
  { until: 'adk create', label: 'Crear agente' },
  { until: 'adk web', label: 'Arrancar adk web' },
]

function TerminalLab() {
  const player = useTerminalPlayer(TERM_SETUP)
  const phase = useMemo(() => {
    let p = 0
    TERM_SETUP.slice(0, player.upTo).forEach((l) => {
      if (l.kind !== 'cmd') return
      const idx = TERM_PHASES.findIndex((ph) => l.text.startsWith(ph.until))
      if (idx >= 0) p = Math.max(p, idx + 1)
    })
    return p
  }, [player.upTo])
  return (
    <Lab title="El terminal: de cero a adk web" hint="Pulsa ▶ y mira cada comando">
      <div className="prep-term-grid">
        <Terminal lines={TERM_SETUP} upTo={player.upTo} typed={player.typed} player={player} title="bash · ~/andes" maxHeight={460} />
        <div className="stack">
          <Panel title="Dónde vas" tone="system">
            <Checklist items={TERM_PHASES.map((p) => p.label)} current={player.done ? TERM_PHASES.length : phase} />
          </Panel>
          <Panel title="Qué hace cada comando" tone="tool" bodyStyle={{ fontSize: 13.5 }}>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)' }}>
              <li>
                <code>gcloud auth login</code> autentica la CLI; <code>application-default login</code> crea las ADC que usan los SDKs y ADK.
              </li>
              <li>
                <code>gcloud services enable</code> equivale a los botones "Habilitar" de la consola.
              </li>
              <li>
                <code>pip install "google-adk[gcp,toolbox,a2a,eval,mcp]"</code>: ADK 2.14 con los extras que usa el tutorial.
              </li>
              <li>
                <code>adk create</code> pregunta modelo y backend (Google AI = API key, Vertex AI = proyecto) y escribe el <code>.env</code>.
              </li>
              <li>
                <code>adk web</code> se corre desde la carpeta <strong>padre</strong> del agente.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4 · Lo que creó adk create                                            */
/* ------------------------------------------------------------------------ */
function SkeletonLab() {
  const [file, setFile] = useState<'agent' | 'env' | 'init'>('agent')
  const code = file === 'agent' ? AGENT_SKELETON : file === 'env' ? ENV_VERTEX : 'from . import agent\n'
  const title = file === 'agent' ? 'andes_hello/agent.py' : file === 'env' ? 'andes_hello/.env' : 'andes_hello/__init__.py'
  return (
    <Lab title="Los tres archivos de un agente ADK" hint="Cambia de archivo">
      <div className="row" style={{ marginBottom: 10 }}>
        <Segmented
          options={[
            { value: 'agent', label: 'agent.py' },
            { value: 'env', label: '.env' },
            { value: 'init', label: '__init__.py' },
          ]}
          value={file}
          onChange={setFile}
        />
        <Pill tone="model" mono>
          root_agent
        </Pill>
        <span className="small muted">es el nombre que ADK busca para cargar el agente</span>
      </div>
      <Code key={file} code={code} lang={file === 'env' ? 'bash' : 'python'} title={title} highlight={file === 'agent' ? linesOf(code, 'root_agent = Agent(', 'tools=[') : []} />
      <p className="small muted" style={{ margin: '10px 0 0' }}>
        <code>__init__.py</code> importa <code>agent</code> para que <code>adk web</code>, <code>adk run</code> y <code>adk deploy</code> encuentren{' '}
        <code>andes_hello.agent.root_agent</code>. En la siguiente lección reemplazas este esqueleto por el agente de Andes Market.
      </p>
    </Lab>
  )
}

function AgentsCliLab() {
  const player = useTerminalPlayer(TERM_AGENTS_CLI)
  return (
    <Lab title="Alternativa: Agents CLI (preview)" hint="Pulsa ▶" badge="Opcional">
      <Terminal lines={TERM_AGENTS_CLI} upTo={player.upTo} typed={player.typed} player={player} title="bash" maxHeight={260} />
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Dos caminos para empezar">
        <p>
          ADK habla con Gemini de dos maneras: con una <strong>API key</strong> de la API de Gemini, o con un <strong>proyecto de Google Cloud</strong> y
          credenciales de aplicación (ADC). El código del agente es idéntico; cambia el <code>.env</code>. Como este tutorial termina en Agent Runtime
          y Gemini Enterprise, conviene preparar el proyecto desde ya.
        </p>
        <AuthLab />
      </Section>

      <Section n={2} title="En la consola: proyecto, APIs, permisos y bucket">
        <p>
          Cuatro cosas antes de escribir código. Son tareas de una vez por proyecto y casi siempre las hace alguien con rol de administrador. La
          simulación muestra exactamente qué pantalla y qué botón; el terminal de la sección siguiente hace lo mismo con <code>gcloud</code>.
        </p>
        <ConsoleLab />
        <Callout tone="warn" title="Roles para ti ≠ roles para el agente">
          <code>roles/aiplatform.user</code> es para tu usuario (desplegar, consultar). Al agente desplegado <strong>no</strong> le des ese rol: tendrá
          su propia identidad (Agent Identity) con permisos mínimos. Lo verás en la lección de seguridad.
        </Callout>
      </Section>

      <Section n={3} title="En el terminal: gcloud, ADK y tu primer esqueleto">
        <p>
          Con el proyecto listo, todo lo demás es línea de comandos. Fíjate en el orden: autenticación, APIs, entorno Python ≥ 3.11, instalar ADK con
          los extras que usará el tutorial, <code>adk create</code> y <code>adk web</code>.
        </p>
        <TerminalLab />
        <SkeletonLab />
        <Callout tone="info" title="¿Y en Windows?">
          ADK funciona en Windows nativo (PowerShell: <code>.venv\Scripts\Activate.ps1</code>). Agents CLI, en cambio, solo soporta oficialmente macOS,
          Linux y WSL 2. Docker Desktop te servirá para el Postgres "externo" de la lección de datos.
        </Callout>
      </Section>

      <Section n={4} title="Agents CLI: el atajo con esteroides (opcional)">
        <p>
          Google publicó en 2026 <strong>Agents CLI</strong>: un comando que encadena scaffold → playground → eval → deploy → publish y además instala
          "skills" para asistentes de código como Claude Code o Gemini CLI. Está en preview y no reemplaza a la CLI de ADK; en este tutorial usamos
          los comandos de ADK para que entiendas cada pieza, pero vale la pena conocerlo.
        </p>
        <AgentsCliLab />
      </Section>

      <KeyIdeas
        items={[
          <>
            Dos backends, mismo código: <code>GOOGLE_API_KEY</code> para probar; <code>GOOGLE_GENAI_USE_VERTEXAI=TRUE</code> + proyecto + región para todo lo
            administrado.
          </>,
          <>
            Por proyecto, una vez: APIs <code>aiplatform</code> y <code>cloudresourcemanager</code>, roles <code>aiplatform.user</code> y{' '}
            <code>storage.admin</code> para tu usuario, y un bucket de staging.
          </>,
          <>
            <code>pip install google-adk</code> (Python ≥ 3.11) → <code>adk create</code> → <code>adk web</code> desde la carpeta padre. ADK busca{' '}
            <code>&lt;carpeta&gt;.agent.root_agent</code>.
          </>,
          <>Agents CLI automatiza el ciclo completo, pero primero aprende qué hace cada comando.</>,
        ]}
      />
      <Sources
        items={[
          { label: 'ADK · Quickstart Python (instalación, adk create, adk web)', href: 'https://adk.dev/get-started/python/' },
          { label: 'Agent Runtime · desplegar un agente ADK (APIs y autenticación)', href: 'https://adk.dev/deploy/agent-runtime/deploy/' },
          { label: 'Agent Runtime · quickstart con ADK (roles y SDK)', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime/quickstart-adk' },
          { label: 'google-adk en PyPI (versión y Python requerido)', href: 'https://pypi.org/project/google-adk/' },
          { label: 'Agents CLI · getting started', href: 'https://google.github.io/agents-cli/guide/getting-started/' },
        ]}
      />
    </>
  )
}
