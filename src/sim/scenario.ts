/* Escenario compartido: Andes Market, retail online chileno ficticio, y su
   agente de operaciones "Andi" construido con ADK en Google Cloud.

   Todo lo que hay aquí es inventado, pero los FORMATOS son reales:
   - declaraciones de función como las genera ADK para Gemini (FunctionDeclaration),
   - eventos de ADK (author / content.parts / actions),
   - respuestas de herramientas como dict con "status". */

import { MODEL_ROOT, MODEL_WORKER } from './models'

export const COMPANY = 'Andes Market'
export const PROJECT_ID = 'andes-market-prod'
export const PROJECT_NUMBER = '734019283651'
export const LOCATION = 'us-central1'
export const AGENT_NAME = 'andes_ops'
export const AGENT_DISPLAY = 'Andi · Operaciones'
export const REASONING_ENGINE_ID = '4890128374650163200'
export const STAGING_BUCKET = `gs://${PROJECT_ID}-agents-staging`

export { MODEL_ROOT, MODEL_WORKER }

/* ----------------------------- Datos de negocio ---------------------------- */

export type Order = {
  id: string
  customer: string
  customer_id: string
  status: 'preparando' | 'en_ruta' | 'entregado' | 'devuelto'
  items: { sku: string; name: string; qty: number; price: number }[]
  total: number
  carrier?: string
  tracking?: string
  eta?: string
  created: string
}

export const CUSTOMER = { id: 'cus_7781', name: 'Camila Rojas', email: 'camila.rojas@example.cl', tier: 'plus', city: 'Valparaíso' }

export const ORDERS: Order[] = [
  {
    id: '4821',
    customer: 'Camila Rojas',
    customer_id: 'cus_7781',
    status: 'en_ruta',
    items: [{ sku: 'ZAP-TRK-41', name: 'Zapatillas trekking Cordillera 41', qty: 1, price: 69990 }],
    total: 69990,
    carrier: 'AndesExpress',
    tracking: 'AX-88213-CL',
    eta: '2026-11-14',
    created: '2026-11-10',
  },
  {
    id: '5102',
    customer: 'Camila Rojas',
    customer_id: 'cus_7781',
    status: 'preparando',
    items: [
      { sku: 'MOCH-30L-AZ', name: 'Mochila 30L azul', qty: 1, price: 39990 },
      { sku: 'BOT-TERM-1L', name: 'Botella térmica 1L', qty: 2, price: 12990 },
    ],
    total: 65970,
    created: '2026-11-12',
  },
  {
    id: '4790',
    customer: 'Camila Rojas',
    customer_id: 'cus_7781',
    status: 'entregado',
    items: [{ sku: 'POL-POLAR-M', name: 'Polar Patagonia M', qty: 1, price: 29990 }],
    total: 29990,
    carrier: 'AndesExpress',
    tracking: 'AX-87720-CL',
    created: '2026-10-28',
  },
]

/** Inventario que vive en el ERP (Postgres fuera de Google Cloud). */
export const INVENTORY = [
  { sku: 'ZAP-TRK-41', name: 'Zapatillas trekking Cordillera 41', stock: 3, warehouse: 'Santiago' },
  { sku: 'MOCH-30L-AZ', name: 'Mochila 30L azul', stock: 0, warehouse: 'Santiago', restock: '2026-11-18' },
  { sku: 'BOT-TERM-1L', name: 'Botella térmica 1L', stock: 42, warehouse: 'Santiago' },
  { sku: 'POL-POLAR-M', name: 'Polar Patagonia M', stock: 11, warehouse: 'Concepción' },
]

/** Política de devoluciones (pensada para el ejemplo de aprobación humana). */
export const REFUND_POLICY = { autoApproveMaxClp: 50000, windowDays: 30 }

export const orderById = (id: string) => ORDERS.find((o) => o.id === id)

/* ------------------------- Herramientas (función) ------------------------- */

/** Declaración de función tal como ADK la genera para Gemini a partir de la
    firma + docstring de Python (formato FunctionDeclaration de la API Gemini). */
export type FunctionDeclaration = {
  name: string
  description: string
  parameters: {
    type: 'OBJECT'
    properties: Record<string, { type: string; description?: string; enum?: string[] }>
    required?: string[]
  }
}

export const TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_order_status',
    description: 'Devuelve el estado, los ítems y el seguimiento de un pedido de Andes Market. Úsala cuando el usuario pregunte por un pedido concreto.',
    parameters: {
      type: 'OBJECT',
      properties: { order_id: { type: 'STRING', description: 'Número del pedido, p. ej. "4821".' } },
      required: ['order_id'],
    },
  },
  {
    name: 'track_shipment',
    description: 'Consulta la API del transportista (AndesExpress) con un código de seguimiento y devuelve la última ubicación y la fecha estimada de entrega.',
    parameters: {
      type: 'OBJECT',
      properties: { tracking: { type: 'STRING', description: 'Código de seguimiento, p. ej. "AX-88213-CL".' } },
      required: ['tracking'],
    },
  },
  {
    name: 'request_refund',
    description: 'Inicia un reembolso para un pedido. Montos sobre el umbral de la política requieren aprobación de un supervisor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        order_id: { type: 'STRING' },
        amount_clp: { type: 'INTEGER', description: 'Monto a reembolsar en pesos chilenos.' },
        reason: { type: 'STRING', description: 'Motivo breve indicado por el cliente.' },
      },
      required: ['order_id', 'amount_clp', 'reason'],
    },
  },
]

