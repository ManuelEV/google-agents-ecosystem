import { blank, cmd, comment, dim, ok, out, warn, type TermLine } from '../../components/Terminal'
import type { AdkEvent } from '../../sim/scenario'

/* ------------------------------------------------------------------------ */
/* Fuentes y herramientas (coinciden con examples/andes_data/toolbox/tools.yaml) */
/* ------------------------------------------------------------------------ */

export type SourceType = 'cloud-sql-postgres' | 'postgres' | 'bigquery'

export const SOURCES: Record<SourceType, { name: string; where: 'google' | 'outside'; label: string; yaml: string; note: string }> = {
  'cloud-sql-postgres': {
    name: 'orders-db',
    where: 'google',
    label: 'Cloud SQL para PostgreSQL · pedidos',
    yaml: `kind: source
name: orders-db
type: cloud-sql-postgres          # dentro de Google: Cloud SQL (conexión por IAM, sin exponer IP)
project: \${GOOGLE_CLOUD_PROJECT}
region: \${GOOGLE_CLOUD_LOCATION:us-central1}
instance: \${CLOUDSQL_INSTANCE:andes-orders}
database: \${ORDERS_DB_NAME:orders}
user: \${ORDERS_DB_USER}
password: \${ORDERS_DB_PASSWORD}`,
    note: 'Toolbox se conecta a la instancia por proyecto/región/instancia (como el Cloud SQL Auth Proxy). Con IAM puedes prescindir de la contraseña.',
  },
  postgres: {
    name: 'erp-db',
    where: 'outside',
    label: 'PostgreSQL genérico · ERP on-prem',
    yaml: `kind: source
name: erp-db
type: postgres                    # fuera de Google: Postgres del ERP (on-prem / otra nube) vía VPN o IP privada
host: \${ERP_DB_HOST}
port: \${ERP_DB_PORT:5432}
database: \${ERP_DB_NAME:erp}
user: \${ERP_DB_USER}
password: \${ERP_DB_PASSWORD}`,
    note: 'Cualquier Postgres alcanzable por red: on-prem, otra nube, Docker en tu laptop. Toolbox es el único componente que conoce esa credencial.',
  },
  bigquery: {
    name: 'analytics',
    where: 'google',
    label: 'BigQuery · ventas',
    yaml: `kind: source
name: analytics
type: bigquery                    # dentro de Google: BigQuery (usa ADC / identidad del workload)
project: \${GOOGLE_CLOUD_PROJECT}`,
    note: 'Sin usuario ni contraseña: BigQuery usa las credenciales por defecto (ADC) del proceso que corre Toolbox.',
  },
}

export type ToolDef = { name: string; source: SourceType; type: 'postgres-sql' | 'bigquery-sql'; description: string; yaml: string }

export const TOOLS_YAML: ToolDef[] = [
  {
    name: 'get_order',
    source: 'cloud-sql-postgres',
    type: 'postgres-sql',
    description: 'Devuelve un pedido con sus ítems, estado, transportista y seguimiento.',
    yaml: `kind: tool
name: get_order
type: postgres-sql
source: orders-db
description: Devuelve un pedido de Andes Market con sus ítems, estado, transportista y seguimiento.
parameters:
  - name: order_id
    type: string
    description: Número del pedido, por ejemplo "4821".
statement: |
  SELECT o.order_id, o.state, o.total_clp, o.carrier, o.tracking, o.eta, o.created,
         json_agg(json_build_object('sku', i.sku, 'name', i.name, 'qty', i.qty, 'price_clp', i.price_clp)) AS items
  FROM orders o JOIN order_items i ON i.order_id = o.order_id
  WHERE o.order_id = $1
  GROUP BY o.order_id;`,
  },
  {
    name: 'search_orders_by_customer',
    source: 'cloud-sql-postgres',
    type: 'postgres-sql',
    description: 'Lista los pedidos recientes de un cliente a partir de su email.',
    yaml: `kind: tool
name: search_orders_by_customer
type: postgres-sql
source: orders-db
description: Lista los pedidos recientes de un cliente a partir de su email.
parameters:
  - name: email
    type: string
    description: Email del cliente.
statement: |
  SELECT o.order_id, o.state, o.total_clp, o.created
  FROM orders o JOIN customers c ON c.customer_id = o.customer_id
  WHERE c.email = $1
  ORDER BY o.created DESC LIMIT 20;`,
  },
  {
    name: 'get_stock',
    source: 'postgres',
    type: 'postgres-sql',
    description: 'Stock de un SKU en cada bodega del ERP, con fecha de reposición.',
    yaml: `kind: tool
name: get_stock
type: postgres-sql
source: erp-db
description: Stock disponible de un SKU en cada bodega del ERP, con fecha de reposición si está agotado.
parameters:
  - name: sku
    type: string
    description: Código SKU, por ejemplo "ZAP-TRK-41".
statement: SELECT sku, name, warehouse, stock, restock_date FROM inventory WHERE sku = $1;`,
  },
  {
    name: 'daily_sales',
    source: 'bigquery',
    type: 'bigquery-sql',
    description: 'Ventas totales por día (CLP) de los últimos N días.',
    yaml: `kind: tool
name: daily_sales
type: bigquery-sql
source: analytics
description: Ventas totales por día (CLP) de los últimos N días. Solo para el equipo interno.
parameters:
  - name: days
    type: integer
    description: Cantidad de días hacia atrás (1-90).
statement: |
  SELECT DATE(created) AS day, SUM(total_clp) AS sales_clp, COUNT(*) AS orders
  FROM \`\${BQ_DATASET:andes_analytics}.orders\`
  WHERE created >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
  GROUP BY day ORDER BY day DESC;`,
  },
]

