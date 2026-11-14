import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Lab, Toggle } from '../../components/ui'
import { Code, Json } from '../../components/Code'

/* Editor de firma: cómo cambia la FunctionDeclaration que ADK genera
   según cómo escribas la función Python. Reglas (adk.dev/tools-custom/function-tools):
   - esquema desde nombre + docstring + type hints + defaults
   - requerido = tiene type hint y no tiene default; Optional[...] sin default sigue siendo requerido
   - tool_context: ToolContext se detecta por tipo y se oculta al modelo
   - el docstring es la descripción que lee el modelo */

export function SignatureLab() {
  const [docstring, setDocstring] = useState(true)
  const [defaultReason, setDefaultReason] = useState(false)
  const [optionalOnly, setOptionalOnly] = useState(false)
  const [toolContext, setToolContext] = useState(true)
  const [pydantic, setPydantic] = useState(false)

  const code = useMemo(() => {
    const reasonParam = optionalOnly ? 'reason: Optional[str]' : defaultReason ? 'reason: str = "sin motivo"' : 'reason: str'
    const lines: string[] = []
    if (optionalOnly) lines.push('from typing import Optional')
    if (pydantic) lines.push('from pydantic import BaseModel')
    lines.push('from google.adk.tools import ToolContext', '')
    if (pydantic)
      lines.push('class RefundItem(BaseModel):', '    sku: str', '    qty: int', '')
    lines.push(
      `def request_refund(order_id: str, amount_clp: int, ${reasonParam}${pydantic ? ', items: list[RefundItem]' : ''}${toolContext ? ', tool_context: ToolContext' : ''}) -> dict:`,
    )
    if (docstring)
      lines.push(
        '    """Inicia un reembolso para un pedido.',
        '',
        '    Montos hasta $50.000 se aprueban automáticamente. Sobre ese monto,',
        '    un supervisor confirma antes de ejecutar.',
        '',
        '    Args:',
        '        order_id: Número del pedido.',
        '        amount_clp: Monto en pesos chilenos (entero).',
        '        reason: Motivo breve indicado por el cliente.',
        '    """',
      )
    if (toolContext) lines.push('    tool_context.state["temp:last_refund_id"] = "rf_…"')
    lines.push('    return {"status": "success", "refund_id": "rf_…"}')
    return lines.join('\n')
  }, [docstring, defaultReason, optionalOnly, toolContext, pydantic])

  const decl = useMemo(() => {
    const properties: Record<string, unknown> = {
      order_id: { type: 'STRING', description: docstring ? 'Número del pedido.' : undefined },
      amount_clp: { type: 'INTEGER', description: docstring ? 'Monto en pesos chilenos (entero).' : undefined },
      reason: { type: 'STRING', description: docstring ? 'Motivo breve indicado por el cliente.' : undefined, nullable: optionalOnly ? true : undefined },
    }
    if (pydantic)
      properties.items = {
        type: 'ARRAY',
        items: { type: 'OBJECT', properties: { sku: { type: 'STRING' }, qty: { type: 'INTEGER' } }, required: ['sku', 'qty'] },
      }
    const required = ['order_id', 'amount_clp', ...(defaultReason ? [] : ['reason']), ...(pydantic ? ['items'] : [])]
    const clean = JSON.parse(JSON.stringify(properties)) as Record<string, unknown>
    return {
      name: 'request_refund',
      description: docstring ? 'Inicia un reembolso para un pedido.\n\nMontos hasta $50.000 se aprueban automáticamente. Sobre ese monto, un supervisor confirma antes de ejecutar.' : '',
      parameters: { type: 'OBJECT', properties: clean, required },
    }
  }, [docstring, defaultReason, optionalOnly, pydantic])

  const rules = [
    { ok: docstring, text: docstring ? 'El docstring se convirtió en description: el modelo sabe cuándo usarla.' : 'Sin docstring la description queda vacía: Gemini tendrá que adivinar para qué sirve.' },
    {
      ok: !optionalOnly,
      text: optionalOnly
        ? 'Optional[str] SIN default sigue siendo requerido (nullable, pero en required). Para hacerlo opcional necesita "= None".'
        : defaultReason
          ? '"reason" tiene default: salió de required. El modelo puede omitirlo.'
          : 'Todos los parámetros con type hint y sin default son requeridos.',
    },
    { ok: true, text: toolContext ? 'tool_context: ToolContext se detectó por tipo y NO aparece en el esquema.' : 'Sin ToolContext la función no puede leer ni escribir el estado de la sesión.' },
    { ok: true, text: pydantic ? 'El BaseModel se anidó como OBJECT dentro de ARRAY; ADK convertirá la entrada del modelo en instancias RefundItem.' : 'Tipos simples (str, int) se mapean a STRING e INTEGER.' },
  ]

  return (
    <Lab title="Editor de firma: de la función Python a la FunctionDeclaration" hint="Activa y desactiva opciones">
      <div className="herr-toggles">
        <Toggle label="docstring" checked={docstring} onChange={setDocstring} />
        <Toggle
          label='default en reason ("sin motivo")'
          checked={defaultReason}
          onChange={(v) => {
            setDefaultReason(v)
            if (v) setOptionalOnly(false)
          }}
        />
        <Toggle
          label="Optional[str] sin default"
          checked={optionalOnly}
          onChange={(v) => {
            setOptionalOnly(v)
            if (v) setDefaultReason(false)
          }}
        />
        <Toggle label="tool_context: ToolContext" checked={toolContext} onChange={setToolContext} />
        <Toggle label="parámetro Pydantic (items)" checked={pydantic} onChange={setPydantic} />
      </div>
      <div className="herr-sig">
        <Code code={code} lang="python" title="lo que escribes" maxHeight={420} />
        <div className="stack">
          <Json value={decl} title="lo que ADK envía a Gemini (FunctionDeclaration)" maxHeight={300} />
          <div>
            {rules.map((r, i) => (
              <div key={i} className={`herr-rule ${r.ok ? 'is-ok' : 'is-warn'}`}>
                {r.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Lab>
  )
}
