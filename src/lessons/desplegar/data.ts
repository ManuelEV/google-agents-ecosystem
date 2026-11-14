import { blank, cmd, comment, dim, ok, out, warn, type TermLine } from '../../components/Terminal'
import { LOCATION, PROJECT_ID, PROJECT_NUMBER, REASONING_ENGINE_ID, STAGING_BUCKET } from '../../sim/scenario'

export const RESOURCE_NAME = `projects/${PROJECT_NUMBER}/locations/${LOCATION}/reasoningEngines/${REASONING_ENGINE_ID}`

export const TERM_DEPLOY: TermLine[] = [
  comment('examples/andes_prod/deploy.sh · se ejecuta desde examples/ con el entorno activado'),
  cmd(`export GOOGLE_CLOUD_PROJECT=${PROJECT_ID} GOOGLE_CLOUD_LOCATION=${LOCATION}`),
  cmd('gcloud auth login && gcloud auth application-default login'),
  ok('You are now authenticated with the gcloud CLI!'),
  cmd('gcloud services enable aiplatform.googleapis.com cloudresourcemanager.googleapis.com modelarmor.googleapis.com'),
  out('Operation "operations/acat.p2-734019283651-…" finished successfully.', 200),
  cmd(`gcloud storage buckets create ${STAGING_BUCKET} --location=${LOCATION}`),
  ok(`Creating ${STAGING_BUCKET}/...`),
  blank(),
  comment('El .env viaja con el agente: backend Vertex + URLs de Toolbox y del MCP del transportista'),
  cmd('cat andes_prod/.env'),
  dim('GOOGLE_GENAI_USE_VERTEXAI=TRUE'),
  dim(`GOOGLE_CLOUD_PROJECT=${PROJECT_ID}`),
  dim(`GOOGLE_CLOUD_LOCATION=${LOCATION}`),
  dim('TOOLBOX_URL=https://toolbox-xxxxx-uc.a.run.app'),
  dim('CARRIER_MCP_URL=https://carrier-mcp-xxxxx-uc.a.run.app/mcp'),
  cmd('cat andes_prod/.agent_engine_config.json'),
  dim('{ "identity_type": "AGENT_IDENTITY" }'),
  blank(),
  comment('Desplegar: sube el código al bucket, construye el contenedor y crea el recurso'),
  cmd(
    `adk deploy agent_engine --project=$GOOGLE_CLOUD_PROJECT --region=$GOOGLE_CLOUD_LOCATION --staging_bucket=${STAGING_BUCKET} --display_name="Andi · Operaciones" --otel_to_cloud andes_prod`,
  ),
  out('Copying agent source code...'),
  out('Copying agent source code complete.'),
  out('Initializing Vertex AI...'),
  out(`Resolved requirements from andes_prod (google-adk[gcp,toolbox,a2a,eval,mcp]>=2.14,<3 …)`),
  dim('Reading .env file for environment variables...'),
  dim('Tracing: ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS=false (no se capturan prompts ni respuestas en los spans)'),
  out('Creating AgentEngine...', 600),
  dim('Create AgentEngine backing LRO: projects/734019283651/locations/us-central1/reasoningEngines/4890128374650163200/operations/5513…', 1800),
  ok(`AgentEngine created. Resource name: ${RESOURCE_NAME}`),
  ok('To use this AgentEngine in another session:'),
  out(`agent_engine = vertexai.agent_engines.get('${RESOURCE_NAME}')`),
  out('Cleaning up the temp folder: /tmp/agent_engine_deploy_src/…'),
  blank(),
  cmd('export AGENT_ENGINE_ID=4890128374650163200'),
  warn('Guarda el último segmento (RESOURCE_ID): lo usarás para consultar, para Sessions/Memory Bank y para registrar en Gemini Enterprise.'),
]