export const TOOLSETS: { name: string; tools: string[]; agent: string; why: string }[] = [
  { name: 'andes_ops', tools: ['get_order', 'search_orders_by_customer', 'get_stock', 'daily_sales'], agent: 'Andi (equipo interno)', why: 'Operaciones ve todo, incluidas las ventas agregadas.' },
  { name: 'andes_support_readonly', tools: ['get_order', 'get_stock'], agent: 'Agente de soporte al cliente', why: 'Un cliente no debe poder listar pedidos de otros ni ver ventas: ni siquiera existe la herramienta para él.' },
]

export const TOOLSET_YAML = `kind: toolset
name: andes_ops
tools:
  - get_order
  - search_orders_by_customer
  - get_stock
  - daily_sales
---
kind: toolset
name: andes_support_readonly
tools:
  - get_order
  - get_stock`

export const ADK_CODE = `from google.adk.tools.toolbox_toolset import ToolboxToolset

db_tools = ToolboxToolset(
    server_url=os.environ.get("TOOLBOX_URL", "http://127.0.0.1:5000"),
    # En producción (Cloud Run / Agent Runtime) autentica contra Toolbox con la identidad del workload:
    #   from toolbox_core import CredentialStrategy
    #   credentials=CredentialStrategy.workload_identity(target_audience=TOOLBOX_URL)
    toolset_name="andes_ops",
)

root_agent = Agent(
    name="andes_ops",
    model="gemini-3.8-flash",
    instruction=INSTRUCTION,
    tools=[db_tools, carrier_tools, refund_tool],
)
`

/* ------------------------------------------------------------------------ */
/* Lab paso a paso: ¿Hay stock de MOCH-30L-AZ?                              */
/* ------------------------------------------------------------------------ */

export const STOCK_EVENTS: AdkEvent[] = [
  { id: 's1', author: 'user', content: { role: 'user', parts: [{ text: '¿Hay stock de la mochila MOCH-30L-AZ?' }] }, t: 0 },
  { id: 's2', author: 'andes_ops', content: { role: 'model', parts: [{ function_call: { name: 'get_stock', args: { sku: 'MOCH-30L-AZ' } } }] }, t: 760, usage: { prompt: 1480, candidates: 16 } },
  {
    id: 's3',
    author: 'andes_ops',
    content: {
      role: 'user',
      parts: [{ function_response: { name: 'get_stock', response: { result: [{ sku: 'MOCH-30L-AZ', name: 'Mochila 30L azul', warehouse: 'Santiago', stock: 0, restock_date: '2026-11-18' }] } } }],
    },
    t: 842,
  },
  {
    id: 's4',
    author: 'andes_ops',
    content: { role: 'model', parts: [{ text: 'La Mochila 30L azul (MOCH-30L-AZ) está agotada en la bodega de Santiago. La reposición está prevista para el 18 de noviembre.' }] },
    t: 1690,
    usage: { prompt: 1560, candidates: 44 },
  },
]

export type StockStep = { title: string; body: string; flows: string[]; active: string[]; upTo: number; sqlHl?: string[] }

