import { blank, cmd, comment, dim, ok, out, warn, type TermLine } from '../../components/Terminal'
import { PROJECT_ID } from '../../sim/scenario'

export const TERM_SETUP: TermLine[] = [
  comment('1) Autenticación: tu usuario (CLI) y las credenciales por defecto (ADC) que usará el SDK'),
  cmd('gcloud auth login'),
  dim('Your browser has been opened to visit: https://accounts.google.com/o/oauth2/auth?...'),
  ok('You are now authenticated with the gcloud CLI!'),
  cmd('gcloud auth application-default login'),
  ok('Credentials saved to file: [~/.config/gcloud/application_default_credentials.json]'),
  cmd(`gcloud config set project ${PROJECT_ID}`),
  out(`Updated property [core/project].`),
  blank(),
  comment('2) Las dos APIs que exige Agent Runtime (y Model Armor, que usarás más adelante)'),
  cmd('gcloud services enable aiplatform.googleapis.com cloudresourcemanager.googleapis.com modelarmor.googleapis.com'),
  out('Operation "operations/acat.p2-734019283651-5b1c…" finished successfully.', 300),
  blank(),
  comment('3) Entorno Python ≥ 3.11 e instalación de ADK'),
  cmd('python --version'),
  out('Python 3.12.6'),
  cmd('python -m venv .venv && source .venv/bin/activate'),
  cmd('pip install "google-adk[gcp,toolbox,a2a,eval,mcp]"'),
  dim('Collecting google-adk[gcp,toolbox,a2a,eval,mcp]'),
  dim('  Downloading google_adk-2.14.1-py3-none-any.whl (3.1 MB)'),
  dim('Collecting google-genai>=1.5 … mcp>=1.10 … toolbox-core … a2a-sdk …'),
  ok('Successfully installed google-adk-2.14.1 google-genai-… mcp-… toolbox-core-… a2a-sdk-…', 300),
  cmd('adk --version'),
  out('2.14.1'),
  blank(),
  comment('4) Esqueleto del primer agente'),
  cmd('adk create andes_hello'),
  out('Choose a model for the root agent:'),
  out('1. gemini-flash-latest'),
  out('2. Other models (fill later)'),
  out('Choose model (1, 2): 1'),
  out('1. Google AI'),
  out('2. Vertex AI'),
  out('Choose a backend (1, 2): 2'),
  out('Enter Google Cloud project ID [andes-market-prod]:'),
  out('Enter Google Cloud region [us-central1]:'),
  ok('Agent created in /home/camila/andes/andes_hello:'),
  out('- .env'),
  out('- __init__.py'),
  out('- agent.py'),
  blank(),
  comment('5) Arrancar la UI de desarrollo desde la carpeta PADRE del agente'),
  cmd('adk web --port 8000'),
  out('INFO:     Started server process [48213]'),
  out('INFO:     Application startup complete.'),
  ok('INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)'),
  warn('adk web es para desarrollo: no lo uses en producción.'),
]

export const ENV_API_KEY = `# andes_hello/.env · opción A: API de Gemini (sin Google Cloud)
GOOGLE_API_KEY="AIza...tu-clave-de-aistudio"
`

export const ENV_VERTEX = `# andes_hello/.env · opción B: Gemini Enterprise Agent Platform (Vertex)
GOOGLE_GENAI_USE_VERTEXAI=TRUE
GOOGLE_CLOUD_PROJECT=${PROJECT_ID}
GOOGLE_CLOUD_LOCATION=us-central1
# las credenciales salen de: gcloud auth application-default login
`

export const AGENT_SKELETON = `from google.adk.agents.llm_agent import Agent


def get_current_time(city: str) -> dict:
    """Returns the current time in a specified city."""
    return {"status": "success", "city": city, "time": "10:30 AM"}


root_agent = Agent(
    model="gemini-flash-latest",
    name="root_agent",
    description="Tells the current time in a specified city.",
    instruction="You are a helpful assistant. Use the get_current_time tool.",
    tools=[get_current_time],
)
`

export const TERM_AGENTS_CLI: TermLine[] = [
  comment('Agents CLI (preview): scaffold → playground → eval → deploy → publish, más skills para tu asistente de código'),
  cmd('uvx google-agents-cli setup'),
  dim('Installing google-agents-cli …'),
  ok('Installed agents-cli 0.2.x and skills for: claude-code, gemini-cli'),
  cmd('agents-cli create andes-agent --prototype --yes'),
  ok('Created andes-agent/ (template adk_python)'),
  cmd('cd andes-agent && agents-cli install && agents-cli playground'),
  out('Playground running at http://127.0.0.1:8080/'),
  warn('Windows nativo no está soportado oficialmente: usa WSL 2.'),
]
