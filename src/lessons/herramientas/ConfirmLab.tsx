import { useEffect, useMemo, useState } from 'react'
import { ShieldAlert, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Callout, Lab, Pill } from '../../components/ui'
import { Code } from '../../components/Code'
import { ChatBubbles, EventList } from '../../components/Events'
import { Narration, PlayerBar, type StepInfo } from '../../components/Player'
import { usePlayer } from '../../lib/hooks'
import type { AdkEvent } from '../../sim/scenario'
import { CONFIRM_APPROVED_EVENTS, CONFIRM_BASE_EVENTS, CONFIRM_CLIENT_CODE, CONFIRM_REJECTED_EVENTS, REFUND_CALL_ID } from './data'

type Decision = 'approved' | 'rejected' | null

const BASE_STEPS: StepInfo[] = [
  { title: 'El cliente pide un reembolso de $65.000', body: 'Camila escribe en el chat. Es más que el umbral de $50.000 de la política de Andes Market.' },
  { title: 'Gemini emite el function_call', body: 'El modelo decide llamar a request_refund con order_id, amount_clp y reason. Hasta aquí es un tool call normal.' },
  {
    title: 'ADK evalúa needs_approval(...) → True y PAUSA',
    body: 'Antes de ejecutar la función, ADK llama a needs_approval con los mismos argumentos. Como amount_clp > 50000, no ejecuta request_refund: emite un function_call especial llamado adk_request_confirmation con el hint y detiene la invocación. El agente queda esperando.',
  },
  {
    title: 'Un humano decide',
    body: 'Tu aplicación (adk web, tu frontend, un bot de chat) muestra el hint al supervisor. Nada corre hasta que responda. Aprueba o rechaza con los botones.',
  },
]
const APPROVED_STEPS: StepInfo[] = [
  {
    title: 'El cliente responde con function_response adk_request_confirmation',
    body: 'La respuesta lleva el MISMO id que el function_call de confirmación, confirmed: true y un payload libre (quién aprobó). Así se reanuda la invocación.',
  },
  { title: 'Ahora sí: request_refund se ejecuta', body: 'ADK ejecuta la función original con sus argumentos. Devuelve status success y el refund_id; además escribe temp:last_refund_id en el estado.' },
  { title: 'Gemini confirma al cliente', body: 'Con el function_response en el contexto, el modelo redacta la respuesta final.' },
]
const REJECTED_STEPS: StepInfo[] = [
  { title: 'El cliente responde confirmed: false', body: 'El supervisor rechaza y deja una nota en el payload. El id sigue siendo el del function_call de confirmación.' },
  { title: 'request_refund NO se ejecuta', body: 'ADK no llama a la función: inyecta un function_response de error indicando que no fue confirmada. El modelo lo lee como cualquier otro error de herramienta.' },
  { title: 'Gemini explica y propone otra cosa', body: 'El modelo no inventa un reembolso: cuenta que no fue aprobado y ofrece la alternativa (cancelar el pedido en preparación).' },
]

export function ConfirmLab() {
  const [decision, setDecision] = useState<Decision>(null)
  const steps = useMemo(() => [...BASE_STEPS, ...(decision === 'approved' ? APPROVED_STEPS : decision === 'rejected' ? REJECTED_STEPS : [])], [decision])
  const player = usePlayer(steps.length, { interval: 3600 })
  const events: AdkEvent[] = useMemo(
    () => [...CONFIRM_BASE_EVENTS, ...(decision === 'approved' ? CONFIRM_APPROVED_EVENTS : decision === 'rejected' ? CONFIRM_REJECTED_EVENTS : [])],
    [decision],
  )
  const step = player.step
  // eventos visibles por paso: 0→1, 1→2, 2→3, 3→3 (pausa), 4→4, 5→5, 6→6
  const upTo = step <= 2 ? step + 1 : step === 3 ? 3 : step
  const waiting = step === 3 && decision === null
  const chat = [
    { role: 'user' as const, text: 'Reembolsa $65.000 del pedido 5102, la mochila llegó dañada.' },
    ...(step >= 2 && step < 6 ? [{ role: 'agent' as const, name: 'Andi', text: '⏸ Esperando aprobación de un supervisor…' }] : []),
    ...(step >= 6 && decision ? [{ role: 'agent' as const, name: 'Andi', text: (decision === 'approved' ? CONFIRM_APPROVED_EVENTS : CONFIRM_REJECTED_EVENTS)[2].content.parts.map((p) => ('text' in p ? p.text : '')).join('') }] : []),
  ]

  useEffect(() => {
    if (step === 3 && decision === null) player.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, decision])

  const decide = (d: Decision) => {
    setDecision(d)
    setTimeout(() => {
      player.goTo(4)
      player.play()
    }, 0)
  }
  const reset = () => {
    setDecision(null)
    player.reset()
  }

  return (
    <Lab title="Confirmación humana: reembolso de $65.000" hint="Reproduce; en el paso 4 decide tú" footer={<span className="small muted">Los nombres de los eventos (adk_request_confirmation, confirmed, payload) son los reales; el contenido exacto de los args puede variar según la versión de ADK: míralo en la pestaña Events de adk web.</span>}>
      <div className="row" style={{ gap: 10 }}>
        <PlayerBar player={player} labels={steps.map((s) => s.title)} />
        {decision && (
          <button className="btn btn-sm btn-ghost" onClick={reset}>
            Reiniciar con otra decisión
          </button>
        )}
      </div>
      <div className="herr-confirm-grid">
        <div className="stack">
          <Narration steps={steps} step={step} />
          {waiting && (
            <div className="herr-approval">
              <div className="t">
                <ShieldAlert size={16} /> Aprobación requerida
              </div>
              <div className="h">Un supervisor debe aprobar este reembolso (sobre $50.000).</div>
              <div className="meta">
                request_refund(order_id="5102", amount_clp=65000, reason="producto dañado") · id {REFUND_CALL_ID}
              </div>
              <div className="row">
                <button className="btn btn-primary" onClick={() => decide('approved')}>
                  <ThumbsUp size={14} /> Aprobar
                </button>
                <button className="btn" onClick={() => decide('rejected')}>
                  <ThumbsDown size={14} /> Rechazar
                </button>
              </div>
            </div>
          )}
          {decision && step >= 4 && (
            <div className="herr-decided" data-tone={decision === 'approved' ? 'ok' : 'error'}>
              Decisión: <strong>{decision === 'approved' ? 'aprobado' : 'rechazado'}</strong> por el supervisor.
            </div>
          )}
          {step >= 4 && decision && <Code code={CONFIRM_CLIENT_CODE.replace('"confirmed": true', `"confirmed": ${decision === 'approved'}`)} lang="json" title="Lo que envía tu cliente (REST /run_sse)" lineNumbers={false} maxHeight={240} />}
        </div>
        <div className="stack">
          <ChatBubbles items={chat} typing={step === 1 || step === 5} />
          <div className="row" style={{ gap: 6 }}>
            <Pill tone="tool" mono>
              events
            </Pill>
            <span className="small muted">lo que ve adk web / tu runner</span>
          </div>
          <EventList events={events} upTo={upTo} highlight={upTo - 1} showTiming maxHeight={420} />
        </div>
      </div>
      {decision === 'approved' && step >= 5 && (
        <Callout tone="ok" title="Lo que NO pasó">
          La función no se ejecutó dos veces ni antes de tiempo. Entre el paso 3 y el 5 pasaron 41 segundos "reales" y el agente simplemente esperó: el estado quedó en la sesión, no en memoria del proceso.
        </Callout>
      )}
    </Lab>
  )
}