export const STOCK_STEPS: StockStep[] = [
  {
    title: 'Pregunta de un operador',
    body: '"¿Hay stock de la mochila MOCH-30L-AZ?" El dato vive en el ERP, un Postgres fuera de Google Cloud. El agente no sabe eso ni necesita saberlo.',
    flows: ['user>agent'],
    active: ['user', 'agent'],
    upTo: 1,
  },
  {
    title: 'Al arrancar, ADK pidió las herramientas a Toolbox',
    body: 'ToolboxToolset(toolset_name="andes_ops") le pidió a Toolbox (por MCP) la lista del toolset: get_order, search_orders_by_customer, get_stock y daily_sales. Cada una llega con nombre, descripción y parámetros, igual que una FunctionDeclaration.',
    flows: ['agent>toolbox', 'toolbox>agent'],
    active: ['agent', 'toolbox'],
    upTo: 1,
  },
  {
    title: 'Gemini elige get_stock y solo elige el parámetro',
    body: 'El modelo responde con function_call get_stock(sku="MOCH-30L-AZ"). Fíjate en lo que NO hizo: no escribió SQL, no sabe el nombre de la tabla ni el host de la base.',
    flows: ['agent>gemini', 'gemini>agent'],
    active: ['agent', 'gemini'],
    upTo: 2,
  },
  {
    title: 'ADK → Toolbox: tools/call',
    body: 'ADK traduce el function_call a una llamada MCP tools/call con {"sku": "MOCH-30L-AZ"}. Toolbox valida el tipo del parámetro contra el YAML (string) antes de tocar la base.',
    flows: ['agent>toolbox'],
    active: ['toolbox'],
    upTo: 2,
  },
  {
    title: 'Toolbox ejecuta el SQL parametrizado en el ERP',
    body: 'El statement es fijo; el valor viaja como $1 (bind parameter), nunca concatenado. Un SKU malicioso como "x\'; DROP TABLE inventory; --" se busca literalmente y no encuentra nada. La conexión al ERP la hace Toolbox con su pool y sus credenciales (${ERP_DB_PASSWORD}), que el agente jamás ve.',
    flows: ['toolbox>erp'],
    active: ['toolbox', 'erp'],
    upTo: 2,
    sqlHl: ['WHERE sku = $1'],
  },
  {
    title: 'Vuelve una fila: stock 0, reposición el 18',
    body: 'Postgres devuelve la fila de inventory; Toolbox la serializa como JSON y la entrega como resultado MCP. ADK la envuelve en un function_response (bajo "result", porque no es un dict con status: lo produjo Toolbox, no tu función).',
    flows: ['erp>toolbox', 'toolbox>agent'],
    active: ['agent'],
    upTo: 3,
  },
  {
    title: 'Gemini responde con el dato real',
    body: 'Con el function_response en el contexto, el modelo redacta la respuesta: agotado en Santiago, reposición el 18 de noviembre. Si mañana cambias la consulta (por ejemplo, sumar stock en tránsito), editas el YAML y reinicias Toolbox: el agente no se redespliega.',
    flows: ['agent>gemini', 'gemini>agent', 'agent>user'],
    active: ['agent', 'user'],
    upTo: 4,
  },
]

export const STOCK_SQL = `-- get_stock · statement fijo en tools.yaml
SELECT sku, name, warehouse, stock, restock_date
FROM inventory
WHERE sku = $1;   -- $1 ← "MOCH-30L-AZ" (bind parameter)

-- resultado (erp-db, Postgres on-prem):
--   sku=MOCH-30L-AZ  name=Mochila 30L azul
--   warehouse=Santiago  stock=0  restock_date=2026-11-18`

/* ------------------------------------------------------------------------ */
/* Terminal local                                                            */
/* ------------------------------------------------------------------------ */

export const TERM_LOCAL: TermLine[] = [
  comment('Desde examples/: dos Postgres (pedidos y ERP) + Toolbox en Docker'),
  cmd('docker compose -f andes_data/docker/compose.yaml up -d'),
  dim('[+] Running 3/3'),
  ok(' ✔ Container docker-orders-db-1  Started'),
  ok(' ✔ Container docker-erp-db-1     Started'),
  ok(' ✔ Container docker-toolbox-1    Started', 300),
  cmd('docker compose -f andes_data/docker/compose.yaml logs toolbox --tail 4'),
  out('toolbox  | INFO "Initialized 2 sources."'),
  out('toolbox  | INFO "Initialized 4 tools."'),
  out('toolbox  | INFO "Initialized 1 toolsets."'),
  ok('toolbox  | INFO "Server ready to serve!"', 300),
  blank(),
  comment('Alternativa sin Docker para Toolbox: el binario leyendo el YAML local'),
  cmd('toolbox --config andes_data/toolbox/tools.local.yaml --port 5000'),
  ok('INFO "Server ready to serve!"'),
  blank(),
  comment('El servidor MCP del transportista y la UI de desarrollo'),
  cmd('python -m andes_data.carrier_mcp.server &'),
  out('INFO:     Uvicorn running on http://127.0.0.1:8081'),
  cmd('adk web --port 8000'),
  ok('INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)'),
  warn('Pregunta en la UI: "¿Hay stock de MOCH-30L-AZ?" y mira la pestaña Events.'),
]

export const TERM_EDIT: TermLine[] = [
  comment('Cambiar una consulta en producción sin tocar el agente'),
  cmd('vim andes_data/toolbox/tools.yaml      # get_stock: sumar stock en tránsito'),
  cmd('toolbox --config andes_data/toolbox/tools.yaml'),
  ok('INFO "Initialized 4 tools."  INFO "Server ready to serve!"'),
  dim('El agente desplegado en Agent Runtime pide las herramientas a Toolbox: ve la nueva consulta en el siguiente turno. Cero redeploy.'),
]