/* Herramientas que vienen de MCP Toolbox (definidas en tools.yaml, no en Python). */
export const TOOLBOX_TOOLS = [
  { name: 'search_orders_by_customer', source: 'orders-db (Cloud SQL)', description: 'Pedidos de un cliente por email.', params: ['email'] },
  { name: 'get_order', source: 'orders-db (Cloud SQL)', description: 'Un pedido con sus ítems.', params: ['order_id'] },
  { name: 'get_stock', source: 'erp-db (Postgres externo)', description: 'Stock de un SKU en todas las bodegas.', params: ['sku'] },
  { name: 'daily_sales', source: 'analytics (BigQuery)', description: 'Ventas por día de los últimos N días.', params: ['days'] },
]

/** Respuestas simuladas de las herramientas. */
export function runTool(name: string, args: Record<string, unknown>): Record<string, unknown> {
  switch (name) {
    case 'get_order_status': {
      const o = orderById(String(args.order_id ?? ''))
      if (!o) return { status: 'error', error_message: `No existe el pedido ${args.order_id}.` }
      return {
        status: 'success',
        order_id: o.id,
        state: o.status,
        items: o.items.map((i) => `${i.qty}× ${i.name}`),
        total_clp: o.total,
        carrier: o.carrier ?? null,
        tracking: o.tracking ?? null,
        eta: o.eta ?? null,
      }
    }
    case 'track_shipment': {
      if (args.tracking === 'AX-88213-CL')
        return { status: 'success', tracking: 'AX-88213-CL', last_event: 'En reparto · Valparaíso', eta: '2026-11-14', updated_at: '2026-11-13T09:40:00-03:00' }
      return { status: 'error', error_message: 'Código de seguimiento desconocido para AndesExpress.' }
    }
    case 'request_refund': {
      const amount = Number(args.amount_clp ?? 0)
      if (amount > REFUND_POLICY.autoApproveMaxClp) return { status: 'pending', message: 'Requiere aprobación de supervisor.', amount_clp: amount }
      return { status: 'success', refund_id: 'rf_20931', amount_clp: amount }
    }
    case 'get_stock': {
      const it = INVENTORY.find((i) => i.sku === args.sku)
      return it ? { status: 'success', ...it } : { status: 'error', error_message: 'SKU desconocido.' }
    }
    default:
      return { status: 'error', error_message: `Herramienta desconocida: ${name}` }
  }
}

/* ------------------------------ Instrucciones ------------------------------ */

export const ROOT_INSTRUCTION = `Eres Andi, el agente de operaciones de Andes Market (retail online en Chile).
Ayudas a clientes y al equipo interno con pedidos, envíos, devoluciones y stock.

Reglas:
- Usa las herramientas para cualquier dato de pedidos, envíos o inventario. Nunca inventes números de pedido ni fechas.
- Si una herramienta devuelve status "error", explica el problema con claridad y propone el siguiente paso.
- Responde en español neutro, breve y concreto. Formatea montos como $69.990.
- Para reembolsos sobre $50.000 pide aprobación antes de confirmar.`

/* ------------------------------- Eventos ADK ------------------------------- */

/** Parte de contenido Gemini (subconjunto). */
export type Part = { text: string } | { function_call: { name: string; args: Record<string, unknown> } } | { function_response: { name: string; response: Record<string, unknown> } }

/** Evento de ADK (campos que importan para visualizar). */
export type AdkEvent = {
  id: string
  author: string
  content: { role: 'user' | 'model'; parts: Part[] }
  actions?: { state_delta?: Record<string, unknown>; transfer_to_agent?: string; escalate?: boolean }
  partial?: boolean
  /** ms desde el inicio de la invocación (para trazas) */
  t?: number
  /** tokens de la llamada al modelo que produjo este evento */
  usage?: { prompt: number; candidates: number }
}

/** Una invocación completa de "¿Dónde está mi pedido 4821?" en el agente de una sola herramienta. */
export const FIRST_RUN_EVENTS: AdkEvent[] = [
  { id: 'e1', author: 'user', content: { role: 'user', parts: [{ text: '¿Dónde está mi pedido 4821?' }] }, t: 0 },
  {
    id: 'e2',
    author: AGENT_NAME,
    content: { role: 'model', parts: [{ function_call: { name: 'get_order_status', args: { order_id: '4821' } } }] },
    t: 820,
    usage: { prompt: 412, candidates: 18 },
  },
  {
    id: 'e3',
    author: AGENT_NAME,
    content: { role: 'user', parts: [{ function_response: { name: 'get_order_status', response: runTool('get_order_status', { order_id: '4821' }) } }] },
    t: 905,
  },
  {
    id: 'e4',
    author: AGENT_NAME,
    content: {
      role: 'model',
      parts: [
        {
          text: 'Tu pedido 4821 (Zapatillas trekking Cordillera 41, $69.990) va en ruta con AndesExpress, seguimiento AX-88213-CL. La entrega estimada es el 14 de noviembre.',
        },
      ],
    },
    actions: { state_delta: { last_order_id: '4821' } },
    t: 1760,
    usage: { prompt: 498, candidates: 61 },
  },
]

/** Sesión inicial (vacía) y estado tras la primera invocación. */
export const SESSION_EXAMPLE = {
  id: 'f1c9b1e2-7c0a-4a1f-9a0e-2f1b7d3e5c88',
  app_name: AGENT_NAME,
  user_id: CUSTOMER.id,
  state: { 'user:name': 'Camila', 'user:tier': 'plus', last_order_id: '4821' },
  last_update_time: 1794661200.0,
}
