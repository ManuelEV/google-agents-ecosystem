// Widget de chat mínimo para el portal (vanilla JS). Habla SOLO con tu backend (/chat);
// nunca con Google directamente: el backend pone el user_id y las credenciales.
const BACKEND = 'https://soporte.andesmarket.cl/api'
let sessionId = null // lo devuelve el backend en el primer turno; se reenvía para conservar el historial

export async function sendMessage(text, { portalToken, onText, onTool, onDone }) {
  const res = await fetch(`${BACKEND}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${portalToken}` },
    body: JSON.stringify({ message: text, session_id: sessionId }),
  })
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let i
    while ((i = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, i)
      buffer = buffer.slice(i + 2)
      const event = /^event: (.+)$/m.exec(frame)?.[1] ?? 'message'
      const data = /^data: (.+)$/m.exec(frame)?.[1] ?? ''
      if (event === 'session') sessionId = data
      else if (event === 'tool') onTool?.(JSON.parse(data).name)
      else if (event === 'done') onDone?.()
      else onText?.(JSON.parse(data).text)
    }
  }
}