export const CODE_QUERY = `import asyncio, os
import vertexai

PROJECT = os.environ["GOOGLE_CLOUD_PROJECT"]
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
ENGINE_ID = os.environ["AGENT_ENGINE_ID"]
RESOURCE = f"projects/{PROJECT}/locations/{LOCATION}/reasoningEngines/{ENGINE_ID}"


async def main(message: str, user_id: str = "cus_7781") -> None:
    client = vertexai.Client(project=PROJECT, location=LOCATION)
    remote_agent = client.agent_engines.get(name=RESOURCE)

    # Sesión administrada (Sessions). Si omites session_id, Agent Runtime crea una.
    session = await remote_agent.async_create_session(user_id=user_id)
    session_id = session["id"]

    async for event in remote_agent.async_stream_query(
        user_id=user_id, session_id=session_id, message=message
    ):
        for part in event.get("content", {}).get("parts", []):
            if "function_call" in part:
                print("→ tool", part["function_call"]["name"], part["function_call"]["args"])
            elif "function_response" in part:
                print("←", part["function_response"]["name"], part["function_response"]["response"])
            elif "text" in part:
                print(f"[{event.get('author')}]", part["text"])


asyncio.run(main("¿Dónde está mi pedido 4821?"))
`

export const CODE_REST = `curl -sS -N \\
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \\
  -H "Content-Type: application/json" \\
  "https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/reasoningEngines/${REASONING_ENGINE_ID}:streamQuery?alt=sse" \\
  -d '{"class_method": "async_stream_query", "input": {"user_id": "cus_7781", "message": "¿Dónde está mi pedido 4821?"}}'
`

export const CODE_SDK_CREATE = `import vertexai
from vertexai import agent_engines, types
from andes_prod.agent import root_agent

client = vertexai.Client(project="${PROJECT_ID}", location="${LOCATION}")
app = agent_engines.AdkApp(agent=root_agent, enable_tracing=True)

# Prueba local (sesiones en memoria)
async for event in app.async_stream_query(user_id="cus_7781", message="¿Dónde está mi pedido 4821?"):
    print(event)

# Despliegue desde Python (equivale a adk deploy agent_engine)
remote_agent = client.agent_engines.create(
    agent=app,
    config={
        "requirements": ["google-cloud-aiplatform[agent_engines,adk]", "google-adk[gcp,toolbox,a2a,mcp]>=2.14,<3"],
        "staging_bucket": "${STAGING_BUCKET}",
        "display_name": "Andi · Operaciones",
        "identity_type": types.IdentityType.AGENT_IDENTITY,
    },
)
# SDK 2.0.1+: el mismo cliente se llama agentplatform.Client() y agent_engines pasa a runtimes
#   remote_agent = client.runtimes.create(agent=app, config={...})

remote_agent.delete(force=True)  # limpieza: borra también las sesiones administradas
`

export const CODE_CONFIG = `{
  "identity_type": "AGENT_IDENTITY"
}
`

export const DEPLOY_WAYS: { name: string; lang: string; when: string; bucket: string }[] = [
  { name: 'Archivos fuente locales (adk deploy / SDK)', lang: 'Python', when: 'El camino de este tutorial; también CI/CD y Terraform.', bucket: 'adk deploy sí; "source files" por SDK no' },
  { name: 'Developer Connect (repo Git vinculado)', lang: 'Python', when: 'Despliegue desde tu repositorio privado.', bucket: 'no' },
  { name: 'Repositorio Git público', lang: 'Python', when: 'Repos HTTPS públicos sin Developer Connect.', bucket: 'no' },
  { name: 'Dockerfile', lang: 'cualquiera', when: 'Controlar el servidor API; el contenedor sigue el contrato del runtime.', bucket: 'no' },
  { name: 'Imagen de contenedor (Artifact Registry)', lang: 'cualquiera', when: 'Build propio y menor latencia de despliegue.', bucket: 'no' },
  { name: 'SDK con objeto en memoria (AdkApp)', lang: 'Python', when: 'Desarrollo interactivo en Colab / notebooks.', bucket: 'sí' },
]
